import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';

/**
 * Docs retrieval for the "Ask AI" chat: semantic search via the gateway
 * `embedding` model (cross-lingual), with a keyword fallback. Corpus vectors are
 * embedded once and cached to disk (keyed by a corpus hash) so restarts are
 * instant; `warm()` is kicked off at server boot from instrumentation.ts so the
 * first user never waits on the cold embed.
 */
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://ai.loyalty.lt/v1').replace(/\/$/, '');
const EMBED_MODEL = process.env.AI_EMBED_MODEL || 'embedding';
const API_KEY = process.env.AI_API_KEY;
const TOP_K = 10;

const ai = API_KEY ? new OpenAI({ baseURL: AI_BASE_URL, apiKey: API_KEY }) : null;

const DOCS_DIR = join(process.cwd(), 'content/docs');
const CACHE_FILE = join(process.cwd(), '.embed-cache.json');
const STOPWORDS = new Set(
  'the a an is are was were be been being to of in on for with and or not this that it as at by from your you can'.split(' '),
);

export type Chunk = { url: string; title: string; text: string };

function mdxToChunks(raw: string, url: string): Chunk[] {
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
  const title = fm?.[1].match(/title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? url;
  let t = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
  t = t.replace(/^import .*$/gm, '').replace(/^export .*$/gm, '');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/```[\s\S]*?```/g, (b) => b.replace(/```\w*\n?/g, ' '));
  t = t.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
  return t
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    // keep short lines too: install commands (~28 chars) must survive
    .filter((p) => p.length > 12)
    .map((text) => ({ url, title, text: `${title}: ${text}` }));
}

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'meta.json') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (extname(name) === '.mdx' || extname(name) === '.md') out.push(full);
  }
  return out;
}

let CORPUS: Chunk[] | null = null;
function corpus(): Chunk[] {
  if (CORPUS) return CORPUS;
  const chunks: Chunk[] = [];
  for (const file of walk(DOCS_DIR)) {
    const rel = file.slice(DOCS_DIR.length + 1).replace(/\.mdx?$/, '').replace(/\/index$/, '');
    chunks.push(...mdxToChunks(readFileSync(file, 'utf8'), `/docs/${rel}`.replace(/\/$/, '')));
  }
  CORPUS = chunks;
  return chunks;
}

function tokenize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function keywordRetrieve(query: string): Chunk[] {
  const q = tokenize(query);
  if (!q.length) return corpus().slice(0, TOP_K);
  const scored = corpus()
    .map((c) => {
      const set = new Set(tokenize(c.text));
      let score = 0;
      for (const t of q) if (set.has(t)) score++;
      return { c, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.length ? scored.slice(0, TOP_K).map((r) => r.c) : corpus().slice(0, TOP_K);
}

let CORPUS_VECS: number[][] | null = null;
async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const res = await ai!.embeddings.create({ model: EMBED_MODEL, input: texts.slice(i, i + 100) });
    for (const d of res.data) out.push(d.embedding as unknown as number[]);
  }
  return out;
}

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const corpusHash = (items: Chunk[]) => createHash('sha1').update(items.map((c) => c.text).join('\n')).digest('hex');

let warmPromise: Promise<void> | null = null;
export function warm(): Promise<void> {
  if (!warmPromise) {
    warmPromise = (async () => {
      if (!ai) return;
      const items = corpus();
      const hash = corpusHash(items);
      try {
        const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
        if (cached.hash === hash && Array.isArray(cached.vecs)) { CORPUS_VECS = cached.vecs; return; }
      } catch { /* no/invalid cache */ }
      CORPUS_VECS = await embed(items.map((c) => c.text));
      try { writeFileSync(CACHE_FILE, JSON.stringify({ hash, vecs: CORPUS_VECS })); } catch { /* read-only fs */ }
    })().catch(() => { warmPromise = null; });
  }
  return warmPromise;
}

/**
 * Retrieve the top-K chunks for a query plus the best cosine similarity `score`
 * (0..1). The score drives the relevance gate in the chat route. When the
 * embedding model is unavailable we fall back to keyword scoring and report
 * `score: null` (the caller then skips the gate rather than wrongly refusing).
 */
export async function retrieveScored(query: string): Promise<{ chunks: Chunk[]; score: number | null }> {
  try {
    await warm();
    const items = corpus();
    if (!CORPUS_VECS) return { chunks: keywordRetrieve(query), score: null };
    const [qv] = await embed([query]);
    const ranked = CORPUS_VECS
      .map((v, i) => ({ i, s: cosine(qv, v) }))
      .sort((a, b) => b.s - a.s);
    return { chunks: ranked.slice(0, TOP_K).map((r) => items[r.i]), score: ranked[0]?.s ?? null };
  } catch {
    return { chunks: keywordRetrieve(query), score: null };
  }
}

export async function retrieve(query: string): Promise<Chunk[]> {
  return (await retrieveScored(query)).chunks;
}

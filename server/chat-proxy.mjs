#!/usr/bin/env node
/**
 * Chat proxy for the docs site's "Ask AI" page.
 *
 * The browser never talks to the LLM directly and never sees a credential —
 * that is the entire reason this exists as a separate process instead of the
 * `docusaurus-plugin-chat-page` npm package, which puts `new OpenAI({apiKey})`
 * with `dangerouslyAllowBrowser: true` in the client bundle. Here the key
 * stays in this process's environment; the browser only ever calls
 * POST /api/chat on this server, and this server calls ai.loyalty.lt.
 *
 * Retrieval is plain keyword scoring over the docs corpus, not embeddings —
 * ai.loyalty.lt's embedding model is one more moving part this does not need
 * to depend on being up. If retrieval quality is not good enough later, swap
 * `scoreChunk` for a call to the embedding model; nothing else here has to
 * change, since the rest of the pipeline just wants "top N relevant chunks".
 *
 * Run: LITELLM_API_KEY=sk-... node server/chat-proxy.mjs
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const PORT = Number(process.env.CHAT_PROXY_PORT || 3102);
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://ai.loyalty.lt';
const AI_MODEL = process.env.AI_MODEL || 'qwen3-30b-a3b';
const LITELLM_API_KEY = process.env.LITELLM_API_KEY;
const ALLOWED_ORIGINS = new Set(
  (process.env.CHAT_PROXY_ALLOWED_ORIGINS || 'https://docs.loyalty.lt,http://localhost:3000').split(',')
);
const DOCS_DIR = process.env.DOCS_DIR || join(import.meta.dirname, '..', 'docs');

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 8;
const TOP_K_CHUNKS = 5;

if (!LITELLM_API_KEY) {
  // Fail loudly at startup, not on the first request — a silently-broken chat
  // endpoint is worse than a process that refuses to come up.
  console.error('LITELLM_API_KEY is not set. Get a virtual key from the LiteLLM admin UI at ai.loyalty.lt.');
  process.exit(1);
}

/* -------------------------------------------------------------- corpus */

/**
 * Very small MDX -> plain text reducer: strips frontmatter, JSX/HTML tags,
 * import/export lines and Mintlify-compat component wrappers, keeps prose and
 * code fence contents. Good enough for keyword retrieval; not a real
 * renderer.
 */
function mdxToChunks(raw, url) {
  let text = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
  text = text.replace(/^import .*$/gm, '');
  text = text.replace(/^export .*$/gm, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ' '));
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 40);

  return paragraphs.map((text, i) => ({ url, text, chunkIndex: i }));
}

function walkMdx(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_') || name === 'api-explorer') continue; // generated/partial content, not worth indexing
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkMdx(full, out);
    } else if (extname(name) === '.mdx' || extname(name) === '.md') {
      out.push(full);
    }
  }
  return out;
}

function buildCorpus() {
  const files = walkMdx(DOCS_DIR);
  const chunks = [];
  for (const file of files) {
    const rel = file.slice(DOCS_DIR.length + 1).replace(/\.mdx?$/, '').replace(/\/index$/, '');
    const url = `/${rel}`;
    const raw = readFileSync(file, 'utf8');
    chunks.push(...mdxToChunks(raw, url));
  }
  console.log(`chat-proxy: indexed ${chunks.length} chunks from ${files.length} docs pages`);
  return chunks;
}

const CORPUS = buildCorpus();

const STOPWORDS = new Set(
  'the a an is are was were be been being to of in on for with and or not this that it as at by from your you can'.split(' ')
);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function scoreChunk(queryTokens, chunk) {
  const chunkTokens = tokenize(chunk.text);
  const chunkSet = new Set(chunkTokens);
  let score = 0;
  for (const t of queryTokens) if (chunkSet.has(t)) score += 1;
  return score;
}

function retrieve(query, topK = TOP_K_CHUNKS) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];
  return CORPUS.map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

/* ---------------------------------------------------------------- llm */

function buildSystemPrompt(contextChunks) {
  const context = contextChunks
    .map((c) => `Source: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n');

  return [
    'You are the documentation assistant for Loyalty.lt, a loyalty program platform API.',
    'Answer only using the CONTEXT below, drawn from the official docs. If the context does not',
    'cover the question, say you are not sure and point to https://docs.loyalty.lt/api-reference/overview',
    'instead of guessing. Keep answers short and link the specific doc page(s) you used.',
    '',
    'CONTEXT:',
    context || '(no matching documentation found for this question)',
  ].join('\n');
}

async function askLLM(message, history, contextChunks) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(contextChunks) },
    ...history,
    { role: 'user', content: message },
  ];

  const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LITELLM_API_KEY}`,
    },
    body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.2, max_tokens: 800 }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ai.loyalty.lt returned ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/* ------------------------------------------------------------- ratelimit */

// ponytail: in-memory per-IP sliding window, resets on restart, no cross-node
// sharing. Fine for one pm2 instance behind one nginx; move to a shared store
// (Redis) if this ever runs with more than one instance.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

/* ------------------------------------------------------------------ http */

function withCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readJsonBody(req, maxBytes = 16_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

const server = createServer(async (req, res) => {
  withCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/api/chat/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, corpusChunks: CORPUS.length }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests. Try again in a few minutes.' }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'message is required' }));
    return;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `message must be under ${MAX_MESSAGE_LENGTH} characters` }));
    return;
  }

  const history = sanitizeHistory(body.history);
  const contextChunks = retrieve(message);

  try {
    const answer = await askLLM(message, history, contextChunks);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        answer,
        sources: [...new Set(contextChunks.map((c) => c.url))],
      })
    );
  } catch (err) {
    console.error('chat-proxy: upstream error', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'The AI service is unavailable right now. Please try again shortly.' }));
  }
});

server.listen(PORT, () => {
  console.log(`chat-proxy listening on :${PORT}, forwarding to ${AI_BASE_URL} (${AI_MODEL})`);
});

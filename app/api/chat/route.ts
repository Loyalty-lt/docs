import OpenAI from 'openai';
import { retrieveScored, type Chunk } from '@/lib/chat-retrieval';

/**
 * "Ask AI" proxy. The browser only ever POSTs here; the LLM credential stays in
 * this server process and is never shipped to the client. Answers are grounded
 * in the docs corpus (see lib/chat-retrieval — semantic search via the gateway
 * `embedding` model), then streamed from the shared AI gateway.
 *
 * Same gateway convention as api.loyalty.lt (config/services.php `ai`):
 * `AI_BASE_URL` (already includes `/v1`), `AI_API_KEY`, chat model
 * `AI_MODEL_STANDARD`, and an `AI_TENANT_MARKER` prefix so our prompt-cache
 * prefix stays isolated on the shared gateway.
 *
 * The response is a newline-delimited JSON stream so the UI can show the
 * model's live reasoning: each line is `{"t":"think"|"answer","v":"..."}`.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://ai.loyalty.lt/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL_STANDARD || process.env.AI_CHAT_MODEL || 'chat-smart';
const API_KEY = process.env.AI_API_KEY;
const TENANT_MARKER = process.env.AI_TENANT_MARKER || 'loyalty-docs';
// Relevance gate: queries whose best doc-cosine is below this are treated as
// off-topic and get a canned redirect without calling the chat model. Calibrated
// from measured scores (on-topic ≥ 0.72, off-topic ≤ 0.60).
const RELEVANCE_THRESHOLD = Number(process.env.AI_RELEVANCE_THRESHOLD || 0.65);
const OFF_TOPIC_REPLY =
  'Galiu padėti tik su **Loyalty.lt** API, SDK ir integracija — ko norėtum?\n\n' +
  "I can only help with the **Loyalty.lt** API, SDKs and integration — what do you need?";

// Official OpenAI SDK pointed at our gateway (same approach as api.loyalty.lt's
// openai-php client). Handles streaming + retries; reasoning_content is a
// non-standard field we read off the delta.
const ai = API_KEY ? new OpenAI({ baseURL: AI_BASE_URL, apiKey: API_KEY }) : null;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 8;

function systemPrompt(ctx: Chunk[]) {
  const context = ctx.map((c) => `Source: ${c.url}\n${c.text}`).join('\n\n---\n\n');
  return [
    `[${TENANT_MARKER}]`,
    'You are the documentation assistant for Loyalty.lt, a loyalty program platform API.',
    'SCOPE: answer ONLY about Loyalty.lt — its platform, API, SDKs (JavaScript, PHP,',
    'Python), endpoints, authentication, integration, and the CONTEXT below.',
    'If the question is off-topic (weather, news, world knowledge, general or unrelated',
    "programming, other companies' products, personal matters), briefly decline in the",
    "user's language and invite a Loyalty.lt question. Do NOT answer it, and do NOT",
    'recommend or link any external website, service or tool.',
    'CODE: help with Loyalty.lt SDK/API code — explain, fix or write integration snippets.',
    'Refuse general or unrelated coding tasks (algorithms, other APIs, homework).',
    'Only ever link to docs.loyalty.lt pages; never invent external links.',
    'Answer the question using the CONTEXT below, drawn from the official docs.',
    'Reply in the SAME language as the user question. Be concise, concrete and helpful.',
    'Extract exact values — package names, endpoint paths, method names, headers, code —',
    'verbatim from the context; do not paraphrase or invent them. Include short code snippets',
    'when useful and cite the relevant doc page(s) as markdown links.',
    'Read the CONTEXT carefully before answering. Only say you are unsure when the context',
    'genuinely lacks the answer — then point to https://docs.loyalty.lt/docs/api-reference/overview.',
    'Think briefly and in proportion to difficulty: a greeting or trivial question needs almost',
    'no deliberation. Do not repeat yourself or second-guess an answer you already have.',
    '',
    'CONTEXT:',
    context || '(no matching documentation found)',
  ].join('\n');
}

type Msg = { role: 'user' | 'assistant'; content: string };

// Stream a fixed answer as a single ndjson frame (same shape the client parses),
// used by the relevance gate so no chat-model call is made.
function cannedStream(text: string) {
  const body = new TextEncoder().encode(JSON.stringify({ t: 'answer', v: text }) + '\n');
  return new Response(new ReadableStream({ start(c) { c.enqueue(body); c.close(); } }), {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  if (!API_KEY) {
    return Response.json({ error: 'AI chat is not configured (AI_API_KEY missing).' }, { status: 503 });
  }
  let body: { message?: string; history?: Msg[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const message = (body.message || '').slice(0, MAX_MESSAGE_LENGTH).trim();
  if (!message) return Response.json({ error: 'empty message' }, { status: 400 });

  const history: Msg[] = Array.isArray(body.history)
    ? body.history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }))
    : [];

  const { chunks: ctx, score } = await retrieveScored(message);

  // Hard relevance gate: a clearly off-topic query (low doc similarity, and not a
  // follow-up in an existing thread) gets a canned redirect, no model call.
  if (score !== null && score < RELEVANCE_THRESHOLD && history.length === 0) {
    return cannedStream(OFF_TOPIC_REPLY);
  }

  let completion;
  try {
    completion = await ai!.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'system', content: systemPrompt(ctx) }, ...history, { role: 'user', content: message }],
      temperature: 0.2,
      // generous budget: chat-smart-thinking spends most tokens on reasoning
      // before the answer, so a small cap truncates the reply to empty.
      max_tokens: 4000,
      stream: true,
    });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    return Response.json({ error: `ai.loyalty.lt ${err.status ?? ''}`.trim(), detail: (err.message ?? '').slice(0, 300) }, { status: 502 });
  }

  // Newline-delimited JSON frames: {"t":"think"|"answer","v":"..."}. Reasoning
  // arrives on delta.reasoning_content (shown live as "thinking"); the answer on
  // delta.content. Inline <think> in content is stripped as a safety net.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const strip = makeThinkStripper();
      const send = (t: 'think' | 'answer', v: string) => {
        if (v) controller.enqueue(enc.encode(JSON.stringify({ t, v }) + '\n'));
      };
      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta as { content?: string; reasoning_content?: string } | undefined;
          if (delta?.reasoning_content) send('think', delta.reasoning_content);
          if (delta?.content) send('answer', strip.feed(delta.content));
        }
        send('answer', strip.end());
      } catch {
        // client aborted or upstream died — just end the stream
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * Streaming stripper for <think>…</think> spans in content (some models inline
 * their reasoning). Holds back only the trailing bytes that could still be a
 * partial tag.
 */
function makeThinkStripper() {
  const OPEN = '<think>';
  const CLOSE = '</think>';
  let inThink = false;
  let hold = '';
  const partial = (s: string, tag: string) => {
    const max = Math.min(s.length, tag.length - 1);
    for (let n = max; n > 0; n--) if (tag.startsWith(s.slice(s.length - n))) return n;
    return 0;
  };
  return {
    feed(text: string): string {
      hold += text;
      let out = '';
      for (;;) {
        if (!inThink) {
          const i = hold.indexOf(OPEN);
          if (i === -1) {
            const keep = partial(hold, OPEN);
            out += hold.slice(0, hold.length - keep);
            hold = hold.slice(hold.length - keep);
            break;
          }
          out += hold.slice(0, i);
          hold = hold.slice(i + OPEN.length);
          inThink = true;
        } else {
          const j = hold.indexOf(CLOSE);
          if (j === -1) {
            hold = hold.slice(hold.length - partial(hold, CLOSE));
            break;
          }
          hold = hold.slice(j + CLOSE.length);
          inThink = false;
        }
      }
      return out;
    },
    end(): string {
      const rest = inThink ? '' : hold;
      hold = '';
      return rest;
    },
  };
}

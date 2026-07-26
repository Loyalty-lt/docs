#!/usr/bin/env node
/**
 * Smoke test for chat-proxy.mjs. Stands in a stub for ai.loyalty.lt so this
 * runs without a live LLM, and checks the parts that would actually break
 * silently: the docs corpus indexes to something non-empty, retrieval finds a
 * real page for a real question, the upstream request carries the secret and
 * model correctly, and the request-shape guards (empty message, rate limit)
 * hold. Not a correctness test of the LLM's answers — that needs the real
 * backend and a human.
 *
 * Run: node server/chat-proxy.test.mjs
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

function listenOnFreePort(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function waitForHealth(url, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`chat-proxy did not become healthy at ${url} within ${timeoutMs}ms`);
}

let upstreamRequests = [];

const upstream = await listenOnFreePort(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  upstreamRequests.push({ headers: req.headers, body });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      choices: [{ message: { content: 'STUBBED ANSWER: use X-API-Key and X-API-Secret headers.' } }],
    })
  );
});
const upstreamPort = upstream.address().port;

const proxyPort = 3999; // fixed test port, unrelated to the real 3102
const proxy = spawn(process.execPath, ['server/chat-proxy.mjs'], {
  env: {
    ...process.env,
    CHAT_PROXY_PORT: String(proxyPort),
    AI_BASE_URL: `http://127.0.0.1:${upstreamPort}`,
    AI_MODEL: 'test-model',
    LITELLM_API_KEY: 'sk-test-secret-do-not-leak',
    CHAT_PROXY_ALLOWED_ORIGINS: 'http://localhost:3000',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let proxyLog = '';
proxy.stdout.on('data', (d) => (proxyLog += d));
proxy.stderr.on('data', (d) => (proxyLog += d));

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log('   ', err.message);
  }
}

try {
  await waitForHealth(`http://127.0.0.1:${proxyPort}/api/chat/health`);

  const health = await (await fetch(`http://127.0.0.1:${proxyPort}/api/chat/health`)).json();
  check('indexes a non-empty corpus from docs/', () => {
    assert.ok(health.corpusChunks > 50, `expected >50 chunks, got ${health.corpusChunks}`);
  });

  const res = await fetch(`http://127.0.0.1:${proxyPort}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify({ message: 'How do I authenticate with the shop API?' }),
  });
  const data = await res.json();

  check('returns 200 for a normal question', () => assert.equal(res.status, 200));
  check('returns the model answer', () => assert.equal(data.answer, 'STUBBED ANSWER: use X-API-Key and X-API-Secret headers.'));
  check('cites at least one real doc page as a source', () => {
    assert.ok(Array.isArray(data.sources) && data.sources.length > 0, 'expected non-empty sources');
    assert.ok(data.sources.some((s) => /auth/i.test(s)), `expected an auth-related source, got ${JSON.stringify(data.sources)}`);
  });

  check('upstream request carried the secret, not the client', () => {
    const authHeader = upstreamRequests[0]?.headers?.authorization;
    assert.equal(authHeader, 'Bearer sk-test-secret-do-not-leak');
  });
  check('upstream request used the configured model', () => {
    assert.equal(upstreamRequests[0]?.body?.model, 'test-model');
  });
  check('system prompt embeds retrieved doc context', () => {
    const sysMsg = upstreamRequests[0]?.body?.messages?.[0];
    assert.equal(sysMsg?.role, 'system');
    assert.ok(sysMsg.content.includes('CONTEXT:'), 'expected CONTEXT section in system prompt');
  });

  const empty = await fetch(`http://127.0.0.1:${proxyPort}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '' }),
  });
  check('rejects an empty message with 400', () => assert.equal(empty.status, 400));

  const tooLong = await fetch(`http://127.0.0.1:${proxyPort}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'x'.repeat(3000) }),
  });
  check('rejects an over-length message with 400', () => assert.equal(tooLong.status, 400));

  upstreamRequests = [];
  let lastStatus = 0;
  for (let i = 0; i < 22; i++) {
    const r = await fetch(`http://127.0.0.1:${proxyPort}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `rate limit probe ${i}` }),
    });
    lastStatus = r.status;
  }
  check('rate-limits after 20 requests from one IP', () => assert.equal(lastStatus, 429));
} finally {
  proxy.kill();
  upstream.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed.\n--- proxy output ---\n${proxyLog}`);
  process.exit(1);
}
console.log('\nall checks passed');

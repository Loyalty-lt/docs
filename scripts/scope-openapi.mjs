#!/usr/bin/env node
/**
 * Build the PUBLIC OpenAPI spec that the API Reference is generated from.
 *
 * api.loyalty.lt's own /docs endpoint serves the WHOLE platform spec — 254
 * paths, every route the Laravel app annotates regardless of which guard
 * protects it (admin staff JWT, subscriptions, users, audit logs, SIP call
 * control). None of that is for third-party integrators.
 *
 * The public integrator surface is exactly:
 *   - path prefix `shop`      (Shop APIs — points, cards, games, offers, ...)
 *   - path prefix `sms`       (External SMS API)
 *   - path prefix `partners`  (Partner APIs — partner-owned games, customers)
 *   - tag "Public Partners"   (site partner/shop directory, prefix `site`)
 * and never anything under `/admin/`.
 *
 * Source of truth is upstream. We cache the full spec to openapi/full.json so
 * builds are reproducible offline; delete that file to refetch.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FULL = resolve(ROOT, 'openapi/full.json');
const OUT = resolve(ROOT, 'openapi/loyalty.json');
const SPEC_URL = process.env.OPENAPI_URL || 'https://api.loyalty.lt/docs?api-docs.json';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const HASH_ID = /^[0-9a-f]{24,}$/;
const PUBLIC_PREFIXES = ['shop', 'sms', 'partners'];
const PUBLIC_TAGS = ['Public Partners'];

function firstSegment(path) {
  const s = path.split('/').filter(Boolean);
  if (s[0] === 'api') s.shift();
  if (s[0] === '{locale}') s.shift();
  return s[0];
}

function isPublic(path, item) {
  if (/\/admin\//.test(path)) return false;
  if (PUBLIC_PREFIXES.includes(firstSegment(path))) return true;
  for (const m of Object.keys(item)) {
    if (!METHODS.includes(m.toLowerCase())) continue;
    for (const t of item[m].tags ?? []) if (PUBLIC_TAGS.includes(t)) return true;
  }
  return false;
}

/** `/{locale}/shop/realtime/publish` + post -> `postShopRealtimePublish` */
function deriveId(method, path) {
  const camel = path
    .split('/')
    .filter(Boolean)
    .filter((s) => s !== '{locale}')
    .map((s) => (s.startsWith('{') ? `by-${s.slice(1, -1)}` : s))
    .join('-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .split('-')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)))
    .join('');
  return method + camel[0].toUpperCase() + camel.slice(1);
}

const cleanTag = (t) => t.replace(/\\/g, ' / ').replace(/\s+/g, ' ').trim();

async function loadFull() {
  if (existsSync(FULL)) return JSON.parse(readFileSync(FULL, 'utf8'));
  console.log(`fetching full spec from ${SPEC_URL} ...`);
  const res = await fetch(SPEC_URL);
  if (!res.ok) throw new Error(`spec fetch failed: ${res.status}`);
  const spec = await res.json();
  mkdirSync(dirname(FULL), { recursive: true });
  writeFileSync(FULL, JSON.stringify(spec, null, 2));
  return spec;
}

const spec = await loadFull();
const before = Object.keys(spec.paths ?? {}).length;

for (const path of Object.keys(spec.paths ?? {})) {
  if (!isPublic(path, spec.paths[path])) delete spec.paths[path];
}
const kept = Object.keys(spec.paths).length;

// operationId: replace l5-swagger MD5 hashes with stable derived names
const used = new Set();
for (const item of Object.values(spec.paths)) {
  for (const [m, op] of Object.entries(item)) {
    if (METHODS.includes(m.toLowerCase()) && op.operationId && !HASH_ID.test(op.operationId)) used.add(op.operationId);
  }
}
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [m, op] of Object.entries(item)) {
    if (!METHODS.includes(m.toLowerCase())) continue;
    if (op.operationId && !HASH_ID.test(op.operationId)) continue;
    let id = deriveId(m.toLowerCase(), path), n = 2;
    while (used.has(id)) id = `${deriveId(m.toLowerCase(), path)}${n++}`;
    used.add(id);
    op.operationId = id;
    // clean tags (Admin\System style namespaces) — harmless for public tags
    if (Array.isArray(op.tags)) op.tags = op.tags.map(cleanTag);
  }
}

// keep only tag definitions still in use, in their original order
const usedTags = new Set();
for (const item of Object.values(spec.paths))
  for (const [m, op] of Object.entries(item))
    if (METHODS.includes(m.toLowerCase())) for (const t of op.tags ?? []) usedTags.add(t);
if (Array.isArray(spec.tags)) spec.tags = spec.tags.map((t) => ({ ...t, name: cleanTag(t.name) })).filter((t) => usedTags.has(t.name));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(spec, null, 2) + '\n');
console.log(`scoped public spec: kept ${kept}/${before} paths, ${usedTags.size} tags -> ${OUT}`);

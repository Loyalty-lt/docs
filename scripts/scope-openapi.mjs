#!/usr/bin/env node
/**
 * Build the PUBLIC OpenAPI spec that the API Reference is generated from.
 *
 * api.loyalty.lt's /docs endpoint serves the whole platform spec — every route the
 * Laravel app annotates, including the admin dashboard, the partner portal backend
 * (billing, Stripe payouts, staff, campaigns) and the marketing site's content feeds.
 * None of that is a third-party integration surface.
 *
 * What integrators actually call is two prefixes:
 *   - `shop`  — Shop API: points, transactions, cards, coupons, games, offers, QR
 *   - `sms`   — External SMS API
 *
 * Source of truth is upstream. The full spec is cached to openapi/full.json so builds
 * are reproducible offline; delete that file to refetch.
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
const PUBLIC_PREFIXES = ['shop', 'sms'];

function firstSegment(path) {
  const s = path.split('/').filter(Boolean);
  if (s[0] === 'api') s.shift();
  if (s[0] === '{locale}') s.shift();
  return s[0];
}

/** `/{locale}/shop/coupons/verify` + post -> `postShopCouponsVerify` */
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

async function loadFull() {
  // Cache hit keeps local builds offline-friendly. It is never used on a deploy —
  // deploy/deploy.sh removes the file first — and `OPENAPI_REFRESH=1` forces a refetch.
  if (existsSync(FULL) && !process.env.OPENAPI_REFRESH) {
    const spec = JSON.parse(readFileSync(FULL, 'utf8'));
    console.log(`using cached ${FULL} (set OPENAPI_REFRESH=1 to refetch)`);
    return spec;
  }
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

// Endpoints that match a public prefix but are not part of the integration surface.
// `realtime/publish` only reaches the internal phone-to-desktop upload channel.
const EXCLUDED_PATHS = ['/{locale}/shop/realtime/publish'];

for (const path of Object.keys(spec.paths ?? {})) {
  if (!PUBLIC_PREFIXES.includes(firstSegment(path)) || EXCLUDED_PATHS.includes(path)) {
    delete spec.paths[path];
  }
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
  }
}

// Sidebar groups: the order integrators meet them in, with descriptions written for
// someone wiring up a shop rather than for whoever annotated the controller.
const TAGS = [
  ['Transactions', 'Register purchases, award points, and reserve points during checkout.'],
  ['Loyalty Cards', 'Look up a card by number, phone or email and read its points balance.'],
  ['Coupons', 'Verify a coupon at the till, hold it during checkout, then redeem it.'],
  ['Games', 'Stamp cards and other loyalty games: add stamps, read progress, issue rewards.'],
  ['Offers', 'Read the promotions available to customers.'],
  ['Shops', "List the partner's shops — this is where shop_id comes from."],
  ['Products', 'Product categories and the status of the last catalogue sync.'],
  ['XML Import', 'Bulk-import a product catalogue from an XML feed.'],
  ['Authentication', 'Sign a customer in from a desktop or POS screen with a QR code.'],
  ['QR Card Scan', 'Identify a customer at the till by having them scan a QR code.'],
  ['Realtime', 'Connection details for the channels that carry QR results and live session updates.'],
  ['System', 'Health check and credential validation.'],
  ['External SMS API', 'Send transactional SMS and record marketing consent.'],
];

const usedTags = new Set();
for (const item of Object.values(spec.paths))
  for (const [m, op] of Object.entries(item))
    if (METHODS.includes(m.toLowerCase())) for (const t of op.tags ?? []) usedTags.add(t);

const known = new Set(TAGS.map(([name]) => name));
for (const t of usedTags) if (!known.has(t)) console.warn(`warning: untitled tag "${t}" — add it to TAGS`);
spec.tags = TAGS.filter(([name]) => usedTags.has(name)).map(([name, description]) => ({ name, description }));

// Production first — that is the URL most readers copy out of the "Try it" panel.
spec.servers = [
  { url: 'https://api.loyalty.lt', description: 'Production' },
  { url: 'https://staging-api.loyalty.lt', description: 'Staging' },
];
spec.info = {
  ...spec.info,
  title: 'Loyalty.lt Shop API',
  description:
    'REST API for awarding loyalty points, managing cards, coupons and games from an e-commerce platform or POS. ' +
    'Every path is locale-prefixed with `lt` or `en`.',
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(spec, null, 2) + '\n');
console.log(`scoped public spec: kept ${kept}/${before} paths, ${usedTags.size} tags -> ${OUT}`);

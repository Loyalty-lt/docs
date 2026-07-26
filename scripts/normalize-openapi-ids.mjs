#!/usr/bin/env node
/**
 * Scope and normalize the OpenAPI spec before the API Explorer is generated
 * from it. Three things, in order:
 *
 * 1. PUBLIC SCOPE. api.loyalty.lt's spec is the whole platform — one Laravel
 *    app, one l5-swagger doc, every route annotated with `@OA\...` regardless
 *    of which guard protects it. That includes `/admin/*` (staff JWT),
 *    `/subscriptions`, `/users`, `/audit-logs`, SIP call control — none of it
 *    is for third-party integrators, all of it assumes an authenticated
 *    Loyalty.lt staff session.
 *
 *    The previous Mintlify site never exposed this: its docs.json only ever
 *    linked hand-written pages under `api-reference/endpoints/shop/*` and the
 *    SMS webhook pages, and the full openapi.json — while present in the repo
 *    — was never wired into navigation, so nobody browsing the site could
 *    reach it. The first Docusaurus migration pass copied the full spec into
 *    `static/` and pointed docusaurus-plugin-openapi-docs at it directly,
 *    which turns every path into a browsable, "try it"-testable sidebar
 *    entry — 46 tags including 5 Admin-prefixed ones, Subscriptions, User
 *    Management. That's what this step undoes: only paths whose first
 *    segment (after `/api` and `/{locale}`) is `shop` or `sms` survive —
 *    the exact surface the old site exposed, matched by path prefix rather
 *    than by tag because several tags (e.g. "Authentication") are shared
 *    between the public shop routes and the internal mobile-app routes.
 *
 *    This does not touch the source: api.loyalty.lt's own `/docs` endpoint
 *    still serves the full internal spec with no auth. That is a separate,
 *    already-live exposure and is out of scope for this repo.
 *
 * 2. OPERATION IDS. l5-swagger emits an MD5 hash as the operationId whenever
 *    the PHP annotation does not set one. The Docusaurus OpenAPI plugin turns
 *    the operationId into the page slug, so those endpoints would land on
 *    URLs like `/api-explorer/14b085d80b45d980d2f0352278de59a5`. This
 *    rewrites only the hash-shaped ids, deriving a stable name from the
 *    method and path, and leaves hand-written ids alone.
 *
 * 3. TAG NAMES. One tag is `Admin\System` (a PHP namespace leaked into the
 *    docs), and the generated frontmatter writes it unescaped into a
 *    double-quoted YAML string, where `\S` is an invalid escape and breaks
 *    the build.
 *
 * All three are idempotent — running this twice is a no-op — so it is safe to
 * chain in front of `gen-api-docs`. The real fix for all three is upstream, in
 * how api.loyalty.lt scopes and annotates its routes.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SPEC = 'static/api-reference/openapi.json';
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const HASH_ID = /^[0-9a-f]{24,}$/;
/** Path's first real segment, after stripping a leading /api and /{locale}. */
const PUBLIC_PREFIXES = ['shop', 'sms'];

/** `/​{locale}/shop/realtime/publish` + post -> `postShopRealtimePublish` */
function deriveId(method, path) {
  const segments = path
    .split('/')
    .filter(Boolean)
    // `{locale}` is on nearly every route and carries no meaning in a name.
    .filter((s) => s !== '{locale}')
    .map((s) => (s.startsWith('{') ? `by-${s.slice(1, -1)}` : s));

  const camel = segments
    .join('-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .split('-')
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1)))
    .join('');

  return method + camel[0].toUpperCase() + camel.slice(1);
}

function isPublicPath(path) {
  const segments = path.split('/').filter(Boolean);
  if (segments[0] === 'api') segments.shift();
  if (segments[0] === '{locale}') segments.shift();
  return PUBLIC_PREFIXES.includes(segments[0]);
}

const spec = JSON.parse(readFileSync(SPEC, 'utf8'));

// --- 1. scope to the public shop/sms surface -------------------------------
let scopedAnything = false;
{
  const before = Object.keys(spec.paths ?? {}).length;
  const dropped = [];
  for (const path of Object.keys(spec.paths ?? {})) {
    if (!isPublicPath(path)) {
      dropped.push(path);
      delete spec.paths[path];
    }
  }
  scopedAnything = dropped.length > 0;
  if (scopedAnything) {
    console.log(
      `scoped spec to the public shop/sms surface: kept ${before - dropped.length}/${before} paths, ` +
        `dropped ${dropped.length} internal ones (admin, subscriptions, users, audit logs, ...)`
    );
  }

  // Drop tag *definitions* for tags no path uses any more, so an internal tag
  // does not show up as an empty category in the generated sidebar.
  const usedTags = new Set();
  for (const item of Object.values(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(item)) {
      if (!METHODS.includes(method.toLowerCase())) continue;
      for (const t of op.tags ?? []) usedTags.add(t);
    }
  }
  if (Array.isArray(spec.tags)) {
    spec.tags = spec.tags.filter((t) => usedTags.has(t.name));
  }
}

/** `Admin\System` -> `Admin / System` — readable, and safe inside YAML. */
const cleanTag = (t) => t.replace(/\\/g, ' / ').replace(/\s+/g, ' ').trim();
const tagRenames = new Map();

for (const tag of spec.tags ?? []) {
  const next = cleanTag(tag.name);
  if (next !== tag.name) {
    tagRenames.set(tag.name, next);
    tag.name = next;
  }
}

for (const item of Object.values(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(item)) {
    if (!METHODS.includes(method.toLowerCase())) continue;
    if (!Array.isArray(op.tags)) continue;
    op.tags = op.tags.map((t) => tagRenames.get(t) ?? cleanTag(t));
  }
}
const used = new Set();
const renamed = [];

// Collect the ids we are keeping first, so derived names cannot collide with them.
for (const item of Object.values(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(item)) {
    if (!METHODS.includes(method.toLowerCase())) continue;
    if (op.operationId && !HASH_ID.test(op.operationId)) used.add(op.operationId);
  }
}

for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(item)) {
    if (!METHODS.includes(method.toLowerCase())) continue;
    if (op.operationId && !HASH_ID.test(op.operationId)) continue;

    let candidate = deriveId(method.toLowerCase(), path);
    let n = 2;
    while (used.has(candidate)) candidate = `${deriveId(method.toLowerCase(), path)}${n++}`;

    used.add(candidate);
    renamed.push([op.operationId ?? '(none)', candidate]);
    op.operationId = candidate;
  }
}

if (!scopedAnything && renamed.length === 0 && tagRenames.size === 0) {
  console.log('spec already normalized, nothing to do');
} else {
  writeFileSync(SPEC, `${JSON.stringify(spec, null, 2)}\n`);
  for (const [from, to] of tagRenames) console.log(`renamed tag ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
  if (renamed.length) console.log(`normalized ${renamed.length} operationId(s):`);
  for (const [from, to] of renamed.slice(0, 10)) console.log(`  ${from} -> ${to}`);
  if (renamed.length > 10) console.log(`  ... and ${renamed.length - 10} more`);
}

#!/usr/bin/env node
/**
 * Replace machine-generated operationIds with readable ones.
 *
 * l5-swagger emits an MD5 hash as the operationId whenever the PHP annotation
 * does not set one — 41 of 284 operations at the time of writing. The Docusaurus
 * OpenAPI plugin turns the operationId into the page slug, so those endpoints
 * would land on URLs like `/api-explorer/14b085d80b45d980d2f0352278de59a5`.
 *
 * This rewrites only the hash-shaped ids, deriving a stable name from the method
 * and path, and leaves hand-written ids alone. Idempotent: running it twice is a
 * no-op, so it is safe to chain in front of `gen-api-docs`.
 *
 * It also sanitises tag names: one tag is `Admin\System` (a PHP namespace leaked
 * into the docs), and the generated frontmatter writes it unescaped into a
 * double-quoted YAML string, where `\S` is an invalid escape and breaks the build.
 *
 * The real fix for both is in the `@OA\...` annotations in api.loyalty.lt.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SPEC = 'static/api-reference/openapi.json';
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const HASH_ID = /^[0-9a-f]{24,}$/;

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

const spec = JSON.parse(readFileSync(SPEC, 'utf8'));

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

if (renamed.length === 0 && tagRenames.size === 0) {
  console.log('spec already normalized, nothing to do');
} else {
  writeFileSync(SPEC, `${JSON.stringify(spec, null, 2)}\n`);
  for (const [from, to] of tagRenames) console.log(`renamed tag ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
  if (renamed.length) console.log(`normalized ${renamed.length} operationId(s):`);
  for (const [from, to] of renamed.slice(0, 10)) console.log(`  ${from} -> ${to}`);
  if (renamed.length > 10) console.log(`  ... and ${renamed.length - 10} more`);
}

#!/usr/bin/env node
/**
 * Bundle the docs into src/data/index.json, which the MCP server ships with.
 *
 * Two sources, the same two the site itself renders:
 *   - content/docs/**.mdx     the hand-written guides
 *   - openapi/loyalty.json    the scoped public spec -> the API Reference
 *
 * Bundling rather than fetching means the server answers instantly, works
 * offline, and cannot drift from the site it was published alongside. Run
 * `npm run build` in mcp/ after changing either source.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MCP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ROOT = resolve(MCP_ROOT, '..');
const CONTENT = join(SITE_ROOT, 'content/docs');
const SPEC = join(SITE_ROOT, 'openapi/loyalty.json');
const OUT = join(MCP_ROOT, 'src/data/index.json');

const SITE_URL = 'https://docs.loyalty.lt';
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/** Fumadocs derives a tag's URL segment this way — keep it in step. */
const slugifyTag = (tag) =>
  tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

/** Split `---\nfrontmatter\n---\nbody` without pulling in a YAML parser. */
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].trim().replace(/^["'](.*)["']$/, '$1');
  }
  return { data, body: match[2] };
}

// ---------------------------------------------------------------- guides

const guides = [];
for (const file of walk(CONTENT).sort()) {
  const rel = relative(CONTENT, file).replace(/\.mdx$/, '');
  const url = '/docs' + (rel === 'index' ? '' : '/' + rel.replace(/\/index$/, ''));
  const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
  const segments = rel.split('/');

  guides.push({
    path: url,
    title: data.title ?? segments.at(-1),
    description: data.description ?? '',
    section: segments.length > 1 ? segments[0] : 'root',
    content: body.trim(),
  });
}

// ------------------------------------------------------------- endpoints

const spec = JSON.parse(readFileSync(SPEC, 'utf8'));

/** Which credentials the endpoint wants, in words rather than scheme names. */
function describeAuth(security) {
  const flat = JSON.stringify(security ?? []);
  if (flat.includes('apiKey')) return 'api-credentials';
  if (flat.includes('bearerAuth')) return 'customer-jwt';
  return 'none';
}

/** Unwrap the one-level $ref l5-swagger emits, so tools never hand back a pointer. */
function deref(node, seen = new Set()) {
  if (!node || typeof node !== 'object') return node;
  if (typeof node.$ref === 'string') {
    if (seen.has(node.$ref)) return { type: 'object' };
    seen.add(node.$ref);
    const target = node.$ref.replace(/^#\//, '').split('/').reduce((acc, k) => acc?.[k], spec);
    return deref(target, seen);
  }
  if (Array.isArray(node)) return node.map((n) => deref(n, seen));
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deref(v, seen)]));
}

function flattenSchema(schema, prefix = '') {
  const out = [];
  const props = schema?.properties ?? {};
  const required = new Set(schema?.required ?? []);
  for (const [name, prop] of Object.entries(props)) {
    out.push({
      name: prefix + name,
      type: prop.type ?? 'object',
      required: required.has(name),
      description: prop.description ?? '',
      example: prop.example,
      enum: prop.enum,
    });
    if (prop.type === 'object' && prop.properties) out.push(...flattenSchema(prop, `${prefix}${name}.`));
    if (prop.type === 'array' && prop.items?.properties) out.push(...flattenSchema(prop.items, `${prefix}${name}[].`));
  }
  return out;
}

const endpoints = [];
for (const [path, item] of Object.entries(spec.paths ?? {})) {
  for (const [method, op] of Object.entries(item)) {
    if (!METHODS.includes(method.toLowerCase())) continue;

    const tag = op.tags?.[0] ?? 'Other';
    const params = (deref(op.parameters) ?? [])
      .filter((p) => p.name !== 'locale')
      .map((p) => ({
        name: p.name,
        in: p.in,
        required: Boolean(p.required),
        type: p.schema?.type ?? 'string',
        description: p.description ?? '',
        example: p.schema?.example,
        enum: p.schema?.enum,
      }));

    const bodySchema = deref(op.requestBody?.content?.['application/json']?.schema);
    const multipart = Boolean(op.requestBody?.content?.['multipart/form-data']);

    endpoints.push({
      id: op.operationId,
      method: method.toUpperCase(),
      path,
      tag,
      summary: op.summary ?? '',
      description: op.description ?? '',
      auth: describeAuth(op.security),
      params,
      body: bodySchema ? flattenSchema(bodySchema) : [],
      multipart,
      responses: Object.entries(op.responses ?? {}).map(([code, res]) => ({
        code,
        description: res.description ?? '',
      })),
      docsPath: `/docs/${slugifyTag(tag)}/${op.operationId}`,
    });
  }
}

const tags = (spec.tags ?? []).map((t) => ({
  name: t.name,
  description: t.description ?? '',
  slug: slugifyTag(t.name),
  count: endpoints.filter((e) => e.tag === t.name).length,
}));

// ------------------------------------------------------------------ out

const index = {
  generatedAt: new Date().toISOString(),
  site: SITE_URL,
  apiTitle: spec.info?.title ?? 'Loyalty.lt Shop API',
  servers: (spec.servers ?? []).map((s) => ({ url: s.url, description: s.description ?? '' })),
  sections: [...new Set(guides.map((g) => g.section))],
  guides,
  endpoints,
  tags,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(index) + '\n');

const kb = Math.round(JSON.stringify(index).length / 1024);
console.log(`indexed ${guides.length} guides, ${endpoints.length} endpoints, ${tags.length} tags -> ${OUT} (${kb} KB)`);

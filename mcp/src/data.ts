import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Guide {
  path: string;
  title: string;
  description: string;
  section: string;
  content: string;
}

export interface Field {
  name: string;
  in?: string;
  type: string;
  required: boolean;
  description: string;
  example?: unknown;
  enum?: string[];
}

export type Auth = "api-credentials" | "customer-jwt" | "none";

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  tag: string;
  summary: string;
  description: string;
  auth: Auth;
  params: Field[];
  body: Field[];
  multipart: boolean;
  responses: { code: string; description: string }[];
  docsPath: string;
}

export interface Tag {
  name: string;
  description: string;
  slug: string;
  count: number;
}

export interface DocsIndex {
  generatedAt: string;
  site: string;
  apiTitle: string;
  servers: { url: string; description: string }[];
  sections: string[];
  guides: Guide[];
  endpoints: Endpoint[];
  tags: Tag[];
}

// build/index.js sits next to build/data/index.json; src/index.ts next to src/data/index.json.
const here = dirname(fileURLToPath(import.meta.url));

export const index: DocsIndex = JSON.parse(readFileSync(join(here, "data/index.json"), "utf8"));

export const PRODUCTION = index.servers.find((s) => /^https:\/\/api\./.test(s.url))?.url ?? "https://api.loyalty.lt";
export const STAGING =
  index.servers.find((s) => /staging/.test(s.url))?.url ?? "https://staging-api.loyalty.lt";

export function findEndpoint(query: string): Endpoint | undefined {
  const q = query.trim();

  const byId = index.endpoints.find((e) => e.id.toLowerCase() === q.toLowerCase());
  if (byId) return byId;

  // "POST /shop/transactions/create", or just the path with or without {locale}
  const parts = q.split(/\s+/);
  const method = parts.length > 1 ? parts[0].toUpperCase() : undefined;
  const rawPath = (parts.length > 1 ? parts.slice(1).join(" ") : q).replace(/^https?:\/\/[^/]+/, "");
  const normalise = (p: string) =>
    p
      .replace(/\/\{locale\}/g, "")
      .replace(/^\/(lt|en)\b/, "")
      .replace(/\{[^}]+\}/g, "{}")
      .replace(/\/$/, "")
      .toLowerCase();
  const wanted = normalise(rawPath.startsWith("/") ? rawPath : "/" + rawPath);

  return index.endpoints.find(
    (e) => normalise(e.path) === wanted && (!method || e.method === method),
  );
}

export const authLabel: Record<Auth, string> = {
  "api-credentials": "API credentials (X-API-Key + X-API-Secret)",
  "customer-jwt": "Customer JWT (Authorization: Bearer)",
  none: "None — public endpoint",
};

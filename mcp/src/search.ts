import { index, type Endpoint, type Guide } from "./data.js";

export interface Hit {
  kind: "guide" | "endpoint";
  score: number;
  guide?: Guide;
  endpoint?: Endpoint;
}

const tokenise = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((t) => t.length > 1);

/**
 * Field-weighted term matching. Deliberately not a full-text engine: the corpus
 * is 67 documents, so a title hit outranking a body hit is the whole trick.
 */
function score(terms: string[], fields: { text: string; weight: number }[]): number {
  let total = 0;
  for (const { text, weight } of fields) {
    const haystack = text.toLowerCase();
    for (const term of terms) {
      if (!haystack.includes(term)) continue;
      // whole-word hits beat substring hits
      const whole = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(haystack);
      total += weight * (whole ? 2 : 1);
    }
  }
  // reward documents that match more of the query, not one term repeatedly
  const covered = terms.filter((t) => fields.some((f) => f.text.toLowerCase().includes(t))).length;
  return total * (covered / terms.length);
}

export function search(query: string, kind: "all" | "guides" | "endpoints" = "all"): Hit[] {
  const terms = tokenise(query);
  if (terms.length === 0) return [];

  const hits: Hit[] = [];

  if (kind !== "endpoints") {
    for (const guide of index.guides) {
      const s = score(terms, [
        { text: guide.title, weight: 10 },
        { text: guide.description, weight: 6 },
        { text: guide.path, weight: 4 },
        { text: guide.content, weight: 1 },
      ]);
      if (s > 0) hits.push({ kind: "guide", score: s, guide });
    }
  }

  if (kind !== "guides") {
    for (const endpoint of index.endpoints) {
      const s = score(terms, [
        { text: endpoint.summary, weight: 10 },
        { text: endpoint.path, weight: 8 },
        { text: endpoint.tag, weight: 5 },
        { text: endpoint.description, weight: 3 },
        { text: endpoint.params.map((p) => p.name).join(" "), weight: 2 },
        { text: endpoint.body.map((b) => b.name).join(" "), weight: 2 },
      ]);
      if (s > 0) hits.push({ kind: "endpoint", score: s, endpoint });
    }
  }

  return hits.sort((a, b) => b.score - a.score);
}

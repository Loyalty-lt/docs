import { z } from "zod";
import { index } from "../data.js";
import { search } from "../search.js";

export const searchDocsSchema = {
  query: z.string().describe("What to look for, e.g. 'award points', 'redeem coupon', 'qr login'"),
  kind: z
    .enum(["all", "guides", "endpoints"])
    .optional()
    .describe("Limit results to written guides or to API endpoints. Defaults to all."),
  limit: z.number().int().min(1).max(30).optional().describe("How many results to return. Defaults to 10."),
};

export type SearchDocsParams = {
  query: string;
  kind?: "all" | "guides" | "endpoints";
  limit?: number;
};

export function searchDocs({ query, kind = "all", limit = 10 }: SearchDocsParams): string {
  if (!query?.trim()) return "Provide a search query.";

  const hits = search(query, kind);

  if (hits.length === 0) {
    return [
      `No results for "${query}".`,
      "",
      "The documentation covers: awarding points for a purchase, loyalty card lookup,",
      "coupons, stamp-card games, offers, XML product import, QR login and QR card scan,",
      "plus the SMS API.",
      "",
      "Try `list_topics` to browse the guides, or `list_endpoints` for the API surface.",
    ].join("\n");
  }

  const shown = hits.slice(0, limit);
  const out = [`# ${hits.length} result${hits.length === 1 ? "" : "s"} for "${query}"`, ""];

  for (const hit of shown) {
    if (hit.kind === "guide" && hit.guide) {
      out.push(`## ${hit.guide.title}  _(guide)_`);
      out.push(`Path: \`${hit.guide.path}\``);
      if (hit.guide.description) out.push(hit.guide.description);
      out.push("");
    } else if (hit.endpoint) {
      const e = hit.endpoint;
      out.push(`## ${e.method} ${e.path}  _(endpoint)_`);
      out.push(`${e.summary} — group: ${e.tag}, auth: ${e.auth}`);
      out.push(`Endpoint id: \`${e.id}\``);
      out.push("");
    }
  }

  if (hits.length > shown.length) {
    out.push(`_Showing ${shown.length} of ${hits.length}. Narrow the query or raise \`limit\`._`);
    out.push("");
  }

  out.push("---");
  out.push("`get_page` fetches a guide by path. `get_endpoint` fetches an endpoint's full contract.");
  out.push(`Docs site: ${index.site}`);

  return out.join("\n");
}

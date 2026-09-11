import { z } from "zod";
import { index } from "../data.js";
import { search } from "../search.js";

export const getPageSchema = {
  path: z
    .string()
    .describe("Guide path, e.g. '/docs/api-reference/authentication' or just 'sdk/php/usage'"),
};

export type GetPageParams = { path: string };

export function getPage({ path }: GetPageParams): string {
  if (!path?.trim()) return "Provide a documentation path.";

  let wanted = path.trim().replace(/\/$/, "");
  if (!wanted.startsWith("/")) wanted = "/" + wanted;
  if (!wanted.startsWith("/docs")) wanted = "/docs" + wanted;

  const guide = index.guides.find((g) => g.path === wanted);

  if (!guide) {
    // An API Reference path is an endpoint page, not a guide — point at the right tool.
    const endpoint = index.endpoints.find((e) => e.docsPath === wanted);
    if (endpoint) {
      return `\`${wanted}\` is an API Reference page. Use \`get_endpoint\` with id \`${endpoint.id}\`.`;
    }

    const near = search(wanted.replace(/\//g, " "), "guides").slice(0, 5);
    return [
      `No guide at \`${wanted}\`.`,
      "",
      near.length ? "Closest matches:" : "Use `list_topics` to see every guide.",
      ...near.map((h) => `- ${h.guide!.title} — \`${h.guide!.path}\``),
    ].join("\n");
  }

  const header = [`# ${guide.title}`];
  if (guide.description) header.push(`_${guide.description}_`);
  header.push(`Path: \`${guide.path}\` · ${index.site}${guide.path}`);

  return `${header.join("\n")}\n\n---\n\n${guide.content}`;
}

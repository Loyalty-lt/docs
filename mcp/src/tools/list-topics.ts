import { z } from "zod";
import { index } from "../data.js";

export const listTopicsSchema = {
  section: z
    .string()
    .optional()
    .describe("Section to expand, e.g. 'api-reference', 'sdk', 'troubleshooting'. Omit for an overview."),
};

export type ListTopicsParams = { section?: string };

const SECTION_TITLES: Record<string, string> = {
  root: "Start here",
  "api-reference": "API basics",
  sdk: "SDKs",
  troubleshooting: "Troubleshooting",
};

export function listTopics({ section }: ListTopicsParams): string {
  const out: string[] = [];

  if (section) {
    const wanted = section.toLowerCase();
    const guides = index.guides.filter((g) => g.section.toLowerCase() === wanted);

    if (guides.length === 0) {
      return [
        `No section called "${section}".`,
        "",
        "Sections: " + index.sections.join(", "),
      ].join("\n");
    }

    out.push(`# ${SECTION_TITLES[wanted] ?? section}`, "");
    for (const g of guides) {
      out.push(`- **${g.title}** — \`${g.path}\``);
      if (g.description) out.push(`  ${g.description}`);
    }
    out.push("", "`get_page` fetches any of these in full.");
    return out.join("\n");
  }

  out.push("# Loyalty.lt documentation", "");
  out.push(
    "Written guides plus a generated API Reference. The API Reference is browsed with",
    "`list_endpoints` / `get_endpoint`, not `get_page`.",
    "",
    "## Guides",
    "",
  );

  for (const sec of index.sections) {
    const guides = index.guides.filter((g) => g.section === sec);
    out.push(`### ${SECTION_TITLES[sec] ?? sec} (${guides.length})`);
    for (const g of guides) out.push(`- ${g.title} — \`${g.path}\``);
    out.push("");
  }

  out.push("## API Reference", "");
  for (const tag of index.tags) {
    out.push(`- **${tag.name}** (${tag.count}) — ${tag.description}`);
  }
  out.push("", `${index.endpoints.length} endpoints in total. Index built ${index.generatedAt}.`);

  return out.join("\n");
}

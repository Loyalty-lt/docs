import { z } from "zod";
import { index } from "../data.js";

export const listEndpointsSchema = {
  tag: z
    .string()
    .optional()
    .describe("Group to list, e.g. 'Transactions', 'Coupons', 'Games'. Omit for every group."),
  auth: z
    .enum(["api-credentials", "customer-jwt", "none"])
    .optional()
    .describe("Only endpoints using this authentication scheme."),
};

export type ListEndpointsParams = {
  tag?: string;
  auth?: "api-credentials" | "customer-jwt" | "none";
};

export function listEndpoints({ tag, auth }: ListEndpointsParams): string {
  let endpoints = index.endpoints;

  if (tag) {
    const wanted = tag.toLowerCase();
    endpoints = endpoints.filter((e) => e.tag.toLowerCase() === wanted || e.tag.toLowerCase().includes(wanted));
    if (endpoints.length === 0) {
      return [`No group matching "${tag}".`, "", "Groups: " + index.tags.map((t) => t.name).join(", ")].join("\n");
    }
  }

  if (auth) endpoints = endpoints.filter((e) => e.auth === auth);

  if (endpoints.length === 0) return "No endpoints match those filters.";

  const groups = new Map<string, typeof endpoints>();
  for (const e of endpoints) {
    const list = groups.get(e.tag) ?? [];
    list.push(e);
    groups.set(e.tag, list);
  }

  const out = [`# ${index.apiTitle}`, ""];
  out.push(
    `Base URL: ${index.servers.map((s) => `\`${s.url}\` (${s.description})`).join(" · ")}`,
    "Every path is locale-prefixed with `lt` or `en`.",
    "",
  );

  // Preserve the sidebar order from the spec, then anything unexpected.
  const ordered = [...index.tags.map((t) => t.name).filter((n) => groups.has(n)), ...[...groups.keys()].filter((n) => !index.tags.some((t) => t.name === n))];

  for (const name of ordered) {
    const meta = index.tags.find((t) => t.name === name);
    out.push(`## ${name}`);
    if (meta?.description) out.push(`_${meta.description}_`);
    out.push("");
    for (const e of groups.get(name)!) {
      out.push(`- \`${e.method} ${e.path}\` — ${e.summary}`);
      out.push(`  id: \`${e.id}\` · auth: ${e.auth}`);
    }
    out.push("");
  }

  out.push("---");
  out.push("`get_endpoint` returns one endpoint's parameters, body, responses and a ready curl command.");

  return out.join("\n");
}

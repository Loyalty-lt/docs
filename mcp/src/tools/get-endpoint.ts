import { z } from "zod";
import { authLabel, findEndpoint, index, PRODUCTION, STAGING, type Endpoint, type Field } from "../data.js";
import { search } from "../search.js";

export const getEndpointSchema = {
  endpoint: z
    .string()
    .describe(
      "Endpoint id (e.g. 'postShopTransactionsCreate') or method and path (e.g. 'POST /shop/transactions/create')",
    ),
  environment: z
    .enum(["production", "staging"])
    .optional()
    .describe("Which base URL the example should use. Defaults to staging."),
};

export type GetEndpointParams = {
  endpoint: string;
  environment?: "production" | "staging";
};

const sample = (f: Field): unknown => {
  if (f.example !== undefined) return f.example;
  if (f.enum?.length) return f.enum[0];
  switch (f.type) {
    case "integer":
      return 1;
    case "number":
      return 0;
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "string";
  }
};

function fieldTable(title: string, fields: Field[]): string[] {
  if (fields.length === 0) return [];
  const out = [`### ${title}`, "", "| Field | Type | Required | Description |", "|---|---|---|---|"];
  for (const f of fields) {
    const type = f.enum?.length ? `${f.type} (${f.enum.join(" \\| ")})` : f.type;
    out.push(`| \`${f.name}\` | ${type} | ${f.required ? "yes" : "no"} | ${f.description.replace(/\|/g, "\\|")} |`);
  }
  out.push("");
  return out;
}

function curl(e: Endpoint, base: string): string {
  const path = e.path.replace("{locale}", "lt").replace(/\{([^}]+)\}/g, (_, name) => `<${name}>`);
  const query = e.params
    .filter((p) => p.in === "query" && p.required)
    .map((p) => `${p.name}=${String(sample(p)).replace(/^"|"$/g, "")}`)
    .join("&");

  const lines = [`curl -X ${e.method} "${base}${path}${query ? `?${query}` : ""}" \\`];

  if (e.auth === "api-credentials") {
    lines.push(`  -H "X-API-Key: $LOYALTY_API_KEY" \\`, `  -H "X-API-Secret: $LOYALTY_API_SECRET" \\`);
  } else if (e.auth === "customer-jwt") {
    lines.push(`  -H "Authorization: Bearer $TOKEN" \\`);
  }

  const headerParams = e.params.filter((p) => p.in === "header" && !/^x-api-(key|secret)$/i.test(p.name));
  for (const p of headerParams) lines.push(`  -H "${p.name}: ${String(sample(p)).replace(/^"|"$/g, "")}" \\`);

  if (e.multipart) {
    lines.push(`  -F "file=@catalogue.xml"`);
    return lines.join("\n");
  }

  const top = e.body.filter((f) => !f.name.includes("."));
  const required = top.filter((f) => f.required);
  // "Required unless user_email is given" is a real constraint the spec cannot express
  // as `required` — pick the first of each such pair so the example actually runs.
  const conditional = top.filter((f) => !f.required && /required unless/i.test(f.description));
  const chosen = required.concat(conditional.slice(0, 1));

  if (e.body.length > 0) {
    const payload = Object.fromEntries((chosen.length ? chosen : top.slice(0, 4)).map((f) => [f.name, sample(f)]));
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '${JSON.stringify(payload, null, 2).split("\n").join("\n  ")}'`);
  } else {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "");
  }

  return lines.join("\n");
}

export function getEndpoint({ endpoint, environment = "staging" }: GetEndpointParams): string {
  if (!endpoint?.trim()) return "Provide an endpoint id, or a method and path.";

  const e = findEndpoint(endpoint);

  if (!e) {
    const near = search(endpoint, "endpoints").slice(0, 5);
    return [
      `No endpoint matching "${endpoint}".`,
      "",
      near.length ? "Closest matches:" : "Use `list_endpoints` to see the whole API.",
      ...near.map((h) => `- \`${h.endpoint!.method} ${h.endpoint!.path}\` — id \`${h.endpoint!.id}\``),
    ].join("\n");
  }

  const base = environment === "production" ? PRODUCTION : STAGING;
  const out = [`# ${e.method} ${e.path}`, "", e.summary ? `**${e.summary}**` : "", e.description, ""];

  out.push(
    `- Group: ${e.tag}`,
    `- Authentication: ${authLabel[e.auth]}`,
    `- Endpoint id: \`${e.id}\``,
    `- Reference: ${index.site}${e.docsPath}`,
    "",
  );

  out.push(...fieldTable("Path and query parameters", e.params));
  out.push(...fieldTable("Request body", e.body));

  if (e.multipart) out.push("Request body is `multipart/form-data`.", "");

  if (e.responses.length) {
    out.push("### Responses", "");
    for (const r of e.responses) out.push(`- \`${r.code}\` — ${r.description}`);
    out.push("");
  }

  out.push(`### Example (${environment})`, "", "```bash", curl(e, base), "```", "");
  out.push(
    "Responses use the shared envelope: `{ success, code, message, data }` on success,",
    "`{ success: false, code, message, request_id }` on failure, plus `errors` keyed by",
    "field on HTTP 422. See `get_page` with `/docs/api-reference/overview`.",
  );

  return out.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

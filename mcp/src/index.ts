#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { index } from "./data.js";
import {
  searchDocs,
  searchDocsSchema,
  getPage,
  getPageSchema,
  listTopics,
  listTopicsSchema,
  listEndpoints,
  listEndpointsSchema,
  getEndpoint,
  getEndpointSchema,
} from "./tools/index.js";

const server = new McpServer({
  name: "loyaltylt-docs",
  version: "1.0.0",
});

const text = (body: string) => ({ content: [{ type: "text" as const, text: body }] });

server.tool(
  "search_docs",
  "Search the Loyalty.lt developer documentation — written guides and the Shop API reference — by keyword. " +
    "Use this first when you do not already know the page path or endpoint id. " +
    "Covers awarding loyalty points, loyalty cards, coupons, stamp-card games, offers, XML product import, " +
    "QR login, QR card scan and the SMS API.",
  searchDocsSchema,
  async (params) => text(searchDocs(params)),
);

server.tool(
  "get_page",
  "Fetch a written guide in full, as Markdown. Takes a docs path such as '/docs/api-reference/authentication' " +
    "or '/docs/sdk/php/usage'. For API endpoint pages use get_endpoint instead.",
  getPageSchema,
  async (params) => text(getPage(params)),
);

server.tool(
  "list_topics",
  "Browse what the documentation contains: guide sections and the API reference groups. " +
    "Call with no arguments for an overview, or pass a section to list its pages.",
  listTopicsSchema,
  async (params) => text(listTopics(params)),
);

server.tool(
  "list_endpoints",
  "List the Loyalty.lt Shop API and SMS API endpoints, grouped by feature, with their method, path and " +
    "authentication scheme. Filter by group or by authentication scheme.",
  listEndpointsSchema,
  async (params) => text(listEndpoints(params)),
);

server.tool(
  "get_endpoint",
  "Get one endpoint's full contract: parameters, request body fields with types and requiredness, responses, " +
    "the authentication it needs, and a ready-to-run curl example. Accepts an endpoint id " +
    "('postShopTransactionsCreate') or a method and path ('POST /shop/transactions/create').",
  getEndpointSchema,
  async (params) => text(getEndpoint(params)),
);

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(
    `Loyalty.lt docs MCP server ready — ${index.guides.length} guides, ${index.endpoints.length} endpoints ` +
      `(index built ${index.generatedAt})`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

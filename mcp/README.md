# Loyalty.lt Docs MCP Server

An [MCP](https://modelcontextprotocol.io) server that gives an AI assistant the
Loyalty.lt developer documentation and the full Shop API contract — so it can write a
working integration instead of guessing at endpoint names and field shapes.

Inspired by [`fumadocs-mcp`](https://github.com/k4cper-g/fumadocs-mcp), rebuilt for
our docs: the index is generated from this repository's own MDX and OpenAPI spec
rather than scraped, so it can never drift from the site it ships alongside.

## Tools

| Tool | What it does |
|------|--------------|
| `search_docs` | Keyword search across guides **and** API endpoints. Start here. |
| `get_page` | Full Markdown of a guide, e.g. `/docs/sdk/php/usage` |
| `list_topics` | Browse guide sections and API reference groups |
| `list_endpoints` | The API surface, grouped by feature, filterable by auth scheme |
| `get_endpoint` | One endpoint: parameters, body fields, responses, auth, ready curl |

`get_endpoint` accepts either an endpoint id (`postShopTransactionsCreate`) or a
method and path (`POST /shop/transactions/create`).

## Install

```bash
npx @loyaltylt/docs-mcp
```

### Claude Code

```bash
claude mcp add loyaltylt-docs -- npx -y @loyaltylt/docs-mcp
```

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
`%APPDATA%\Claude\claude_desktop_config.json` on Windows:

```json
{
  "mcpServers": {
    "loyaltylt-docs": {
      "command": "npx",
      "args": ["-y", "@loyaltylt/docs-mcp"]
    }
  }
}
```

### Cursor / Windsurf / any MCP client

Same shape — command `npx`, args `["-y", "@loyaltylt/docs-mcp"]`, stdio transport.

## Try it

> "Award 25 EUR worth of loyalty points for order ORD-1 in my Laravel checkout."

The assistant calls `search_docs` → `get_endpoint postShopTransactionsCreate` →
`get_page /docs/sdk/php/usage`, and writes the call with the right field names,
the right auth headers and the right locale prefix.

## Develop

```bash
npm install
npm run build      # regenerates the index, compiles TypeScript
npm start          # stdio server
npm run inspector  # MCP Inspector UI
```

`npm run build:index` rebuilds `src/data/index.json` from `../content/docs/**.mdx`
and `../openapi/loyalty.json`. The generated index is **not** committed — the build
produces it. Re-run it after changing a guide or regenerating the spec.

The server is a pure function of that index: no network calls, no API keys, works
offline.

## Publishing

```bash
npm run build
npm publish --access public
```

Bump `version` in `package.json` whenever the docs change materially, so clients
pinning a version get a coherent snapshot.

## License

MIT

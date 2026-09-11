# Loyalty.lt Docs (Fumadocs)

Next.js + [Fumadocs](https://fumadocs.dev) rebuild of `docs.loyalty.lt`
(replacing the old Docusaurus site). Runs on port **3098**.

## Structure

- `content/docs/**` — hand-written guides & SDK docs (MDX). Sidebar order via `meta.json`.
- API Reference — **not** committed as files. Generated virtually at runtime from
  `openapi/loyalty.json` (fumadocs-openapi `staticSource`), grouped by tag.
- `openapi/loyalty.json` — the **public** spec, built by `scripts/scope-openapi.mjs`
  from the upstream `api.loyalty.lt` spec. Scope = the `shop` and `sms` path
  prefixes only; the admin, partner-portal and marketing-site routes are dropped.
  The script also fixes the sidebar tag order and their descriptions.
  `openapi/full.json` is the cached upstream spec (delete it to refetch).

  The spec is only as truthful as the `@OA` annotations in `api.loyalty.lt`. If an
  endpoint shows up here that no route serves, fix the annotation upstream rather
  than filtering it out here — compare against `php artisan route:list`.
- `components/mintlify.tsx` — thin aliases mapping the imported docs' Mintlify
  components (`<Info>`, `<Card>`, `<Steps>`, `<Tabs>`, …) onto Fumadocs equivalents.
- `app/api/proxy` — same-origin proxy for the endpoint "try it" playground.
- `mcp/` — **`@loyaltylt/docs-mcp`**, the MCP server that exposes these docs and the
  Shop API contract to AI assistants. Its index is generated from `content/docs/**`
  and `openapi/loyalty.json`, so it cannot drift from the site. See `mcp/README.md`.

## Commands

```bash
npm install
npm run gen:openapi   # refresh openapi/loyalty.json from upstream (needs network)
npm run dev           # http://localhost:3098 (predev regenerates the spec)
npm run build         # prebuild regenerates the spec, then next build
npm run start         # serve the production build on 3098
npm run build:mcp     # rebuild the MCP server in mcp/ (index + TypeScript)
```

The repo's `.mcp.json` registers the local MCP build, so Claude Code working in this
repo can query the docs it is editing — run `npm run build:mcp` once first.

## Deploy

Production checkout is `/var/www/vhosts/loyalty.lt/docs.loyalty.lt` (git clone of
this repo, branch `main`). Deploy = push to `main`, then on the server:

```bash
cd /var/www/vhosts/loyalty.lt/docs.loyalty.lt && ./deploy/deploy.sh
```

(`git pull`, `npm ci`, `npm run build`, pm2 reload — see `deploy/deploy.sh`.)
`.env` holds the AI gateway credentials (see `.env.example`). Nginx config for
Plesk: `deploy/plesk-additional-nginx-directives.conf`.

## Updating the API reference

Endpoints track the upstream spec automatically — rerun `npm run build` (or
`npm run gen:openapi`) to pull the latest. Adjust the public scope in
`scripts/scope-openapi.mjs` (`PUBLIC_PREFIXES` / `PUBLIC_TAGS`).

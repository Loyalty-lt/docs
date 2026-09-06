import { createOpenAPI } from 'fumadocs-openapi/server';

// The scoped public spec, built by scripts/scope-openapi.mjs from the upstream
// api.loyalty.lt spec. `proxyUrl` routes "try it" requests through our own
// same-origin proxy so the browser never hits api.loyalty.lt cross-origin.
export const openapi = createOpenAPI({
  input: ['./openapi/loyalty.json'],
  proxyUrl: '/api/proxy',
});

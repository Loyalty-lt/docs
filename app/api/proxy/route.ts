import { openapi } from '@/lib/openapi';

// Same-origin proxy for the "try it" playground so the browser never calls
// api.loyalty.lt cross-origin. Allowlist prevents open-proxy (SSRF) abuse.
export const { GET, HEAD, PUT, POST, PATCH, DELETE } = openapi.createProxy({
  allowedOrigins: ['https://api.loyalty.lt'],
});

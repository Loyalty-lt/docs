'use client';
import { createOpenAPIPage } from 'fumadocs-openapi/ui';
import { withScalar } from 'fumadocs-openapi/scalar';

// Scalar powers the interactive "try it" playground for each endpoint.
export const OpenAPIPage = createOpenAPIPage(withScalar());

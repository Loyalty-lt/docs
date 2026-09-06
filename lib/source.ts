import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { defineDocs } from 'fumadocs-mdx/macro';
import { openapi } from './openapi';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    // expose processed markdown so llms.txt / llms-full.txt can emit page text
    postprocess: { includeProcessedMarkdown: true },
  },
});

// Two sources merged into one page tree: hand-written guides under
// `content/docs`, and the API Reference generated virtually from the scoped
// OpenAPI spec (openapi/loyalty.json). The `openapi` key becomes `page.type`.
export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({ groupBy: 'tag' }),
  },
  {
    baseUrl: '/docs',
    plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
  },
);

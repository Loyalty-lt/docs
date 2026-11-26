import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import { z } from 'zod';
import { i18n } from './i18n';

// The manual for partners and cashiers (Lithuanian), next to the developers' docs of lib/source.ts:
// content/manual/partners → /partners, content/manual/till → /till; page.en.mdx is the English
// page at /en/… (lib/i18n.ts).
// screen: the screen of the program a page is about (portal: its path without the language, with
// [id] for an id; till: till:<name>), for /go and for the coverage check.
const docs = defineDocs({
  dir: 'content/manual',
  docs: {
    schema: pageSchema.extend({ screen: z.union([z.string(), z.array(z.string()).min(1)]).optional() }),
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
});

export const manual = loader(docs.toFumadocsSource(), { baseUrl: '/', i18n, plugins: [lucideIconsPlugin()] });

export const screensOf = (screen: string | string[] | undefined) => (screen === undefined ? [] : [screen].flat());

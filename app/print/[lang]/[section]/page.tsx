import { mdxComponents, type Section } from '@/components/manual-page';
import { isLang } from '@/lib/i18n';
import { manual } from '@/lib/manual';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// One section of the manual as one long page, for scripts/export-pdf.mjs: every page in the menu's
// order, each from a new sheet. Not linked anywhere.
type Props = { params: Promise<{ lang: string; section: string }> };
type Node = { type: string; url?: string; index?: Node; children?: Node[] };

const TITLES = {
  lt: { partners: 'Loyalty.lt partnerių portalo vadovas', till: 'Loyalty.lt kasos vadovas' },
  en: { partners: 'Loyalty.lt partner portal guide', till: 'Loyalty.lt till guide' },
};

const urls = (n: Node): string[] => [...(n.index?.url ? [n.index.url] : []), ...(n.type === 'page' && n.url ? [n.url] : []), ...(n.children ?? []).flatMap(urls)];

export const dynamicParams = false;
export const generateStaticParams = () => ['lt', 'en'].flatMap((lang) => ['partners', 'till'].map((section) => ({ lang, section })));
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Print({ params }: Props) {
  const { lang, section } = await params;
  if (!isLang(lang) || (section !== 'partners' && section !== 'till')) notFound();
  const root = `${lang === 'en' ? '/en' : ''}/${section}`;
  const all = new Map(manual.getPages(lang).map((p) => [p.url, p]));
  const pages = [...new Set(urls(manual.getPageTree(lang) as unknown as Node))].filter((u) => u === root || u.startsWith(`${root}/`)).map((u) => all.get(u)!).filter(Boolean);
  const date = new Date().toISOString().slice(0, 10);
  return (
    <main lang={lang} className="print-book mx-auto max-w-3xl px-2">
      <section className="flex min-h-[60vh] flex-col justify-center">
        <h1 className="text-4xl font-bold tracking-tight">{TITLES[lang][section as Section]}</h1>
        <p className="mt-4 text-fd-muted-foreground">docs.loyalty.lt{root} · {date}</p>
      </section>
      {pages.map((page) => {
        const MDX = page.data.body;
        return (
          <article key={page.url} className="prose max-w-none">
            <h1>{page.data.title}</h1>
            <p className="lead text-fd-muted-foreground">{page.data.description}</p>
            <MDX components={mdxComponents(lang, page, 'https://docs.loyalty.lt')} />
          </article>
        );
      })}
    </main>
  );
}

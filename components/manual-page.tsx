import { href, isLang, type Lang } from '@/lib/i18n';
import { manual } from '@/lib/manual';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ComponentProps } from 'react';
import { PdfLink } from './pdf-link';
import { Shot } from './shot';
import { TillDownload, TillVersion } from './till-version';
import { Key, Path, Ui } from './ui';

export type Section = 'partners' | 'till';
export type ManualProps = { params: Promise<{ lang: string; slug?: string[] }> };

const pageOf = async (section: Section, { params }: ManualProps) => {
  const { lang, slug = [] } = await params;
  const page = isLang(lang) ? manual.getPage([section, ...slug], lang) : undefined;
  if (!page || !isLang(lang)) notFound();
  return { page, lang };
};

type Page = Parameters<typeof createRelativeLink>[1];

// Pages link to each other as /partners/…; in English the link stays in English. In the PDF
// (origin) every link is a full address.
const linkIn = (lang: Lang, page: Page, origin = '') => {
  const Relative = createRelativeLink(manual, page);
  return function A(props: ComponentProps<'a'>) {
    const to = props.href ?? '';
    const local = /^\/(partners|till)(\/|#|$)/.test(to) || to === '/' ? href(lang, to) : to;
    return <Relative {...props} href={local.startsWith('/') ? origin + local : local} />;
  };
};

export const mdxComponents = (lang: Lang, page: Page, origin?: string) => {
  const LangShot = (p: ComponentProps<typeof Shot>) => <Shot {...p} lang={lang} />;
  return { ...defaultMdxComponents, a: linkIn(lang, page, origin), Callout, Card, Cards, Step, Steps, Tab, Tabs, Shot: LangShot, Ui, Key, Path, TillVersion: () => <TillVersion lang={lang} />, TillDownload: (p: { os: 'windows' | 'macos' | 'linux' }) => <TillDownload {...p} lang={lang} /> };
};

export async function ManualPage({ section, ...props }: ManualProps & { section: Section }) {
  const { page, lang } = await pageOf(section, props);
  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      {page.slugs.length === 1 && <PdfLink section={section} lang={lang} />}
      <DocsBody>
        <MDX components={mdxComponents(lang, page)} />
      </DocsBody>
    </DocsPage>
  );
}

// One route file per language and section (app/(lt)/…, app/en/…): Lithuanian lives at its real
// address, not rewritten from /lt/…, so the statically made page and the browser agree on the path.
export const manualRoute = (section: Section, lang: Lang) => {
  type P = { params: Promise<{ slug?: string[] }> };
  const withLang = (p: P): ManualProps => ({ params: p.params.then((x) => ({ ...x, lang })) });
  return {
    Page: (p: P) => <ManualPage section={section} {...withLang(p)} />,
    generateStaticParams: () => manualParams(section).filter((x) => x.lang === lang).map(({ slug }) => ({ slug })),
    generateMetadata: (p: P) => manualMetadata(section, withLang(p)),
  };
};

export const manualParams = (section: Section) =>
  manual.getLanguages().flatMap(({ language, pages }) => pages.filter((p) => p.slugs[0] === section).map((p) => ({ lang: language, slug: p.slugs.slice(1) })));

export async function manualMetadata(section: Section, props: ManualProps): Promise<Metadata> {
  const { page, lang } = await pageOf(section, props);
  return {
    title: { absolute: `${page.data.title} | Loyalty.lt` },
    description: page.data.description,
    alternates: { languages: { lt: href('lt', page.url.replace(/^\/en/, '')), en: href('en', page.url.replace(/^\/en/, '')) } },
    other: { 'content-language': lang },
  };
}

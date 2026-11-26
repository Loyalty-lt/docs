import { manual } from '@/lib/manual';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import defaultMdxComponents, { createRelativeLink } from 'fumadocs-ui/mdx';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shot } from './shot';
import { TillVersion } from './till-version';
import { Key, Path, Ui } from './ui';

export type Section = 'partneriams' | 'kasa';
export type ManualProps = { params: Promise<{ slug?: string[] }> };

const pageOf = async (section: Section, { params }: ManualProps) => {
  const page = manual.getPage([section, ...((await params).slug ?? [])]);
  if (!page) notFound();
  return page;
};

export async function ManualPage({ section, ...props }: ManualProps & { section: Section }) {
  const page = await pageOf(section, props);
  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, a: createRelativeLink(manual, page), Callout, Card, Cards, Step, Steps, Tab, Tabs, Shot, Ui, Key, Path, TillVersion }} />
      </DocsBody>
    </DocsPage>
  );
}

export const manualParams = (section: Section) => manual.getPages().filter((p) => p.slugs[0] === section).map((p) => ({ slug: p.slugs.slice(1) }));

export async function manualMetadata(section: Section, props: ManualProps): Promise<Metadata> {
  const page = await pageOf(section, props);
  return { title: { absolute: `${page.data.title} | Loyalty.lt` }, description: page.data.description };
}

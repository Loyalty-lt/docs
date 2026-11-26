import { AskAI } from '@/components/ask-ai';
import { ManualProvider } from '@/components/providers';
import { isLang } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { manual } from '@/lib/manual';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const portal = lang === 'lt' ? 'Atidaryti portalą' : 'Open the portal';
  return (
    <div lang={lang}>
      <ManualProvider lang={lang}>
        <DocsLayout tree={manual.getPageTree(lang)} {...baseOptions(lang)} i18n githubUrl={undefined} links={[{ text: portal, url: 'https://partners.loyalty.lt', external: true }]}>
          {children}
          <AskAI lang={lang} />
        </DocsLayout>
      </ManualProvider>
    </div>
  );
}

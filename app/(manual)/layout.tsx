import { AskAI } from '@/components/ask-ai';
import { ManualProvider } from '@/components/providers';
import { baseOptions } from '@/lib/layout.shared';
import { manual } from '@/lib/manual';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div lang="lt">
      <ManualProvider>
        <DocsLayout tree={manual.getPageTree()} {...baseOptions()} githubUrl={undefined} links={[{ text: 'Atidaryti portalą', url: 'https://partners.loyalty.lt', external: true }]}>
          {children}
          <AskAI lang="lt" />
        </DocsLayout>
      </ManualProvider>
    </div>
  );
}

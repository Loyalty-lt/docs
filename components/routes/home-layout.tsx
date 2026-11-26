import { ManualProvider } from '@/components/providers';
import { isLang } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <div lang={lang} className="flex flex-1 flex-col">
      <ManualProvider lang={lang}>
        <HomeLayout {...baseOptions(lang)} i18n>{children}</HomeLayout>
      </ManualProvider>
    </div>
  );
}

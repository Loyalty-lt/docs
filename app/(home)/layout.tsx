import { DocsProvider } from '@/components/providers';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <DocsProvider>
      <HomeLayout {...baseOptions()}>{children}</HomeLayout>
    </DocsProvider>
  );
}

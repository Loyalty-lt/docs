import { DocsProvider } from '@/components/providers';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <DocsProvider>{children}</DocsProvider>;
}

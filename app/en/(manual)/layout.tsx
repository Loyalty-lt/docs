import ManualLayout from '@/components/routes/manual-layout';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <ManualLayout params={Promise.resolve({ lang: 'en' })}>{children}</ManualLayout>;
}

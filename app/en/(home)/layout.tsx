import HomeLayout from '@/components/routes/home-layout';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <HomeLayout params={Promise.resolve({ lang: 'en' })}>{children}</HomeLayout>;
}

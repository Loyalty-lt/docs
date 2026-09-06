import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Loyalty.lt API Documentation',
    template: '%s | Loyalty.lt Docs',
  },
  description: 'APIs, SDKs and integration guides for the Loyalty.lt platform.',
  metadataBase: new URL('https://docs.loyalty.lt'),
  icons: { icon: '/favicon.ico' },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.loyalty.lt" crossOrigin="anonymous" />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

import Link from 'next/link';
import { Code2, MonitorSmartphone, Plug, Store, type LucideIcon } from 'lucide-react';
import { href, isLang, type Lang } from '@/lib/i18n';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Way = { icon: LucideIcon; title: string; href: string; text: string; links: [string, string][] };

const WAYS: Record<Lang, { title: string; lead: string; ways: Way[] }> = {
  lt: {
    title: 'Loyalty.lt vadovai',
    lead: 'Pasirinkite, ką naudojate. Ieškoti galite visuose vadovuose iš karto – paieška viršuje.',
    ways: [
      { icon: Store, title: 'Partneriams', href: '/partners', text: 'Kaip tvarkyti parduotuves, korteles, klientus, kampanijas ir sąskaitas portale.', links: [['Pirmosios 30 minučių', '/partners/first-30-minutes'], ['Kas naujo', '/partners/whats-new'], ['Problemos', '/partners/troubleshooting']] },
      { icon: MonitorSmartphone, title: 'Kasai', href: '/till', text: 'Kaip parduoti, duoti taškus, taikyti nuolaidas ir grąžinti pinigus kasos programėlėje.', links: [['Naujam kasininkui', '/till/new-cashier'], ['Diegimas', '/till/install'], ['Problemos', '/till/troubleshooting']] },
      { icon: Plug, title: 'El. parduotuvėms', href: '/plugins', text: 'Kaip įdiegti ir prijungti WooCommerce, PrestaShop ir Shopify papildinius.', links: [['WooCommerce', '/plugins/woocommerce'], ['PrestaShop', '/plugins/prestashop'], ['Shopify', '/plugins/shopify']] },
      { icon: Code2, title: 'Programuotojams', href: '/docs', text: 'API, SDK ir integracijų vadovai (anglų kalba).', links: [['API Basics', '/docs/api-reference/overview'], ['API Reference', '/docs/loyalty-cards/getShopLoyaltyCards'], ['SDKs', '/docs/sdk/overview']] },
    ],
  },
  en: {
    title: 'Loyalty.lt guides',
    lead: 'Choose what you use. Search looks through all the guides at once – it is at the top.',
    ways: [
      { icon: Store, title: 'Partners', href: '/partners', text: 'How to manage shops, cards, customers, campaigns and invoices in the portal.', links: [['The first 30 minutes', '/partners/first-30-minutes'], ["What's new", '/partners/whats-new'], ['Troubleshooting', '/partners/troubleshooting']] },
      { icon: MonitorSmartphone, title: 'Till', href: '/till', text: 'How to sell, give points, apply discounts and refund in the till app.', links: [['New cashier', '/till/new-cashier'], ['Installing', '/till/install'], ['Troubleshooting', '/till/troubleshooting']] },
      { icon: Plug, title: 'Online shops', href: '/plugins', text: 'How to install and connect the WooCommerce, PrestaShop and Shopify plugins.', links: [['WooCommerce', '/plugins/woocommerce'], ['PrestaShop', '/plugins/prestashop'], ['Shopify', '/plugins/shopify']] },
      { icon: Code2, title: 'Developers', href: '/docs', text: 'APIs, SDKs and integration guides for points, cards, games and offers.', links: [['API Basics', '/docs/api-reference/overview'], ['API Reference', '/docs/loyalty-cards/getShopLoyaltyCards'], ['SDKs', '/docs/sdk/overview']] },
    ],
  },
};

const to = (lang: Lang, path: string) => (path.startsWith('/docs') ? path : href(lang, path));

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return {
    title: { absolute: WAYS[lang].title },
    description: WAYS[lang].lead,
    alternates: { languages: { lt: '/', en: '/en' } },
  };
}


export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const { title, lead, ways } = WAYS[lang];
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-fd-muted-foreground">{lead}</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {ways.map(({ icon: Icon, title, href: page, text, links }) => (
          <section key={page} className="relative rounded-xl border p-6 transition-colors hover:bg-fd-muted">
            <Icon className="size-6 text-fd-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">
              <Link href={to(lang, page)} className="after:absolute after:inset-0">
                {title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-fd-muted-foreground">{text}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {links.map(([label, path]) => (
                <li key={path} className="relative z-10 w-fit">
                  <Link href={to(lang, path)} className="underline underline-offset-4 hover:text-fd-primary">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

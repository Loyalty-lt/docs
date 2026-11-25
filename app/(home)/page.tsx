import Link from 'next/link';
import { Code2, MonitorSmartphone, Store, type LucideIcon } from 'lucide-react';

type Way = { icon: LucideIcon; title: string; href: string; text: string; links: [string, string][] };

const ways: Way[] = [
  {
    icon: Store,
    title: 'Partneriams',
    href: '/partneriams',
    text: 'Kaip tvarkyti parduotuves, korteles, klientus, kampanijas ir sąskaitas portale.',
    links: [],
  },
  {
    icon: MonitorSmartphone,
    title: 'Kasai',
    href: '/kasa',
    text: 'Kaip parduoti, duoti taškus, taikyti nuolaidas ir grąžinti pinigus kasos programėlėje.',
    links: [
      ['Naujam kasininkui', '/kasa/naujam-kasininkui'],
      ['Diegimas', '/kasa/diegimas'],
      ['Problemos', '/kasa/problemos'],
    ],
  },
  {
    icon: Code2,
    title: 'Developers',
    href: '/docs',
    text: 'APIs, SDKs and integration guides for points, cards, games and offers.',
    links: [
      ['API Basics', '/docs/api-reference/overview'],
      ['API Reference', '/docs/loyalty-cards/getShopLoyaltyCards'],
      ['SDKs', '/docs/sdk/overview'],
    ],
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Loyalty.lt vadovai</h1>
      <p className="mt-4 max-w-xl text-fd-muted-foreground">
        Pasirinkite, ką naudojate. Ieškoti galite visuose vadovuose iš karto – paieška viršuje.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {ways.map(({ icon: Icon, title, href, text, links }) => (
          <section key={href} className="relative rounded-xl border p-6 transition-colors hover:bg-fd-muted">
            <Icon className="size-6 text-fd-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">
              <Link href={href} className="after:absolute after:inset-0">
                {title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-fd-muted-foreground">{text}</p>
            {links.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {links.map(([label, to]) => (
                  <li key={to} className="relative z-10 w-fit">
                    <Link href={to} className="underline underline-offset-4 hover:text-fd-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

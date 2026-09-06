import Link from 'next/link';

const cards = [
  { title: 'API Basics', href: '/docs/api-reference/overview', desc: 'Authentication, error handling, staging — start here.' },
  { title: 'API Reference', href: '/docs/shop-points/shopGetCardBalance', desc: 'Every Shop, Partner & SMS endpoint with a live playground.' },
  { title: 'SDKs', href: '/docs/sdk/overview', desc: 'JavaScript / TypeScript, PHP and Python client libraries.' },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="mb-4 rounded-full border px-3 py-1 text-xs font-medium text-fd-muted-foreground">
        Loyalty.lt Developer Platform
      </span>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Build loyalty into your product
      </h1>
      <p className="mt-4 max-w-xl text-fd-muted-foreground">
        APIs, SDKs and integration guides for points, loyalty cards, games, offers and QR
        authentication across the Loyalty.lt platform.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/docs" className="rounded-lg bg-fd-primary px-5 py-2.5 font-medium text-fd-primary-foreground">
          Get started
        </Link>
        <Link href="/docs/sdk/overview" className="rounded-lg border px-5 py-2.5 font-medium">
          Browse SDKs
        </Link>
      </div>
      <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border p-5 text-left transition-colors hover:bg-fd-muted"
          >
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-fd-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

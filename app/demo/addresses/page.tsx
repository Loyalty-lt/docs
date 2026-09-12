'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Gyvas adresų widget'o demo.
 *
 * Puslapis įkelia tą patį `/widget/loyalty-address.js`, kurį gauna partneris —
 * ne kopiją ir ne React perrašymą. Jei demo veikia, veikia ir tai, ką jis
 * įsideda į savo atsiskaitymo formą.
 *
 * Kviečiam viešą paieškos endpointą: raktas naršyklėje nelaikomas, o gamyboje
 * partneris rodo į savo serverio proxy — apie tai sako ir kodo pavyzdys žemiau.
 */
declare global {
  interface Window {
    LoyaltyAddress?: {
      attach: (target: string | HTMLElement, options: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

type Selected = {
  code: number;
  full_address: string;
  postal_code: string | null;
  street?: { name: string; display_name?: string } | null;
  locality?: { name: string } | null;
  municipality?: { name: string } | null;
};

const SNIPPET = `<input id="address" placeholder="Gatvė ir namo numeris">
<input id="city" placeholder="Miestas">
<input id="postal" placeholder="Pašto kodas">

<script src="https://docs.loyalty.lt/widget/loyalty-address.js"><\/script>
<script>
  LoyaltyAddress.attach('#address', {
    // Gamyboje — tavo serverio proxy, kuris prideda X-API-Key ir X-API-Secret.
    endpoint: '/api/address-search',
    fields: { city: '#city', postalCode: '#postal' },
    onSelect: (a) => console.log(a.code, a.postal_code),
  });
<\/script>`;

export default function AddressWidgetDemo() {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const attached = useRef(false);

  useEffect(() => {
    if (attached.current) return;

    const script = document.createElement('script');
    script.src = '/widget/loyalty-address.js';
    script.onload = () => {
      if (!window.LoyaltyAddress || attached.current) return;
      attached.current = true;

      const started = { at: 0 };
      const input = document.getElementById('demo-address') as HTMLInputElement | null;
      input?.addEventListener('input', () => { started.at = performance.now(); });

      window.LoyaltyAddress.attach('#demo-address', {
        endpoint: 'https://api.loyalty.lt/lt/addresses/search',
        credentials: 'omit',
        fields: { city: '#demo-city', postalCode: '#demo-postal', municipality: '#demo-municipality' },
        onSelect: (address: Selected) => {
          setSelected(address);
          if (started.at) setElapsed(Math.round(performance.now() - started.at));
        },
      });
    };
    document.body.appendChild(script);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Address widget</h1>
      <p className="mt-3 text-fd-muted-foreground">
        One input, backed by the Lithuanian address register. Type a street — say{' '}
        <code>Gedimino pr 9</code> or, with a typo, <code>Gedmino pr 9</code> — and pick a suggestion.
        The postal code and city fill themselves.
      </p>

      <div className="mt-8 space-y-4 rounded-xl border p-6">
        <div className="space-y-1.5">
          <label htmlFor="demo-address" className="text-sm font-medium">Address</label>
          <input
            id="demo-address"
            placeholder="Gedimino pr 9"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fd-primary/40"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['demo-city', 'City'],
            ['demo-postal', 'Postal code'],
            ['demo-municipality', 'Municipality'],
          ].map(([id, label]) => (
            <div key={id} className="space-y-1.5">
              <label htmlFor={id} className="text-sm font-medium">{label}</label>
              <input
                id={id}
                readOnly
                placeholder="—"
                className="w-full rounded-md border bg-fd-muted/40 px-3 py-2 text-sm outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="mt-6 rounded-xl border p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">What the API returned</h2>
            {elapsed !== null && (
              <span className="text-xs text-fd-muted-foreground">{elapsed} ms from keystroke to result</span>
            )}
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-fd-muted/50 p-4 text-xs">
            {JSON.stringify(selected, null, 2)}
          </pre>
          <p className="mt-3 text-xs text-fd-muted-foreground">
            <code>code</code> is the register&apos;s own address code — store it and the record can always be
            matched back to the source.
          </p>
        </div>
      )}

      <h2 className="mt-12 text-lg font-semibold">Put it on your page</h2>
      <pre className="mt-3 overflow-x-auto rounded-lg border bg-fd-muted/50 p-4 text-xs">{SNIPPET}</pre>

      <p className="mt-4 text-sm text-fd-muted-foreground">
        The widget never holds a credential: anything a browser holds is public. Your server proxies the
        call with <code>X-API-Key</code> and <code>X-API-Secret</code>. This demo page calls the open
        endpoint that our own apps use, which is why it works without one.
      </p>

      <p className="mt-6 text-sm">
        <a className="underline" href="/docs/api-reference/addresses">Address API reference →</a>
      </p>
    </main>
  );
}

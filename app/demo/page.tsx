'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Pusher from 'pusher-js';

/**
 * A working till, wired to the staging API, embedded in the docs at /docs/demo.
 *
 * The whole sale runs: ring items up, identify the customer with a QR code or the
 * nine digits beside it, spend their points, take payment, and post the transaction
 * that awards the new balance. Every frame the channel delivers is printed.
 *
 * The product list is local on purpose — a real till has its own catalogue, and
 * Loyalty.lt does not supply one. Everything to do with loyalty is a live call.
 *
 * Nothing here holds a credential: /api/demo keeps them server-side.
 */

const CATALOGUE = [
  { id: 101, name: 'Espresso', price: 2.2 },
  { id: 102, name: 'Flat white', price: 3.1 },
  { id: 103, name: 'Filter coffee', price: 2.6 },
  { id: 104, name: 'Croissant', price: 2.4 },
  { id: 105, name: 'Cinnamon bun', price: 2.9 },
  { id: 106, name: 'Beans 250 g', price: 8.9 },
  { id: 107, name: 'Beans 500 g', price: 14.5 },
  { id: 108, name: 'Ceramic mug', price: 6.0 },
];

type Stage = 'waiting' | 'identified' | 'paid';
type Line = { id: number; name: string; price: number; qty: number };

interface Redemption {
  enabled?: boolean;
  points_per_currency?: number;
  currency_amount?: number;
  min_points?: number;
  max_points?: number;
}
interface Card {
  loyalty_card_id?: number;
  card_number?: string;
  points?: number;
  user?: { id?: number; name?: string; email?: string };
  redemption?: Redemption;
}

const eur = (n: number) => `€${n.toFixed(2)}`;

export default function Till() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [shopName, setShopName] = useState('Demo shop');
  const [realtime, setRealtime] = useState<Record<string, never> | null>(null);

  const [stage, setStage] = useState<Stage>('waiting');
  const [lines, setLines] = useState<Line[]>([]);
  const [session, setSession] = useState<{ id: string; qrCode: string; manualCode: string; expiresAt: string } | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [spendPoints, setSpendPoints] = useState(0);
  const [payment, setPayment] = useState<'card' | 'cash'>('card');
  const [receipt, setReceipt] = useState<{
    ok: boolean;
    message?: string | null;
    errors?: Record<string, string[]> | null;
    data?: Record<string, unknown> | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [basketSession, setBasketSession] = useState<string | null>(null);
  const [phone, setPhone] = useState<{ loyaltyCardId: number; cardNumber: string; name: string; points: number } | null>(null);
  const [phoneBasket, setPhoneBasket] = useState<Record<string, unknown> | null>(null);
  const [phonePoints, setPhonePoints] = useState(0);
  const [log, setLog] = useState<{ at: string; event: string; payload: unknown }[]>([]);

  const pusherRef = useRef<Pusher | null>(null);

  const append = useCallback((event: string, p: unknown) => {
    setLog((prev) => [{ at: new Date().toTimeString().slice(0, 8), event, payload: p }, ...prev].slice(0, 8));
  }, []);

  // ---- money ---------------------------------------------------------------
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.qty * l.price, 0), [lines]);

  const rules = card?.redemption;
  const rate = (rules?.points_per_currency ?? 0) / (rules?.currency_amount || 1); // points per €1
  const maxSpendable = useMemo(() => {
    if (!rules?.enabled || !rate) return 0;
    const byBalance = card?.points ?? 0;
    const byBasket = Math.floor(subtotal * rate);
    const byRule = rules.max_points ?? Infinity;
    return Math.max(0, Math.min(byBalance, byBasket, byRule));
  }, [rules, rate, card, subtotal]);

  const discount = rate ? Math.min(subtotal, spendPoints / rate) : 0;
  const total = Math.max(0, subtotal - discount);

  // ---- boot ----------------------------------------------------------------
  useEffect(() => {
    fetch('/api/demo')
      .then((r) => r.json())
      .then((d) => {
        setConfigured(Boolean(d.configured));
        setShopName(d.shopName ?? 'Demo shop');
        setRealtime(d.realtime ?? null);
      })
      .catch(() => setConfigured(false));

    // Who the phone panel is playing.
    fetch('/api/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'demo-customer' }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.loyaltyCardId) setPhone(d); })
      .catch(() => {});
    return () => pusherRef.current?.disconnect();
  }, []);

  // ---- basket --------------------------------------------------------------
  const add = (p: (typeof CATALOGUE)[number]) =>
    setLines((prev) => {
      const at = prev.findIndex((l) => l.id === p.id);
      if (at === -1) return [...prev, { ...p, qty: 1 }];
      const next = [...prev];
      next[at] = { ...next[at], qty: next[at].qty + 1 };
      return next;
    });

  const bump = (id: number, by: number) =>
    setLines((prev) => prev.flatMap((l) => (l.id !== id ? [l] : l.qty + by <= 0 ? [] : [{ ...l, qty: l.qty + by }])));

  const newSale = () => {
    if (basketSession && card?.user?.id) {
      fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close-basket', sessionId: basketSession, userId: card.user.id }),
      }).catch(() => {});
    }
    setBasketSession(null);
    pusherRef.current?.disconnect();
    setStage('waiting');
    setLines([]);
    setSession(null);
    setCard(null);
    setSpendPoints(0);
    setReceipt(null);
    setLog([]);
  };

  // ---- charge --------------------------------------------------------------
  const charge = async () => {
    setBusy(true);
    try {
      const body = {
        action: 'charge',
        userId: card?.user?.id,
        orderTotal: total,
        pointsRedeemed: spendPoints || undefined,
        pointsDiscount: spendPoints ? Number(discount.toFixed(2)) : undefined,
        paymentMethod: payment,
        items: lines,
      };
      append('POST /shop/transactions/create', { order_total: body.orderTotal, points_redeemed: body.pointsRedeemed });
      const r = await (
        await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      ).json();
      append(r.ok ? 'transaction created' : 'transaction failed', r.errors ?? r.message ?? r.data);
      setReceipt(r);
      if (r.ok) setStage('paid');
    } finally {
      setBusy(false);
    }
  };

  // ---- the phone panel acts as the customer --------------------------------
  const scanWithPhone = useCallback(async () => {
    if (!session || !phone) return;
    append('phone: scanning', { session_id: session.id, card: phone.cardNumber });
    const r = await (
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate-scan', sessionId: session.id, loyaltyCardId: phone.loyaltyCardId }),
      })
    ).json();
    if (!r.ok) append('phone: scan failed', r.message);
  }, [session, phone, append]);

  // What the customer chooses to spend goes back on the session channel as theirs.
  const phoneSpend = useCallback(
    async (points: number) => {
      setPhonePoints(points);
      if (!basketSession) return;
      await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'basket-update',
          sessionId: basketSession,
          pointsToRedeem: points,
          updatedBy: 'customer',
        }),
      }).catch(() => {});
    },
    [basketSession],
  );

  // ---- the customer's phone follows the basket -----------------------------
  // Same thing the POS app does: open a shopping session and the app puts its basket
  // screen up. Whatever the customer chooses to spend comes back on the channel.
  const openBasket = useCallback(
    async (c: Card) => {
      if (!c.loyalty_card_id) return;
      try {
        const r = await (
          await fetch('/api/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'open-basket', loyaltyCardId: c.loyalty_card_id, purchaseAmount: subtotal }),
          })
        ).json();
        if (!r.sessionId) throw new Error(r.error ?? 'could not open the basket');

        setBasketSession(r.sessionId);
        append('session_created → customer app', { session_id: r.sessionId, channel: r.channel });

        const ch = pusherRef.current?.subscribe(`shopping-session.${r.sessionId}`);
        ch?.bind('session_update', (p: Record<string, unknown>) => {
          append(`session_update ← ${p.lastUpdatedBy}`, p);
          if (p.lastUpdatedBy === 'staff') setPhoneBasket(p);   // the phone's screen
          // Only react to the customer's own edits; our own echo comes back too.
          if (p.lastUpdatedBy !== 'customer') return;
          const chosen = Number(p.pointsToRedeem ?? p.customerPointsInput ?? 0);
          if (!Number.isNaN(chosen)) setSpendPoints(chosen);
          if (typeof p.paymentMethod === 'string' && (p.paymentMethod === 'cash' || p.paymentMethod === 'card')) {
            setPayment(p.paymentMethod);
          }
        });
      } catch (e) {
        append('basket error', String(e));
      }
    },
    [append, subtotal],
  );

  // ---- the code is up from the start ---------------------------------------
  // A customer walks up and scans before anything is rung through, so the till shows
  // the code the moment it is open rather than hiding it behind a basket.
  const identify = useCallback(async () => {
    if (!realtime) return;
    try {
      const s = await (
        await fetch('/api/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open-session' }),
        })
      ).json();
      if (!s.sessionId) throw new Error(s.error ?? 'could not open a session');

      setSession({ id: s.sessionId, qrCode: s.qrCode, manualCode: s.manualCode, expiresAt: s.expiresAt });
      append('session opened', { session_id: s.sessionId, manual_code: s.manualCode });

      const { key, host, port, scheme } = realtime as unknown as Record<string, string | number>;
      const pusher = new Pusher(String(key), {
        wsHost: String(host),
        wsPort: Number(port),
        wssPort: Number(port),
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        cluster: '',
        disableStats: true,
      } as never);
      pusherRef.current = pusher;

      pusher.connection.bind('connected', () => append('websocket connected', { host, port }));

      pusher.connection.bind('error', (e: unknown) => append('websocket error', e));

      const ch = pusher.subscribe(`qr-card.${s.sessionId}`);
      ch.bind('card_identified', async (p: { card_data?: Card }) => {
        append('card_identified', p);
        const c = p.card_data ?? {};
        setCard(c);
        setStage('identified');
        await openBasket(c);
      });
      ch.bind('status_update', (p: { status?: string }) => {
        append('status_update', p);
        if (p.status === 'expired') setSession(null);   // the effect opens a fresh one
      });
    } catch (e) {
      append('error', String(e));
    }
  }, [realtime, append]);

  // Open one as soon as we can, and again whenever a sale ends.
  useEffect(() => {
    if (realtime && stage === 'waiting' && !session) identify();
  }, [realtime, stage, session, identify]);

  // Mirror the basket onto the customer's screen as it changes.
  useEffect(() => {
    if (!basketSession || stage !== 'identified') return;
    const id = setTimeout(() => {
      fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'basket-update',
          sessionId: basketSession,
          purchaseAmount: Number(subtotal.toFixed(2)),
          pointsToRedeem: spendPoints,
          status: 'editing',
        }),
      }).catch(() => {});
    }, 300); // one call per pause, not one per tap
    return () => clearTimeout(id);
  }, [basketSession, stage, subtotal, spendPoints]);

  // countdown while the code is up
  useEffect(() => {
    if (!session?.expiresAt || stage !== 'waiting') return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((Date.parse(session.expiresAt) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, stage]);

  if (configured === false) {
    return (
      <Shell shopName="Demo">
        <p style={{ color: '#9aa8a2', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          The demo till is not configured on this deployment. It needs a <strong>staging</strong> API
          key and secret in <code>LOYALTY_DEMO_API_KEY</code> and <code>LOYALTY_DEMO_API_SECRET</code>.
        </p>
      </Shell>
    );
  }

  return (
    <Shell shopName={shopName}>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(200px, 1fr) minmax(250px, 1.15fr)' }}>
        {/* ------------------------------------------------ catalogue */}
        <section style={panel}>
          <h2 style={label}>Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 6 }}>
            {CATALOGUE.map((p) => (
              <button key={p.id} onClick={() => add(p)} disabled={stage === 'paid'} style={tile}>
                <span style={{ fontSize: 11, lineHeight: 1.25 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: '#E6FD5A', fontWeight: 700 }}>{eur(p.price)}</span>
              </button>
            ))}
          </div>

          <h2 style={{ ...label, marginTop: 14 }}>Basket</h2>
          {lines.length === 0 ? (
            <p style={muted}>Tap a product to ring it up.</p>
          ) : (
            lines.map((l) => (
              <div key={l.id} style={row}>
                <span style={{ flex: 1, color: '#DCEFF0' }}>{l.name}</span>
                <button style={qtyBtn} onClick={() => bump(l.id, -1)} disabled={stage === 'paid'}>
                  −
                </button>
                <span style={{ width: 18, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{l.qty}</span>
                <button style={qtyBtn} onClick={() => bump(l.id, 1)} disabled={stage === 'paid'}>
                  +
                </button>
                <span style={{ width: 52, textAlign: 'right' }}>{eur(l.qty * l.price)}</span>
              </div>
            ))
          )}

          <div style={{ borderTop: '1px solid #2c4d43', marginTop: 10, paddingTop: 8 }}>
            <div style={row}>
              <span style={{ flex: 1 }}>Subtotal</span>
              <span>{eur(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ ...row, color: '#E6FD5A' }}>
                <span style={{ flex: 1 }}>Points discount</span>
                <span>−{eur(discount)}</span>
              </div>
            )}
            <div style={{ ...row, fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              <span style={{ flex: 1 }}>Total</span>
              <span style={{ color: '#E6FD5A' }}>{eur(total)}</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ right column */}
        <section style={panel}>
          {stage === 'waiting' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ ...label, justifyContent: 'center', display: 'flex' }}>Scan to collect points</h2>
              {session ? (
                <>
                  <div style={{ background: '#fff', padding: 9, borderRadius: 10, display: 'inline-block' }}>
                    {/* Rendered by the platform's own GET /qr, not a third-party image
                        service — a session id should not leave our infrastructure. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.loyalty.lt/qr?size=132&data=${encodeURIComponent(session.qrCode)}`}
                      alt="Scan to collect points"
                      width={132}
                      height={132}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <div style={{ ...label, marginTop: 10 }}>or type this in the app</div>
                  <div style={code}>{session.manualCode}</div>
                  <div style={{ fontSize: 11, color: '#9aa8a2', marginTop: 6 }}>
                    {secondsLeft !== null && secondsLeft > 0
                      ? `Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
                      : 'Renewing…'}
                  </div>
                </>
              ) : (
                <p style={muted}>Opening a session…</p>
              )}
              <p style={{ ...muted, marginTop: 10 }}>
                Ring items up while the customer scans — the order does not matter. Charging
                without a customer works too; nobody earns points.
              </p>
              {lines.length > 0 && (
                <button style={primary} onClick={charge} disabled={busy || total <= 0}>
                  {busy ? 'Posting…' : `Charge ${eur(total)} without points`}
                </button>
              )}
            </div>
          )}

          {stage === 'identified' && card && (
            <>
              <h2 style={label}>Customer</h2>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{card.user?.name ?? card.user?.email ?? 'Identified'}</div>
              <div style={{ ...muted, marginTop: 2 }}>
                Card {card.card_number} · balance <strong style={{ color: '#E6FD5A' }}>{card.points ?? 0}</strong> points
              </div>

              {maxSpendable > 0 ? (
                <>
                  <h2 style={{ ...label, marginTop: 14 }}>Spend points</h2>
                  <input
                    type="range"
                    min={0}
                    max={maxSpendable}
                    step={rules?.min_points || 1}
                    value={spendPoints}
                    onChange={(e) => setSpendPoints(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#E6FD5A' }}
                  />
                  <div style={{ ...row, fontSize: 12 }}>
                    <span style={{ flex: 1, color: '#9aa8a2' }}>
                      {spendPoints} of {maxSpendable} points
                    </span>
                    <span style={{ color: '#E6FD5A' }}>−{eur(discount)}</span>
                  </div>
                </>
              ) : (
                <p style={{ ...muted, marginTop: 10 }}>
                  {rules?.enabled ? 'Not enough points to redeem on this basket.' : 'Redemption is off for this partner.'}
                </p>
              )}

              <h2 style={{ ...label, marginTop: 14 }}>Payment</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['card', 'cash'] as const).map((m) => (
                  <button key={m} onClick={() => setPayment(m)} style={m === payment ? chipOn : chip}>
                    {m === 'card' ? 'Card' : 'Cash'}
                  </button>
                ))}
              </div>

              <button style={primary} onClick={charge} disabled={busy || total <= 0}>
                {busy ? 'Posting…' : `Charge ${eur(total)}`}
              </button>
            </>
          )}

          {stage === 'paid' && (
            <>
              <h2 style={label}>{receipt?.ok ? 'Paid' : 'Failed'}</h2>
              {receipt?.ok ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#E6FD5A' }}>{eur(total)}</div>
                  <p style={{ ...muted, marginTop: 6 }}>
                    Paid by {payment}. {spendPoints > 0 ? `${spendPoints} points spent. ` : ''}
                    The transaction is posted; the API awarded points from the order total using this
                    partner&apos;s rules.
                  </p>
                  <pre style={pre}>{JSON.stringify(receipt.data, null, 2).slice(0, 600)}</pre>
                </>
              ) : (
                <pre style={pre}>{JSON.stringify(receipt?.errors ?? receipt?.message, null, 2)}</pre>
              )}
              <button style={primary} onClick={newSale}>
                New sale
              </button>
            </>
          )}
        </section>

        {/* ------------------------------------------------ the customer's phone */}
        <section style={{ ...panel, gridColumn: '1 / -1', borderColor: '#E6FD5A33' }}>
          <h2 style={label}>Customer&apos;s phone — the app, played by this page</h2>
          {!phone ? (
            <p style={muted}>Looking the demo customer up…</p>
          ) : (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 170 }}>
                <div style={{ fontWeight: 700 }}>{phone.name}</div>
                <div style={muted}>
                  {phone.cardNumber} · {phone.points} points
                </div>
                {stage === 'waiting' && session && (
                  <button style={primary} onClick={scanWithPhone}>
                    Scan the code
                  </button>
                )}
              </div>

              {phoneBasket ? (
                <div style={{ flex: 1, minWidth: 190 }}>
                  <div style={label}>What the customer sees</div>
                  <div style={{ ...row, fontSize: 15, fontWeight: 700 }}>
                    <span style={{ flex: 1 }}>To pay</span>
                    <span style={{ color: '#E6FD5A' }}>
                      €{Number(phoneBasket.purchaseAmount ?? 0).toFixed(2)}
                    </span>
                  </div>
                  {maxSpendable > 0 && (
                    <>
                      <div style={{ ...label, marginTop: 8 }}>Spend my points</div>
                      <input
                        type="range"
                        min={0}
                        max={maxSpendable}
                        value={phonePoints}
                        onChange={(e) => phoneSpend(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#E6FD5A' }}
                      />
                      <div style={{ ...muted, fontSize: 11 }}>
                        {phonePoints} points → the till updates as you drag
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p style={{ ...muted, flex: 1, minWidth: 190 }}>
                  Nothing yet. Scan, and the basket screen opens here the same way it opens in
                  the app — over <code>user.{'{id}'}</code>.
                </p>
              )}
            </div>
          )}
          <p style={{ ...muted, marginTop: 10, fontSize: 11 }}>
            The real app talks to production and could not resolve a staging session, so this
            panel plays the customer over the same staging channels using the staging-only
            <code> qr-card/&#123;id&#125;/simulate-scan</code> endpoint.
          </p>
        </section>

        {/* ------------------------------------------------ frames */}
        <section style={{ ...panel, gridColumn: '1 / -1' }}>
          <h2 style={label}>Channel frames and API calls</h2>
          <pre style={{ ...pre, maxHeight: 140 }}>
            {log.length === 0 ? 'waiting…' : log.map((l) => `${l.at}  ${l.event}\n${JSON.stringify(l.payload)}`).join('\n\n')}
          </pre>
        </section>
      </div>
    </Shell>
  );
}

function Shell({ shopName, children }: { shopName: string; children: React.ReactNode }) {
  return (
    <main style={shell}>
      <header style={header}>
        <strong style={{ fontSize: 13 }}>{shopName}</strong>
        <span style={{ fontSize: 11, color: '#9aa8a2' }}>Till 3 · staging</span>
      </header>
      {children}
    </main>
  );
}

const shell: React.CSSProperties = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  background: '#19352D',
  color: '#DCEFF0',
  minHeight: '100vh',
  padding: 12,
  boxSizing: 'border-box',
};
const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 9,
  marginBottom: 11,
  borderBottom: '1px solid #2c4d43',
};
const panel: React.CSSProperties = { background: '#14291F', borderRadius: 10, padding: 11, border: '1px solid #2c4d43' };
const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: '#9aa8a2',
  margin: '0 0 7px',
  fontWeight: 600,
};
const muted: React.CSSProperties = { fontSize: 12, color: '#9aa8a2', margin: 0, lineHeight: 1.5 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '3px 0' };
const tile: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '8px 6px',
  borderRadius: 8,
  border: '1px solid #2c4d43',
  background: '#0C3A30',
  color: '#DCEFF0',
  cursor: 'pointer',
  textAlign: 'left',
};
const qtyBtn: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 5,
  border: '1px solid #2c4d43',
  background: '#0C3A30',
  color: '#DCEFF0',
  cursor: 'pointer',
  lineHeight: 1,
};
const primary: React.CSSProperties = {
  marginTop: 12,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#E6FD5A',
  color: '#0C3A30',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};
const ghost: React.CSSProperties = {
  marginTop: 10,
  width: '100%',
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid #2c4d43',
  background: 'transparent',
  color: '#9aa8a2',
  fontSize: 12,
  cursor: 'pointer',
};
const chip: React.CSSProperties = {
  flex: 1,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #2c4d43',
  background: 'transparent',
  color: '#9aa8a2',
  fontSize: 12,
  cursor: 'pointer',
};
const chipOn: React.CSSProperties = { ...chip, background: '#0C3A30', color: '#E6FD5A', borderColor: '#E6FD5A55', fontWeight: 600 };
const code: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: 3,
  color: '#E6FD5A',
  fontVariantNumeric: 'tabular-nums',
};
const pre: React.CSSProperties = {
  background: '#0d1f18',
  color: '#9fd6c4',
  padding: 9,
  borderRadius: 8,
  fontSize: 10.5,
  lineHeight: 1.5,
  maxHeight: 170,
  overflow: 'auto',
  margin: '8px 0 0',
};

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { QRCodeSVG } from 'qrcode.react';

/**
 * A till, wired to the staging API, embedded in the docs at /docs/demo.
 *
 * It opens a QR card session the moment it loads — the way a real terminal sits
 * waiting — and shows the code two ways: scannable, and nine digits the customer can
 * read out if their camera will not cooperate. Every frame that arrives on the channel
 * is printed, so the realtime path is something you watch rather than read about.
 *
 * Nothing here holds a credential. The session id from /api/demo is all a public
 * channel needs.
 */

const BASKET = [
  { name: 'Espresso blend, 250 g', qty: 1, price: 8.9 },
  { name: 'Filter blend, 500 g', qty: 1, price: 14.5 },
  { name: 'Ceramic mug', qty: 2, price: 6.0 },
];

const TOTAL = BASKET.reduce((sum, i) => sum + i.qty * i.price, 0);

type Status = 'booting' | 'waiting' | 'identified' | 'expired' | 'error';

interface Card {
  loyalty_card_id?: number;
  card_number?: string;
  points?: number;
  user?: { name?: string; email?: string };
}

export default function Till() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [shopName, setShopName] = useState('Demo shop');
  const [status, setStatus] = useState<Status>('booting');
  const [session, setSession] = useState<{ qrCode: string; manualCode: string; expiresAt: string } | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [log, setLog] = useState<{ at: string; event: string; payload: unknown }[]>([]);
  const pusherRef = useRef<Pusher | null>(null);

  const append = useCallback((event: string, payload: unknown) => {
    setLog((prev) => [{ at: new Date().toTimeString().slice(0, 8), event, payload }, ...prev].slice(0, 8));
  }, []);

  const open = useCallback(async () => {
    setStatus('booting');
    setCard(null);
    setSession(null);
    pusherRef.current?.disconnect();

    try {
      const boot = await (await fetch('/api/demo')).json();
      setConfigured(Boolean(boot.configured));
      if (!boot.configured) return;
      setShopName(boot.shopName ?? 'Demo shop');
      if (!boot.realtime) throw new Error('realtime config unavailable');

      const s = await (
        await fetch('/api/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'open-session' }),
        })
      ).json();
      if (!s.sessionId) throw new Error(s.error ?? 'could not open a session');

      setSession({ qrCode: s.qrCode, manualCode: s.manualCode, expiresAt: s.expiresAt });
      append('session opened', { session_id: s.sessionId, manual_code: s.manualCode });

      const { key, host, port, scheme } = boot.realtime;
      const pusher = new Pusher(key, {
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        cluster: '',
        disableStats: true,
      } as never);
      pusherRef.current = pusher;

      pusher.connection.bind('connected', () => {
        append('websocket connected', { host, port });
        setStatus('waiting');
      });
      pusher.connection.bind('error', (e: unknown) => {
        append('websocket error', e);
        setStatus('error');
      });

      const channel = pusher.subscribe(`qr-card.${s.sessionId}`);
      channel.bind('card_identified', (p: { card_data?: Card }) => {
        append('card_identified', p);
        setCard(p.card_data ?? {});
        setStatus('identified');
      });
      channel.bind('status_update', (p: { status?: string }) => {
        append('status_update', p);
        if (p.status === 'expired') setStatus('expired');
      });
    } catch (error) {
      append('error', String(error));
      setStatus('error');
    }
  }, [append]);

  useEffect(() => {
    open();
    return () => pusherRef.current?.disconnect();
  }, [open]);

  // Countdown to the five-minute expiry, so the screen is honest about the window.
  useEffect(() => {
    if (!session?.expiresAt || status === 'identified') return;
    const tick = () => {
      const left = Math.max(0, Math.round((Date.parse(session.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session, status]);

  if (configured === false) {
    return (
      <Frame shopName="Demo">
        <p style={{ color: '#9aa8a2', margin: 0, fontSize: 13, lineHeight: 1.6 }}>
          The demo till is not configured on this deployment. It needs a <strong>staging</strong>{' '}
          API key and secret in <code>LOYALTY_DEMO_API_KEY</code> and <code>LOYALTY_DEMO_API_SECRET</code>.
        </p>
      </Frame>
    );
  }

  return (
    <Frame shopName={shopName}>
      <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'minmax(210px, 1fr) minmax(230px, 1.1fr)' }}>
        {/* receipt */}
        <section style={panel}>
          <h2 style={label}>Basket</h2>
          {BASKET.map((i) => (
            <div key={i.name} style={line}>
              <span style={{ color: '#DCEFF0' }}>
                {i.qty > 1 ? `${i.qty} × ` : ''}
                {i.name}
              </span>
              <span>€{(i.qty * i.price).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ ...line, borderTop: '1px solid #2c4d43', marginTop: 8, paddingTop: 8, fontSize: 18, fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: '#E6FD5A' }}>€{TOTAL.toFixed(2)}</span>
          </div>

          {card ? (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#0C3A30', border: '1px solid #E6FD5A55' }}>
              <div style={{ ...label, marginBottom: 6 }}>Customer</div>
              <div style={{ fontWeight: 600 }}>{card.user?.name ?? card.user?.email ?? 'Identified'}</div>
              <div style={{ fontSize: 12, color: '#9aa8a2', marginTop: 2 }}>
                Card {card.card_number} · {card.points ?? 0} points
              </div>
              <button style={charge} onClick={() => append('would call', { endpoint: 'POST /lt/shop/transactions/create', order_total: TOTAL, loyalty_card_id: card.loyalty_card_id })}>
                Charge €{TOTAL.toFixed(2)}
              </button>
            </div>
          ) : null}
        </section>

        {/* identify */}
        <section style={{ ...panel, textAlign: 'center' }}>
          <h2 style={{ ...label, justifyContent: 'center', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: dot(status) }} />
            {status === 'identified' ? 'Customer identified' : status === 'expired' ? 'Code expired' : status === 'error' ? 'Connection problem' : status === 'booting' ? 'Opening…' : 'Scan to collect points'}
          </h2>

          {session && status !== 'identified' ? (
            <>
              <div style={{ background: '#fff', padding: 10, borderRadius: 10, display: 'inline-block' }}>
                <QRCodeSVG value={session.qrCode} size={150} />
              </div>

              <div style={{ ...label, marginTop: 12, justifyContent: 'center' }}>or type this in the app</div>
              <div style={code}>{session.manualCode}</div>

              <div style={{ fontSize: 11, color: '#9aa8a2', marginTop: 8 }}>
                {secondsLeft !== null && secondsLeft > 0
                  ? `Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
                  : 'Expired'}
              </div>
            </>
          ) : null}

          {status === 'expired' || status === 'error' ? (
            <button style={charge} onClick={open}>
              New code
            </button>
          ) : null}
        </section>

        {/* frames */}
        <section style={{ ...panel, gridColumn: '1 / -1' }}>
          <h2 style={label}>Channel frames</h2>
          <pre style={pre}>
            {log.length === 0
              ? 'waiting…'
              : log.map((l) => `${l.at}  ${l.event}\n${JSON.stringify(l.payload)}`).join('\n\n')}
          </pre>
        </section>
      </div>
    </Frame>
  );
}

function Frame({ shopName, children }: { shopName: string; children: React.ReactNode }) {
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

const dot = (s: Status) =>
  s === 'identified' ? '#E6FD5A' : s === 'expired' || s === 'error' ? '#f87171' : '#4ade80';

const shell: React.CSSProperties = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  background: '#19352D',
  color: '#DCEFF0',
  minHeight: '100vh',
  padding: 14,
  boxSizing: 'border-box',
};
const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: 10,
  marginBottom: 12,
  borderBottom: '1px solid #2c4d43',
};
const panel: React.CSSProperties = { background: '#14291F', borderRadius: 10, padding: 12, border: '1px solid #2c4d43' };
const label: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  color: '#9aa8a2',
  margin: '0 0 8px',
  fontWeight: 600,
};
const line: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' };
const code: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: 3,
  color: '#E6FD5A',
  fontVariantNumeric: 'tabular-nums',
};
const charge: React.CSSProperties = {
  marginTop: 10,
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: 'none',
  background: '#E6FD5A',
  color: '#0C3A30',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};
const pre: React.CSSProperties = {
  background: '#0d1f18',
  color: '#9fd6c4',
  padding: 10,
  borderRadius: 8,
  fontSize: 10.5,
  lineHeight: 1.5,
  maxHeight: 150,
  overflow: 'auto',
  margin: 0,
};

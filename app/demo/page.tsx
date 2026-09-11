'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { QRCodeSVG } from 'qrcode.react';

/**
 * A working storefront wired to the staging API, embedded in the docs at
 * /docs/demo. It exists to show the realtime path end to end: the server opens a
 * QR login session, this page subscribes to the public channel, and every frame
 * that arrives is printed as it lands.
 *
 * Nothing here holds a credential — the session id from /api/demo is all the
 * browser needs, which is the whole point of a public channel.
 */

const BASKET = [
  { name: 'Espresso, 250 g', price: 8.9 },
  { name: 'Filter blend, 500 g', price: 14.5 },
  { name: 'Ceramic mug', price: 12.0 },
];

const TOTAL = BASKET.reduce((sum, item) => sum + item.price, 0);

type Status = 'idle' | 'connecting' | 'waiting' | 'scanned' | 'authenticated' | 'expired' | 'failed' | 'error';

const LABEL: Record<Status, string> = {
  idle: 'Ready',
  connecting: 'Opening a session…',
  waiting: 'Waiting for a scan',
  scanned: 'Scanned — confirm in the app',
  authenticated: 'Signed in',
  expired: 'QR code expired',
  failed: 'Login failed',
  error: 'Something went wrong',
};

const TONE: Record<Status, string> = {
  idle: '#6b7280',
  connecting: '#6b7280',
  waiting: '#0C3A30',
  scanned: '#b45309',
  authenticated: '#15803d',
  expired: '#b91c1c',
  failed: '#b91c1c',
  error: '#b91c1c',
};

interface LogLine {
  at: string;
  event: string;
  payload: unknown;
}

export default function DemoStorefront() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [qr, setQr] = useState<{ sessionId: string; qrCode: string } | null>(null);
  const [customer, setCustomer] = useState<{ name?: string; email?: string } | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const pusherRef = useRef<Pusher | null>(null);

  const append = useCallback((event: string, payload: unknown) => {
    setLog((prev) => [{ at: new Date().toISOString().slice(11, 19), event, payload }, ...prev].slice(0, 12));
  }, []);

  useEffect(() => {
    fetch('/api/demo')
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => setConfigured(false));

    return () => pusherRef.current?.disconnect();
  }, []);

  const start = useCallback(async () => {
    setStatus('connecting');
    setCustomer(null);
    setLog([]);
    pusherRef.current?.disconnect();

    try {
      const boot = await (await fetch('/api/demo')).json();
      if (!boot.realtime) throw new Error('no realtime config');

      const session = await (
        await fetch('/api/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'qr-login' }),
        })
      ).json();
      if (!session.sessionId) throw new Error(session.error ?? 'no session');

      setQr({ sessionId: session.sessionId, qrCode: session.qrCode });
      append('session opened', { session_id: session.sessionId, expires_at: session.expiresAt });

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
      pusher.connection.bind('error', (e: unknown) => append('websocket error', e));

      pusher.subscribe(`qr-login.${session.sessionId}`).bind('status_update', (payload: Record<string, unknown>) => {
        append('status_update', payload);
        const next = String(payload.status ?? '');
        if (next === 'scanned') setStatus('scanned');
        if (next === 'expired') setStatus('expired');
        if (next === 'failed') setStatus('failed');
        if (next === 'authenticated') {
          setStatus('authenticated');
          setCustomer((payload.user as { name?: string; email?: string }) ?? {});
        }
      });
    } catch (error) {
      append('error', String(error));
      setStatus('error');
    }
  }, [append]);

  if (configured === null) return <Shell><p style={{ color: '#6b7280' }}>Loading…</p></Shell>;

  if (!configured) {
    return (
      <Shell>
        <p style={{ color: '#6b7280', margin: 0 }}>
          The demo storefront is not configured on this deployment. It needs a{' '}
          <strong>staging</strong> API key and secret in <code>LOYALTY_DEMO_API_KEY</code> and{' '}
          <code>LOYALTY_DEMO_API_SECRET</code>.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <section>
          <h2 style={h2}>Basket</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px' }}>
            {BASKET.map((item) => (
              <li key={item.name} style={row}>
                <span>{item.name}</span>
                <span>€{item.price.toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div style={{ ...row, fontWeight: 600, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <span>Total</span>
            <span>€{TOTAL.toFixed(2)}</span>
          </div>

          <button onClick={start} style={button} disabled={status === 'connecting'}>
            {status === 'idle' ? 'Sign in with Loyalty.lt' : 'Start over'}
          </button>

          <p style={{ ...small, marginTop: 12 }}>
            Scan with the Loyalty.lt app to complete it. Without the app you will still see the
            socket connect, and the <code>expired</code> event arrive after five minutes.
          </p>
        </section>

        <section>
          <h2 style={h2}>
            <span style={{ ...pill, background: TONE[status] }} />
            {LABEL[status]}
          </h2>

          {qr && status !== 'authenticated' ? (
            <div style={{ background: '#fff', padding: 12, borderRadius: 8, width: 'fit-content' }}>
              <QRCodeSVG value={qr.qrCode} size={168} />
            </div>
          ) : null}

          {customer ? (
            <p style={{ margin: '8px 0 0' }}>
              Signed in as <strong>{customer.name ?? customer.email ?? 'customer'}</strong>. Points for
              this order would be awarded with <code>POST /shop/transactions/create</code>.
            </p>
          ) : null}
        </section>

        <section style={{ gridColumn: '1 / -1' }}>
          <h2 style={h2}>Frames, as they arrive</h2>
          {log.length === 0 ? (
            <p style={small}>Nothing yet.</p>
          ) : (
            <pre style={pre}>
              {log.map((l, i) => `${l.at}  ${l.event}\n${JSON.stringify(l.payload, null, 2)}`).join('\n\n')}
            </pre>
          )}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        padding: 20,
        maxWidth: 880,
        margin: '0 auto',
        color: '#19352D',
        background: '#EBF3EE',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </main>
  );
}

const h2: React.CSSProperties = { fontSize: 15, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 };
const small: React.CSSProperties = { fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.5 };
const pill: React.CSSProperties = { width: 8, height: 8, borderRadius: 999, display: 'inline-block' };
const button: React.CSSProperties = {
  marginTop: 14,
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#0C3A30',
  color: '#E6FD5A',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
const pre: React.CSSProperties = {
  background: '#19352D',
  color: '#DCEFF0',
  padding: 12,
  borderRadius: 8,
  fontSize: 11,
  lineHeight: 1.5,
  maxHeight: 260,
  overflow: 'auto',
  margin: 0,
};

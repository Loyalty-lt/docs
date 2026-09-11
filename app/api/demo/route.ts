import { NextResponse } from 'next/server';

/**
 * Server side of the POS demo at /demo.
 *
 * It exists to hold the staging API credentials. The browser never sees them —
 * exactly the split the docs recommend: the server opens the session, the page
 * subscribes to the public channel with the returned session id.
 *
 * Staging only. The base URL is hardcoded so a production credential could not be
 * used here even by accident.
 */

const BASE = 'https://staging-api.loyalty.lt/lt/shop';

const KEY = process.env.LOYALTY_DEMO_API_KEY;
const SECRET = process.env.LOYALTY_DEMO_API_SECRET;
const SHOP_ID = Number(process.env.LOYALTY_DEMO_SHOP_ID ?? 1);

const configured = () => Boolean(KEY && SECRET);

async function callApi(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'X-API-Key': KEY!,
      'X-API-Secret': SECRET!,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  return { status: res.status, body: await res.json().catch(() => null) };
}

export async function GET() {
  if (!configured()) return NextResponse.json({ configured: false });

  const [realtime, shops] = await Promise.all([callApi('/realtime/config'), callApi('/shops')]);

  const shop = (shops.body?.data ?? []).find((s: { id: number }) => s.id === SHOP_ID);

  // Only the public connection details cross to the browser — never the credentials.
  return NextResponse.json({
    configured: true,
    shopId: SHOP_ID,
    shopName: shop?.name ?? 'Demo shop',
    realtime: realtime.body?.data ?? null,
  });
}

export async function POST(request: Request) {
  if (!configured()) return NextResponse.json({ error: 'demo not configured' }, { status: 503 });

  const { action } = await request.json().catch(() => ({ action: null }));

  if (action !== 'open-session') {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }

  // The till identifies whoever is standing in front of it — that is qr-card, not
  // qr-login. It resolves with the card and its balance.
  const { status, body } = await callApi('/qr-card/generate', {
    method: 'POST',
    body: JSON.stringify({ device_name: 'Docs demo till', shop_id: SHOP_ID }),
  });

  if (status !== 200) {
    return NextResponse.json({ error: body?.message ?? 'could not open a session' }, { status: 502 });
  }

  const data = body?.data ?? {};
  return NextResponse.json({
    sessionId: data.session_id,
    qrCode: data.qr_code,
    manualCode: data.manual_code,
    expiresAt: data.expires_at,
  });
}

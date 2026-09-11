import { NextResponse } from 'next/server';

/**
 * Server side of the POS demo at /demo.
 *
 * It holds the staging API credentials so the browser never has to. That split is
 * what the docs recommend for any public page: the server opens sessions and posts
 * transactions, the page subscribes to the public channel with the session id.
 *
 * Staging only. The base URL is hardcoded so a production credential could not be
 * used here even by accident.
 */

const BASE = 'https://staging-api.loyalty.lt/lt/shop';

const KEY = process.env.LOYALTY_DEMO_API_KEY;
const SECRET = process.env.LOYALTY_DEMO_API_SECRET;
// The credential decides the partner; the shop is picked from what that partner has,
// so a stale LOYALTY_DEMO_SHOP_ID cannot point at someone else's shop.
const SHOP_ID_HINT = process.env.LOYALTY_DEMO_SHOP_ID ? Number(process.env.LOYALTY_DEMO_SHOP_ID) : null;
let resolvedShopId: number | null = null;

async function shopId(): Promise<number> {
  if (resolvedShopId) return resolvedShopId;
  const { body } = await callApi('/shops');
  const shops: { id: number }[] = body?.data ?? [];
  const hinted = SHOP_ID_HINT ? shops.find((s) => s.id === SHOP_ID_HINT) : undefined;
  resolvedShopId = (hinted ?? shops[0])?.id ?? SHOP_ID_HINT ?? 1;
  return resolvedShopId;
}

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

  const [realtime, shops, id] = await Promise.all([callApi('/realtime/config'), callApi('/shops'), shopId()]);
  const shop = (shops.body?.data ?? []).find((s: { id: number }) => s.id === id);

  // Only the public connection details cross to the browser — never the credentials.
  return NextResponse.json({
    configured: true,
    shopId: id,
    shopName: shop?.name ?? 'Demo shop',
    realtime: realtime.body?.data ?? null,
  });
}

export async function POST(request: Request) {
  if (!configured()) return NextResponse.json({ error: 'demo not configured' }, { status: 503 });

  const payload = await request.json().catch(() => ({}));

  // --- identify whoever is standing at the till -------------------------------
  if (payload.action === 'open-session') {
    // A till identifies a customer — that is qr-card, not qr-login. It resolves with
    // the card, its balance and the redemption rules the discount is computed from.
    const { status, body } = await callApi('/qr-card/generate', {
      method: 'POST',
      body: JSON.stringify({ device_name: 'Docs demo till', shop_id: await shopId() }),
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

  // --- open the live basket on the customer's phone ---------------------------
  if (payload.action === 'open-basket') {
    // The same flow the POS app runs: the customer's app opens its basket screen and
    // follows along, and the points they choose to spend come back on the channel.
    const { status, body } = await callApi('/shopping-sessions', {
      method: 'POST',
      body: JSON.stringify({
        loyalty_card_id: payload.loyaltyCardId,
        shop_id: await shopId(),
        staff_name: 'Docs demo till',
        purchase_amount: payload.purchaseAmount ?? 0,
      }),
    });

    if (status !== 200) {
      return NextResponse.json({ error: body?.message ?? 'could not open the basket' }, { status: 502 });
    }

    const data = body?.data ?? {};
    return NextResponse.json({
      sessionId: data.session_id,
      channel: data.channel,
      pointsRules: data.points_rules ?? null,
    });
  }

  // --- push a basket change ---------------------------------------------------
  if (payload.action === 'basket-update') {
    const { sessionId, purchaseAmount, calculatedPoints, pointsToRedeem, paymentMethod, status: state } = payload;
    const { status, body } = await callApi(`/shopping-sessions/${encodeURIComponent(sessionId)}/update`, {
      method: 'POST',
      body: JSON.stringify({
        ...(purchaseAmount !== undefined ? { purchase_amount: purchaseAmount } : {}),
        ...(calculatedPoints !== undefined ? { calculated_points: calculatedPoints } : {}),
        ...(pointsToRedeem !== undefined ? { points_to_redeem: pointsToRedeem } : {}),
        ...(paymentMethod ? { payment_method: paymentMethod } : {}),
        ...(state ? { status: state } : {}),
      }),
    });
    return NextResponse.json({ ok: status === 200, message: body?.message ?? null });
  }

  // --- put the basket screen away ---------------------------------------------
  if (payload.action === 'close-basket') {
    const { status } = await callApi(
      `/shopping-sessions/${encodeURIComponent(payload.sessionId)}?user_id=${payload.userId}`,
      { method: 'DELETE' },
    );
    return NextResponse.json({ ok: status === 200 });
  }

  // --- take the money ---------------------------------------------------------
  if (payload.action === 'charge') {
    const { userId, orderTotal, pointsRedeemed, pointsDiscount, items, paymentMethod } = payload;

    if (!userId || !orderTotal) {
      return NextResponse.json({ error: 'userId and orderTotal are required' }, { status: 400 });
    }

    // The one call every integration makes. Points are awarded from order_total using
    // the partner's rules; points_redeemed reports what the customer spent here.
    const { status, body } = await callApi('/transactions/create', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        order_id: `DEMO-${Date.now()}`,
        order_total: Number(orderTotal.toFixed(2)),
        currency: 'EUR',
        shop_id: await shopId(),
        description: `Docs demo till · ${paymentMethod ?? 'card'}`,
        ...(pointsRedeemed ? { points_redeemed: pointsRedeemed, points_discount_amount: pointsDiscount } : {}),
        cart_items: (items ?? []).map((i: { id: number; name: string; qty: number; price: number }) => ({
          product_id: i.id,
          product_name: i.name,
          quantity: i.qty,
          unit_price: i.price,
          total_price: Number((i.qty * i.price).toFixed(2)),
        })),
      }),
    });

    // The request body is echoed back so the demo can show exactly what was sent.
    return NextResponse.json({
      ok: status === 200 || status === 201,
      status,
      message: body?.message ?? null,
      errors: body?.errors ?? null,
      data: body?.data ?? null,
    });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

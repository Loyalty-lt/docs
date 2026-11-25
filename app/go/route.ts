import { manual, screensOf } from '@/lib/manual';
import { NextResponse, type NextRequest } from 'next/server';

// The programs' "Pagalba" links: /go?from=/shops/8 → the page about that screen.
export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('from') ?? '';
  const from = raw.replace(/^\/(lt|en)(?=\/|$)/, '').replace(/\/(\d+|[0-9a-f-]{36}|[A-Z0-9]{8,})(?=\/|$)/g, '/[id]').replace(/\/$/, '') || '/';
  let best: { url: string; length: number } | null = null;
  for (const page of manual.getPages()) {
    for (const screen of screensOf(page.data.screen)) {
      if ((from === screen || from.startsWith(`${screen}/`)) && (!best || screen.length > best.length)) best = { url: page.url, length: screen.length };
    }
  }
  const base = request.headers.get('x-forwarded-host') ? `https://${request.headers.get('x-forwarded-host')}` : request.nextUrl.origin;
  return NextResponse.redirect(new URL(best?.url ?? (from.startsWith('kasa') ? '/kasa' : '/partneriams'), base), 307);
}

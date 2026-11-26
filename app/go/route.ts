import { href, type Lang } from '@/lib/i18n';
import { manual, screensOf } from '@/lib/manual';
import { NextResponse, type NextRequest } from 'next/server';

// The programs' "Help" links: /go?from=/lt/shops/8 → the page about that screen, in the language of
// the portal (its path starts with it) or ?lang=en.
export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('from') ?? '';
  const lang: Lang = request.nextUrl.searchParams.get('lang') === 'en' || /^\/en(\/|$)/.test(raw) ? 'en' : 'lt';
  const from = raw.replace(/^\/(lt|en)(?=\/|$)/, '').replace(/\/(\d+|[0-9a-f-]{36}|[A-Z0-9]{8,})(?=\/|$)/g, '/[id]').replace(/\/$/, '') || '/';
  let best: { url: string; length: number } | null = null;
  // The screens are named on the Lithuanian pages; the English page has the same address under /en.
  for (const page of manual.getPages('lt')) {
    for (const screen of screensOf(page.data.screen)) {
      if ((from === screen || from.startsWith(`${screen}/`)) && (!best || screen.length > best.length)) best = { url: href(lang, page.url), length: screen.length };
    }
  }
  const base = request.headers.get('x-forwarded-host') ? `https://${request.headers.get('x-forwarded-host')}` : request.nextUrl.origin;
  return NextResponse.redirect(new URL(best?.url ?? href(lang, from.startsWith('till') ? '/till' : '/partners'), base), 307);
}

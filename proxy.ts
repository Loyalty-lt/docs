import { NextResponse, type NextRequest } from 'next/server';
import { OLD_ADDRESSES } from './lib/old-addresses';

// Lithuanian lives at the plain address (app/(lt)), English under /en (app/en). /lt/… goes to the
// plain address, and the old Lithuanian addresses (/kasa/klientas, used by tills up to 1.6.15) to
// the new English ones.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const go = (to: string) => NextResponse.redirect(new URL(to + search, request.url), 308);

  const old = pathname.match(/^\/(en\/)?(kasa|partneriams)(?:\/([a-z0-9-]+))?\/?$/);
  if (old) {
    const [section, pages] = OLD_ADDRESSES[old[2] as keyof typeof OLD_ADDRESSES];
    const page = old[3] ? (pages as Record<string, string>)[old[3]] ?? old[3] : '';
    return go(`${old[1] ? '/en' : ''}/${section}${page ? `/${page}` : ''}`);
  }
  return go(pathname.slice(3) || '/');
}

export const config = {
  matcher: ['/lt', '/lt/:path*', '/(kasa|partneriams)', '/(kasa|partneriams)/:path*', '/en/(kasa|partneriams)', '/en/(kasa|partneriams)/:path*'],
};

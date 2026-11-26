import { Download } from 'lucide-react';

// The newest till, as the tills themselves learn it: the same update feed, so it never goes stale.
// Read again every 5 minutes, so a release shows here soon after the tills get it.
const KINDS = {
  windows: { platform: 'windows', name: 'Windows', file: '.exe' },
  // One DMG for every Mac; the feed keeps it under x86_64.
  macos: { platform: 'darwin', name: 'macOS', file: '.dmg' },
  linux: { platform: 'linux', name: 'Linux', file: '.tar.gz' },
} as const;
type Os = keyof typeof KINDS;

async function latest(os: Os) {
  const { platform } = KINDS[os];
  try {
    const res = await fetch(`https://api.loyalty.lt/lt/partner-staff/updates/latest?current_version=0.0.0&platform=${platform}&arch=x86_64`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { version?: string; pub_date?: string; platforms?: Record<string, { x86_64?: { url?: string } }> };
    return j.version ? { version: j.version, date: j.pub_date?.slice(0, 10), url: j.platforms?.[platform]?.x86_64?.url || null } : null;
  } catch {
    return null;
  }
}

export async function TillVersion({ lang = 'lt' }: { lang?: 'lt' | 'en' }) {
  const t = await latest('windows');
  if (!t) return null;
  return (
    <p>
      {lang === 'en' ? 'The newest till version: ' : 'Naujausia kasos versija: '}
      <strong>{t.version}</strong>
      {t.date ? `${lang === 'en' ? ', released ' : ', išleista '}${t.date}` : ''}.
    </p>
  );
}

// The installer of the newest version for one system.
export async function TillDownload({ os, lang = 'lt' }: { os: Os; lang?: 'lt' | 'en' }) {
  const t = await latest(os);
  const { name, file } = KINDS[os];
  if (!t?.url) {
    return <p>{lang === 'en' ? 'The download is not available right now. Try again later, or use the till in the browser: staff.loyalty.lt.' : 'Atsisiuntimas šiuo metu nepasiekiamas. Pabandykite vėliau arba naudokite kasą naršyklėje: staff.loyalty.lt.'}</p>;
  }
  return (
    <a href={t.url} className="not-prose my-2 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-fd-accent">
      <Download className="size-4" aria-hidden />
      {lang === 'en' ? `Download for ${name}` : `Atsisiųsti ${name}`}
      <span className="font-normal text-fd-muted-foreground">
        {t.version} · {file}
      </span>
    </a>
  );
}

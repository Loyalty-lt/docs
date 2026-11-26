// The newest till, as the tills themselves learn it: the same update feed, so it never goes stale.
const FEED = 'https://api.loyalty.lt/lt/partner-staff/updates/latest?current_version=0.0.0&platform=windows&arch=x86_64';

export async function TillVersion({ lang = 'lt' }: { lang?: 'lt' | 'en' }) {
  try {
    const res = await fetch(FEED, { next: { revalidate: 900 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const { version, pub_date: date } = (await res.json()) as { version?: string; pub_date?: string };
    if (!version) return null;

    return (
      <p>
        {lang === 'en' ? 'The newest till version: ' : 'Naujausia kasos versija: '}
        <strong>{version}</strong>
        {date ? `${lang === 'en' ? ', released ' : ', išleista '}${date.slice(0, 10)}` : ''}.
      </p>
    );
  } catch {
    return null;
  }
}

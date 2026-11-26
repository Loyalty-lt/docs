import { Download } from 'lucide-react';

// The newest release of a shop plugin, from the same API the loyalty.lt website reads.
// Read again every 5 minutes, so a new release shows here without republishing the guide.
type Plugin = 'woocommerce' | 'prestashop' | 'opencart' | 'magento' | 'virtuemart';

async function latest(plugin: Plugin) {
  try {
    const res = await fetch(`https://api.loyalty.lt/lt/site/integrations/${plugin}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const { data } = (await res.json()) as { data?: { version?: string; download_url?: string | null; release_date?: string } };
    return data?.version && data.download_url ? { version: data.version, url: data.download_url, date: data.release_date } : null;
  } catch {
    return null;
  }
}

export async function PluginDownload({ plugin, lang = 'lt' }: { plugin: Plugin; lang?: 'lt' | 'en' }) {
  const p = await latest(plugin);
  if (!p) {
    return (
      <p>
        {lang === 'en' ? 'The download is not available right now. Try again later or get it from ' : 'Atsisiuntimas šiuo metu nepasiekiamas. Pabandykite vėliau arba atsisiųskite iš '}
        <a href={`https://loyalty.lt/${lang}/business#integrations`}>loyalty.lt</a>.
      </p>
    );
  }
  return (
    <a href={p.url} download className="not-prose my-2 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-fd-accent">
      <Download className="size-4" aria-hidden />
      {lang === 'en' ? 'Download' : 'Atsisiųsti'}
      <span className="font-normal text-fd-muted-foreground">
        {p.version}
        {p.date ? ` · ${p.date}` : ''} · {p.url.split('/').pop()}
      </span>
    </a>
  );
}

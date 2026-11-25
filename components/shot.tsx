import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

// An annotated screenshot made by shots/run.ts: the picture (click to enlarge) and, under it, what
// each number on it is. The numbers and their texts live with the shot's spec (shots/specs/*.ts),
// so the picture and the list never disagree.
type Mark = { n: number; label: string; text: string };
type Entry = { file: string; w: number; h: number; alt: string; marks: Mark[] };

// Read when the page renders (not bundled), so new screenshots show without a rebuild.
const manifest = () => JSON.parse(readFileSync(path.join(process.cwd(), 'shots/manifest.json'), 'utf8')) as Record<string, Entry>;

export function Shot({ id, legend = true, caption }: { id: string; legend?: boolean; caption?: string }) {
  const s = manifest()[id];
  if (!s) return <div className="my-6 rounded-xl border border-dashed border-fd-border p-6 text-sm text-fd-muted-foreground">Nuotraukos „{id}“ dar nėra (npm run shots).</div>;
  // A narrow picture (a phone, a close-up) is shown at its own size, not blown up to the column.
  const narrow = s.w < 620;
  return (
    <figure className="not-prose my-6">
      <div className="overflow-hidden rounded-xl border border-fd-border bg-white shadow-sm" style={narrow ? { maxWidth: s.w } : undefined}>
        <ImageZoom src={`/shots/${s.file}`} alt={s.alt} zoomInProps={{ src: `/shots/${s.file}` }}>
          <img
            src={`/shots/${s.file}`}
            srcSet={`/shots/${id}.1x.webp ${s.w}w, /shots/${s.file} ${s.w * 2}w`}
            sizes={narrow ? `${s.w}px` : '(min-width: 1280px) 760px, (min-width: 768px) 70vw, 100vw'}
            width={s.w}
            height={s.h}
            alt={s.alt}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
        </ImageZoom>
      </div>
      {caption && <figcaption className="mt-2 text-sm text-fd-muted-foreground">{caption}</figcaption>}
      {legend && s.marks.length > 0 && (
        <ol className="mt-4 flex flex-col gap-2 text-[15px] leading-relaxed">
          {s.marks.map((m) => (
            <li key={m.n} className="flex gap-3">
              <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E4572E] text-xs font-bold text-white ring-2 ring-white">{m.n}</span>
              <span><span className="sr-only">{m.n}. </span><strong>{m.label}</strong>{m.text ? <> — {m.text}</> : null}</span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

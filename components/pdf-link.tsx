import { existsSync } from 'node:fs';
import path from 'node:path';
import { FileDown } from 'lucide-react';

// The whole section as one PDF (made by scripts/export-pdf.mjs), on the section's first page.
export function PdfLink({ section, lang }: { section: 'partners' | 'till' | 'plugins'; lang: 'lt' | 'en' }) {
  const file = `/pdf/loyalty-lt-${section}-${lang}.pdf`;
  if (!existsSync(path.join(process.cwd(), 'public', file))) return null;
  const text = lang === 'lt' ? 'Atsisiųsti visą vadovą (PDF)' : 'Download the whole guide (PDF)';
  return (
    <a href={file} download className="not-prose mt-4 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-fd-accent">
      <FileDown className="size-4" aria-hidden />
      {text}
    </a>
  );
}

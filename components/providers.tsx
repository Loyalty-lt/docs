import { defineI18nUI } from 'fumadocs-ui/i18n';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import { i18n, type Lang } from '@/lib/i18n';

// Fumadocs' own words in Lithuanian, for the manual: the library looks a word up together with the
// place it is used in, "Search(search trigger)".
const LT: Record<string, string> = {
  'Choose a language(language switcher)': 'Pasirinkite kalbą',
  'Choose a language(language switcher)(aria-label)': 'Pasirinkite kalbą',
  'Close Sidebar(aria-label)': 'Uždaryti meniu',
  'Close Sidebar(sidebar)(aria-label)': 'Uždaryti meniu',
  'Dark(theme switcher)(aria-label)': 'Tamsus',
  'Last updated on(edit page)': 'Atnaujinta',
  'Last updated on(page footer)': 'Atnaujinta',
  'Light(theme switcher)(aria-label)': 'Šviesus',
  'Next Page(pagination)': 'Kitas puslapis',
  'On this page(table of contents)': 'Šiame puslapyje',
  'Open Search(search trigger)(aria-label)': 'Atidaryti paiešką',
  'Open Sidebar(sidebar)(aria-label)': 'Atidaryti meniu',
  'Open(page actions)': 'Atidaryti',
  'Page Not Found(404 page)': 'Puslapis nerastas',
  'Previous Page(pagination)': 'Ankstesnis puslapis',
  'Search(search dialog)': 'Ieškoti',
  'Search(search trigger)': 'Ieškoti',
  'Show Sidebar': 'Rodyti meniu',
  'Show Sidebar(sidebar)': 'Rodyti meniu',
  'System(theme switcher)(aria-label)': 'Kaip sistemoje',
  'Table of Contents(inline table of contents)': 'Turinys',
  'Toggle Menu(mobile menu)(aria-label)': 'Meniu',
  'Toggle Theme(theme switcher)(aria-label)': 'Keisti šviesų ar tamsų vaizdą',
};

export function DocsProvider({ children }: { children: ReactNode }) {
  return <RootProvider>{children}</RootProvider>;
}

const ui = defineI18nUI(i18n, { lt: { displayName: 'Lietuvių', ...LT }, en: { displayName: 'English' } });

// The manual and the home page, in their language, with the language switch.
export function ManualProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <RootProvider i18n={ui.provider(lang)} search={{ options: { api: '/api/search/manual' } }}>
      {children}
    </RootProvider>
  );
}

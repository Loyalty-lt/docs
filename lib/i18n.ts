import { defineI18n } from 'fumadocs-core/i18n';

// The manual and the home page: Lithuanian at the plain address, English under /en. The addresses
// themselves are English in both. The developers' docs (/docs) stay English and outside of this.
export const i18n = defineI18n({
  languages: ['lt', 'en'],
  defaultLanguage: 'lt',
  hideLocale: 'default-locale',
  parser: 'dot',
});

export type Lang = (typeof i18n.languages)[number];
export const isLang = (v: string | undefined): v is Lang => (i18n.languages as string[]).includes(v ?? '');
/** The site address of a manual path in a language: /partners/shops, /en/partners/shops. */
export const href = (lang: Lang, path: string) => (lang === 'lt' ? path : `/en${path === '/' ? '' : path}`);

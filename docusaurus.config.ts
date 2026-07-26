import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

// Ported from the previous Mintlify `docs.json`. `routeBasePath: '/'` keeps every
// existing URL intact — `/api-reference/authentication` stays where it was — and
// the assets kept their `/images/...` and `/logo/...` paths by moving into `static/`.

const config: Config = {
  title: 'Loyalty.lt API Documentation',
  tagline: 'Loyalty platform APIs, SDKs and integration guides',
  favicon: 'favicon.svg',

  url: 'https://docs.loyalty.lt',
  baseUrl: '/',

  organizationName: 'Loyalty-lt',
  projectName: 'docs',

  // These are inherited content gaps, not migration damage: the Mintlify site
  // linked to ~30 pages that were never written. See BROKEN-LINKS.md.
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // All three faces come from the org CDN as woff2 (see custom.css), so the only
  // hint the browser needs is an early connection to it.
  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://cdn.loyalty.lt', crossorigin: 'anonymous' },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Loyalty-lt/docs/tree/main/',
          docItemComponent: '@theme/ApiItem',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'openapi',
        docsPluginId: 'classic',
        config: {
          loyalty: {
            // The spec lives in `static/` so it keeps its old public URL,
            // https://docs.loyalty.lt/api-reference/openapi.json, which external
            // tooling (Postman imports, codegen) already points at.
            specPath: 'static/api-reference/openapi.json',
            outputDir: 'docs/api-explorer',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
            hideSendButton: false,
          },
        },
      },
    ],
  ],

  themes: ['docusaurus-theme-openapi-docs'],

  themeConfig: {
    image: 'images/hero-light.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      // No title text: the CDN logo is already a wordmark, so a text title next
      // to it duplicated the brand name.
      logo: {
        alt: 'Loyalty.lt',
        // Served from the org CDN, same as the loyalty.lt navbar. `logo_light.png`
        // is byte-identical to the wordmark in Downloads; `logo_dark.png` is the
        // light-on-dark variant.
        src: 'https://cdn.loyalty.lt/loyalty-public/logo/logo_light.png',
        srcDark: 'https://cdn.loyalty.lt/loyalty-public/logo/logo_dark.png',
        width: 140,
        height: 30,
      },
      items: [
        { type: 'docSidebar', sidebarId: 'guidesSidebar', position: 'left', label: 'Guides' },
        { type: 'docSidebar', sidebarId: 'apiSidebar', position: 'left', label: 'API Reference' },
        { type: 'docSidebar', sidebarId: 'sdkSidebar', position: 'left', label: 'SDKs' },
        { type: 'docSidebar', sidebarId: 'apiExplorerSidebar', position: 'left', label: 'API Explorer' },
        {
          href: 'https://partners.loyalty.lt',
          label: 'Partners Portal',
          position: 'right',
          className: 'navbar-primary-button',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'API Reference', to: '/api-reference/overview' },
            { label: 'SDKs', to: '/sdk/overview' },
          ],
        },
        {
          title: 'Loyalty.lt',
          items: [
            { label: 'Website', href: 'https://loyalty.lt' },
            { label: 'Partners Portal', href: 'https://partners.loyalty.lt' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/Loyalty-lt' },
            { label: 'LinkedIn', href: 'https://linkedin.com/company/loyalty-lt' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Loyalty.lt`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['php', 'python', 'bash', 'json', 'dart', 'swift', 'kotlin', 'ruby', 'java'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

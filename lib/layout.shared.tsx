import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { gitConfig, logo } from './shared';

export function baseOptions(lang: 'lt' | 'en' = 'en'): BaseLayoutProps {
  return {
    nav: {
      url: lang === 'lt' ? '/' : '/en',
      title: (
        <>
          {/* CDN wordmark; light-on-dark variant swaps in for dark theme */}
          <img src={logo.light} alt="Loyalty.lt" width={128} height={27} className="h-[27px] w-auto dark:hidden" />
          <img src={logo.dark} alt="Loyalty.lt" width={128} height={27} className="hidden h-[27px] w-auto dark:block" />
        </>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}`,
    links: [
      {
        text: lang === 'lt' ? 'Partnerių portalas' : 'Partners Portal',
        url: 'https://partners.loyalty.lt',
        external: true,
      },
    ],
  };
}

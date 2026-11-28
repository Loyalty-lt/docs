'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Tas pats Loyalty.lt pagalbos pokalbis kaip loyalty.lt ir partnerių sistemoje.
const WIDGET_SRC = 'https://api.loyalty.lt/widget/v1/loyalty-widget.js';
const SCRIPT_ID = 'loyalty-chat-widget';

declare global {
  interface Window {
    LoyaltyChat?: { init: (config: { locale?: 'lt' | 'en'; articleBaseUrl?: string }) => void };
  }
}

/** Vadovas lietuviškas, /en ir kūrėjų dokumentacija (/docs) - angliškos. */
export function SupportChat() {
  const pathname = usePathname() ?? '/';
  const locale = pathname.startsWith('/en') || pathname.startsWith('/docs') ? 'en' : 'lt';

  useEffect(() => {
    if (window.LoyaltyChat || document.getElementById(SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = WIDGET_SRC;
    script.async = true;
    // Pagalbos straipsniai gyvena loyalty.lt pagalbos centre, ne čia.
    script.onload = () => window.LoyaltyChat?.init({ locale, articleBaseUrl: 'https://loyalty.lt' });
    document.body.appendChild(script);
  }, [locale]);

  return null;
}

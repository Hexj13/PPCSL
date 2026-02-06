'use client';

import { useEffect } from 'react';

import { analytics } from '@/lib/analytics';

export function ExternalLinkTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      try {
        const linkUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        if (linkUrl.hostname !== currentUrl.hostname) {
          const linkText = link.textContent?.trim() || link.getAttribute('aria-label') || href;
          analytics.click(href, linkText);
        }
      } catch {}
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  return null;
}

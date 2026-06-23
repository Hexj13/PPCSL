import type { MouseEvent } from 'react';

import { RESET_SEARCH_EVENT } from '@/components/layout/Header/HeaderLogo';
import { clearHomeSearchRestoreState } from '@/lib/clear-home-search-restore-state';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

const HOME_LISTINGS_SCROLL_OFFSET_BELOW_HEADER_PX = 24;

export function isHomePathname(pathname: string): boolean {
  return stripLocalePrefixFromPathname(pathname).restPath === '/';
}

export function scrollToHomeListings(): void {
  const scroll = () => {
    const listingsElement = document.getElementById('home-listings');
    if (!listingsElement) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 72;
    const offset = headerHeight + HOME_LISTINGS_SCROLL_OFFSET_BELOW_HEADER_PX;
    const rect = listingsElement.getBoundingClientRect();
    const targetY = Math.max(0, Math.round(window.scrollY + rect.top - offset));
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  scroll();
  requestAnimationFrame(scroll);
}

type HeaderListingsNavClickOptions = {
  pathname: string;
  homeHref: string;
  push: (href: string) => void;
  onBeforeNavigate?: () => void;
};

export function handleHeaderListingsNavClick(
  event: MouseEvent<HTMLAnchorElement>,
  { pathname, homeHref, push, onBeforeNavigate }: HeaderListingsNavClickOptions,
): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return;
  }

  event.preventDefault();
  onBeforeNavigate?.();

  if (isHomePathname(pathname)) {
    scrollToHomeListings();
    return;
  }

  clearHomeSearchRestoreState();
  window.dispatchEvent(new CustomEvent(RESET_SEARCH_EVENT));
  push(homeHref);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

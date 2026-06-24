'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { designTokens, ChevronDownIcon } from '@/ui';

import { DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES } from './desktopNavLinkClasses';

type HeaderMoreDropdownProps = {
  favoritesHref: string;
  compareHref: string;
  partnersHref?: string;
  comparisonCount: number;
  navLinkClasses: string;
  t: (key: string) => string;
};

const menuItemClassName =
  'flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover-only:hover:bg-primary-500/10';

export function HeaderMoreDropdown({
  favoritesHref,
  compareHref,
  partnersHref,
  comparisonCount,
  navLinkClasses,
  t,
}: HeaderMoreDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  return (
    <div ref={ref} className="relative hidden lg:flex xl:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={navLinkClasses}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="header-more-toggle"
      >
        <span className={DESKTOP_HEADER_NAV_LINK_LABEL_CLASSES} suppressHydrationWarning>
          {t('header.more')}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[180px] rounded-lg border-2 border-primary-500/30 bg-white shadow-xl"
          style={{ zIndex: designTokens.zIndex.dropdown }}
          data-testid="header-more-menu"
          role="menu"
        >
          <Link href={favoritesHref} role="menuitem" onClick={close} className={menuItemClassName}>
            <span suppressHydrationWarning>{t('header.favorites')}</span>
          </Link>
          <Link href={compareHref} role="menuitem" onClick={close} className={menuItemClassName}>
            <span suppressHydrationWarning>{t('header.compare')}</span>
            {comparisonCount > 0 && (
              <span className="ml-auto min-w-[1.25rem] rounded-full border border-primary-300 bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
                {comparisonCount > 99 ? '99+' : comparisonCount}
              </span>
            )}
          </Link>
          {partnersHref && (
            <Link href={partnersHref} role="menuitem" onClick={close} className={menuItemClassName}>
              <span suppressHydrationWarning>{t('header.forBusiness')}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

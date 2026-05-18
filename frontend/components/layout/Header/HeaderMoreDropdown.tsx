'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { ChevronDownIcon, designTokens } from '@/ui';

import { DetailsMoreIcon, LogoutIcon, ScaleIcon, ShieldIcon, UserIcon } from './icons';

type HeaderMoreDropdownProps = {
  user: { type: string };
  comparisonCount: number;
  navLinkClasses: string;
  onLogout: () => void;
  t: (key: string) => string;
};

export function HeaderMoreDropdown({
  user,
  comparisonCount,
  navLinkClasses,
  onLogout,
  t,
}: HeaderMoreDropdownProps) {
  const { href } = useLocalizedNavigation();
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

  const handleLogout = () => {
    close();
    onLogout();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={navLinkClasses}
        data-testid="header-user-more-toggle"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <DetailsMoreIcon className="w-4 h-4 shrink-0" />
        <span suppressHydrationWarning>{t('header.more')}</span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border-2 border-primary-500/30 bg-white py-1 shadow-xl"
          style={{ zIndex: designTokens.zIndex.dropdown }}
          data-testid="header-user-more-menu"
          role="menu"
        >
          <Link
            href="/compare"
            role="menuitem"
            onClick={close}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover-only:hover:bg-primary-500/10 xl:hidden"
          >
            <ScaleIcon className="w-4 h-4 shrink-0 text-primary-700" />
            <span>{t('header.compare')}</span>
            {comparisonCount > 0 && (
              <span className="ml-auto min-w-[1.25rem] rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white text-center">
                {comparisonCount > 99 ? '99+' : comparisonCount}
              </span>
            )}
          </Link>
          <Link
            href={href('/profile')}
            role="menuitem"
            onClick={close}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover-only:hover:bg-primary-500/10"
          >
            <UserIcon className="w-4 h-4 shrink-0 text-primary-700" />
            <span>{t('header.profile')}</span>
          </Link>
          {user.type === 'Admin' && (
            <Link
              href={href('/admin')}
              role="menuitem"
              onClick={close}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover-only:hover:bg-primary-500/10"
            >
              <ShieldIcon className="w-4 h-4 shrink-0 text-primary-700" />
              <span>{t('header.admin')}</span>
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            data-testid="header-user-logout"
            className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 py-3 text-left text-sm text-text-primary transition-colors hover-only:hover:bg-primary-500/10"
          >
            <LogoutIcon className="w-4 h-4 shrink-0 text-primary-700" />
            <span suppressHydrationWarning>{t('header.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

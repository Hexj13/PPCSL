'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { designTokens } from '@/ui';

import { UserIcon } from './icons';

type HeaderProfileDropdownProps = {
  user: { type: string };
  onLogout: () => void;
  t: (key: string) => string;
};

const menuItemClassName =
  'flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover-only:hover:bg-primary-500/10';

export function HeaderProfileDropdown({ user, onLogout, t }: HeaderProfileDropdownProps) {
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
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary-700 bg-bg-darker text-text-secondary transition-colors duration-200 hover-only:hover:bg-primary-500/10 hover-only:hover:text-primary-700 active:bg-primary-500/20 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        aria-label={t('header.profile')}
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="header-profile-toggle"
      >
        <UserIcon className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border-2 border-primary-500/30 bg-white shadow-xl"
          style={{ zIndex: designTokens.zIndex.dropdown }}
          data-testid="header-profile-menu"
          role="menu"
        >
          <Link
            href={href('/profile')}
            role="menuitem"
            onClick={close}
            className={menuItemClassName}
          >
            <span suppressHydrationWarning>{t('common.edit')}</span>
          </Link>
          {user.type === 'Admin' && (
            <Link
              href={href('/admin')}
              role="menuitem"
              onClick={close}
              className={menuItemClassName}
            >
              <span suppressHydrationWarning>{t('header.admin')}</span>
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            data-testid="header-user-logout"
            className={`${menuItemClassName} cursor-pointer border-0 bg-transparent`}
          >
            <span suppressHydrationWarning>{t('header.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

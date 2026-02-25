'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ChevronDownIcon } from '@/ui';

import { ScaleIcon, ShieldIcon, UserIcon } from './icons';

type HeaderMoreDropdownProps = {
  user: { type: string };
  comparisonCount: number;
  navLinkClasses: string;
  t: (key: string) => string;
};

export function HeaderMoreDropdown({
  user,
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={navLinkClasses}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span suppressHydrationWarning>{t('header.more')}</span>
        <ChevronDownIcon
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-full z-[100] mt-1 min-w-[180px] rounded-lg border-2 border-primary-500/30 bg-white py-1 shadow-xl"
          role="menu"
        >
          <Link
            href="/compare"
            role="menuitem"
            onClick={close}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover:bg-primary-500/10"
          >
            <ScaleIcon className="w-4 h-4 flex-shrink-0 text-primary-700" />
            <span>{t('header.compare')}</span>
            {comparisonCount > 0 && (
              <span className="ml-auto rounded-full bg-primary-500 px-2 py-0.5 text-xs text-white">
                {comparisonCount}
              </span>
            )}
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            onClick={close}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover:bg-primary-500/10"
          >
            <UserIcon className="w-4 h-4 flex-shrink-0 text-primary-700" />
            <span>{t('header.profile')}</span>
          </Link>
          {user.type === 'Admin' && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={close}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-primary transition-colors hover:bg-primary-500/10"
            >
              <ShieldIcon className="w-4 h-4 flex-shrink-0 text-primary-700" />
              <span>{t('header.admin')}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MouseEvent } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';

import { handleHeaderListingsNavClick } from './headerHomeListingsNav';

type HeaderListingsNavLinkProps = {
  className: string;
  labelClassName?: string;
  onNavigate?: () => void;
  t: (key: string) => string;
};

export function HeaderListingsNavLink({
  className,
  labelClassName,
  onNavigate,
  t,
}: HeaderListingsNavLinkProps) {
  const pathname = usePathname();
  const { href, push } = useLocalizedNavigation();
  const homeHref = href('/');

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    handleHeaderListingsNavClick(event, {
      pathname: pathname ?? '/',
      homeHref,
      push,
      onBeforeNavigate: onNavigate,
    });
  };

  return (
    <Link href={homeHref} onClick={handleClick} className={className}>
      <span className={labelClassName} suppressHydrationWarning>
        {t('header.listings')}
      </span>
    </Link>
  );
}

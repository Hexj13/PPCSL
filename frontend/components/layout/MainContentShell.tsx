'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { LISTING_DETAIL_PAGE_MIN_CLASS } from '@/components/listing/listing-detail-layout';

function isListingDetailPath(pathname: string): boolean {
  if (!pathname.startsWith('/listings/')) return false;
  if (pathname === '/listings/new') return false;
  if (pathname.endsWith('/edit')) return false;
  return true;
}

export function MainContentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minHeightClass = isListingDetailPath(pathname) ? LISTING_DETAIL_PAGE_MIN_CLASS : '';

  return <div className={minHeightClass}>{children}</div>;
}

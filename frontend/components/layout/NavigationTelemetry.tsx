'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { incrementNavigationCount } from '@/lib/navigation-count';

export function NavigationTelemetry() {
  const pathname = usePathname();
  const skipFirst = useRef(true);
  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    incrementNavigationCount();
  }, [pathname]);
  return null;
}

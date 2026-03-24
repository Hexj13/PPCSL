'use client';

import { usePathname } from 'next/navigation';

import { Footer } from '@/components/layout/Footer';
import { isHideFooterPath } from '@/components/layout/header-flow-paths';

export function ConditionalFooter() {
  const pathname = usePathname();
  if (isHideFooterPath(pathname)) {
    return null;
  }
  return <Footer />;
}

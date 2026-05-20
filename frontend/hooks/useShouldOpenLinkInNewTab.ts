'use client';

import { useEffect, useState } from 'react';

import { shouldOpenLinkInNewTab } from '@/lib/is-installed-web-app';

export function useShouldOpenLinkInNewTab(): boolean {
  const [openInNewTab, setOpenInNewTab] = useState(false);

  useEffect(() => {
    setOpenInNewTab(shouldOpenLinkInNewTab());
  }, []);

  return openInNewTab;
}

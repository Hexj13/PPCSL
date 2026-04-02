'use client';

import { useEffect, type Dispatch, type SetStateAction } from 'react';

import type { PaginationMeta } from '@/lib/api';

export function useMyListingsRefreshCooldownTimer(
  meta: PaginationMeta | null,
  userId: string | undefined,
  timeUntilRefresh: number | null,
  setTimeUntilRefresh: Dispatch<SetStateAction<number | null>>,
): void {
  useEffect(() => {
    if (!meta?.last_listing_refresh_at || meta?.refreshCooldownMs == null || !userId) return;
    const at = new Date(meta.last_listing_refresh_at).getTime();
    const remaining = at + meta.refreshCooldownMs - Date.now();
    if (remaining > 0) {
      setTimeUntilRefresh(remaining);
      localStorage.setItem(`lastRefreshDate_${userId}`, at.toString());
    }
  }, [meta?.last_listing_refresh_at, meta?.refreshCooldownMs, userId, setTimeUntilRefresh]);

  useEffect(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return;
    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => (prev === null || prev <= 1000 ? 0 : prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeUntilRefresh, setTimeUntilRefresh]);
}

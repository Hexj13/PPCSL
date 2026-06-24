'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { useListingActions } from '@/hooks/useListingActions';
import { useTranslation } from '@/hooks/useTranslation';
import type { PromotionAccessStatus, PromotionHistory, User } from '@/lib/api';
import { listingsApi } from '@/lib/api';

type PromotionHistoryMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ListingActions = Pick<ReturnType<typeof useListingActions>, 'togglePromotion'>;

async function fetchPromotionAccess(): Promise<PromotionAccessStatus> {
  try {
    const res = await listingsApi.getPromotionAccess();
    return res.data;
  } catch {
    return {
      access: 'disabled',
      enabled: false,
      isAdmin: false,
      canPromote: false,
      isPartner: false,
      freePromotionBalance: 0,
      partnerListingProgress: 0,
      listingsUntilNextFreePromotion: null,
    };
  }
}

async function fetchPromotionHistoryAvailability() {
  try {
    const res = await listingsApi.hasPromotionHistory();
    return res.data.hasHistory;
  } catch {
    return false;
  }
}

export function useMyListingsPromotion(
  user: User | null | undefined,
  listingActions: ListingActions,
) {
  const { t } = useTranslation();
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [promotionHistoryModalOpen, setPromotionHistoryModalOpen] = useState(false);
  const [hasPromotionHistory, setHasPromotionHistory] = useState(false);
  const [promotionHistory, setPromotionHistory] = useState<PromotionHistory[]>([]);
  const [promotionHistoryPage, setPromotionHistoryPage] = useState(1);
  const [promotionHistoryMeta, setPromotionHistoryMeta] = useState<PromotionHistoryMeta | null>(
    null,
  );
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [promotionAccess, setPromotionAccess] = useState<PromotionAccessStatus | null>(null);

  const loadPromotionAccess = useCallback(async () => {
    setPromotionAccess(await fetchPromotionAccess());
  }, []);

  const checkPromotionHistory = useCallback(async () => {
    setHasPromotionHistory(await fetchPromotionHistoryAvailability());
  }, []);

  const loadPromotionHistory = useCallback(
    async (page: number = 1) => {
      setLoadingHistory(true);
      try {
        const res = await listingsApi.getPromotionHistory(page, 50);
        setPromotionHistory(res.data.data);
        setPromotionHistoryMeta(res.data.meta);
        setPromotionHistoryPage(page);
      } catch {
        const { toast } = await import('@/lib/toast');
        toast.error(t('promotion.history.loadError'));
      } finally {
        setLoadingHistory(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!user) return;
    void checkPromotionHistory();
    void loadPromotionAccess();
  }, [user, checkPromotionHistory, loadPromotionAccess]);

  const handlePromoteClick = useCallback((id: string) => {
    setSelectedListingId(id);
    setPromotionModalOpen(true);
  }, []);

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!selectedListingId) return;
      await listingActions.togglePromotion(
        selectedListingId,
        true,
        days,
        days === null ? 'partner_balance' : 'default',
      );
      await loadPromotionAccess();
      await checkPromotionHistory();
      setPromotionModalOpen(false);
      setSelectedListingId(null);
    },
    [selectedListingId, listingActions, loadPromotionAccess, checkPromotionHistory],
  );

  const canPromote = useMemo(
    () => (promotionAccess?.canPromote ?? false) || (promotionAccess?.isPartner ?? false),
    [promotionAccess],
  );

  return {
    promotionAccess,
    hasPromotionHistory,
    canPromote,
    promotionModalOpen,
    setPromotionModalOpen,
    selectedListingId,
    setSelectedListingId,
    promotionHistoryModalOpen,
    setPromotionHistoryModalOpen,
    promotionHistory,
    promotionHistoryMeta,
    promotionHistoryPage,
    loadingHistory,
    loadPromotionHistory,
    handlePromoteClick,
    handlePromotionSelect,
  };
}

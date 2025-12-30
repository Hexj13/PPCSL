'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { ListingManagementCard } from '@/components/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/ListingManagementCardSkeleton';
import { PromotionModal } from '@/components/PromotionModal';
import { useTranslation } from '@/hooks/useTranslation';
import { adminApi, Listing, PromotionHistory, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { formatDateShort } from '@/lib/utils';

type AdminTab = 'listings' | 'users' | 'promotions';

export default function AdminPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('adminActiveTab') as AdminTab | null;
      if (savedTab && ['listings', 'users', 'promotions'].includes(savedTab)) {
        return savedTab;
      }
    }
    return 'listings';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isInitialized && !user) {
      return;
    }

    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user && user.type !== 'Admin') {
      router.push('/');
      return;
    }
  }, [user, isInitialized, router]);

  if (!isInitialized && !user) {
    return null;
  }

  if (isInitialized && !user) {
    return null;
  }

  if (!user || user.type !== 'Admin') {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          {t('admin.title')}
        </h1>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="flex gap-2 md:gap-3 border-b border-primary-500/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 md:px-6 py-2 md:py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'listings'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400'
            }`}
          >
            {t('admin.listingsTabLabel')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 md:px-6 py-2 md:py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400'
            }`}
          >
            {t('admin.usersTabLabel')}
          </button>
          <button
            onClick={() => setActiveTab('promotions')}
            className={`px-4 md:px-6 py-2 md:py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'promotions'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400'
            }`}
          >
            {t('admin.promotionsTabLabel')}
          </button>
        </div>
      </div>

      {activeTab === 'listings' && (
        <ListingsTab
          initialSearchQuery={
            typeof window !== 'undefined'
              ? localStorage.getItem('adminListingsSearchQuery') || ''
              : ''
          }
        />
      )}
      {activeTab === 'users' && (
        <UsersTab
          onViewUserListings={(_userId: string) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminListingsSearchQuery', _userId);
            }
            setActiveTab('listings');
          }}
        />
      )}
      {activeTab === 'promotions' && <PromotionsTab />}
    </div>
  );
}

interface ListingsTabProps {
  initialSearchQuery?: string;
  initialSearchType?: 'creator' | 'id' | null;
}

function ListingsTab({ initialSearchQuery = '' }: ListingsTabProps) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Closed'>('All');
  const [promotedFilter, setPromotedFilter] = useState<'All' | 'Promoted' | 'NotPromoted'>('All');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [statusCounts, setStatusCounts] = useState({
    Active: 0,
    Paused: 0,
    Closed: 0,
    Promoted: 0,
  });
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasDataRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadListings = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    if (!hasDataRef.current) {
      setLoading(true);
    } else {
      showLoadingTimeoutRef.current = setTimeout(() => {
        setLoading(true);
      }, 300);
    }

    try {
      const status = statusFilter === 'All' ? undefined : statusFilter;
      const isPromoted = promotedFilter === 'All' ? undefined : promotedFilter === 'Promoted';
      const listingId = searchQuery.trim() ? searchQuery.trim() : undefined;
      const userId = searchQuery.trim() ? searchQuery.trim() : undefined;

      const response = await adminApi.getAllListings(
        page,
        limit,
        listingId,
        userId,
        status,
        isPromoted
      );
      let listingsData = response.data.data;

      // Sort: promoted first by updated_at desc, then others by updated_at desc
      if (userId) {
        listingsData = [...listingsData].sort((a, b) => {
          if (a.is_promoted && !b.is_promoted) return -1;
          if (!a.is_promoted && b.is_promoted) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      }

      setListings(listingsData);
      setMeta({
        total: response.data.meta.total || 0,
        page: response.data.meta.page || 1,
        limit: response.data.meta.limit || limit,
        totalPages: response.data.meta.totalPages || 1,
      });
      hasDataRef.current = true;
    } catch {
      toast.error(t('admin.listingsTab.loadError'));
    } finally {
      if (showLoadingTimeoutRef.current) {
        clearTimeout(showLoadingTimeoutRef.current);
        showLoadingTimeoutRef.current = null;
      }
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, limit, statusFilter, promotedFilter, searchQuery, t]);

  const loadStatusCounts = useCallback(async () => {
    try {
      const response = await adminApi.getListingsStatusCounts();
      setStatusCounts(response.data);
    } catch {
      // Ignore errors for status counts
    }
  }, []);

  useEffect(() => {
    if (initialSearchQuery && typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        localStorage.removeItem('adminListingsSearchQuery');
        localStorage.removeItem('adminListingsSearchType');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadStatusCounts();
      loadListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    setPage(1);
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, promotedFilter]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;

    const timer = setTimeout(() => {
      setPage(1);
      loadListings();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAction = useCallback(
    async (id: string, action: 'publish' | 'pause' | 'close') => {
      const statusMap: Record<'publish' | 'pause' | 'close', 'Active' | 'Paused' | 'Closed'> = {
        publish: 'Active',
        pause: 'Paused',
        close: 'Closed',
      };
      const newStatus = statusMap[action];

      try {
        await adminApi.updateListingStatus(id, newStatus);
        toast.success(t('admin.listingsTab.statusUpdateSuccess'));

        setListings((prev) =>
          prev.map((listing) => (listing.id === id ? { ...listing, status: newStatus } : listing))
        );
        loadStatusCounts();
      } catch {
        toast.error(t('admin.listingsTab.statusUpdateError'));
      }
    },
    [t, loadStatusCounts]
  );

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('admin.listingsTab.copySuccess', { label }));
      } catch {
        toast.error(t('admin.listingsTab.copyError'));
      }
    },
    [t]
  );

  const handleUnpromote = useCallback(
    async (id: string) => {
      try {
        await adminApi.toggleListingPromotion(id, false, null);
        toast.success(t('admin.promotionDisabled'));
        loadListings();
        loadStatusCounts();
      } catch {
        toast.error(t('admin.promotionError'));
      }
    },
    [t, loadListings, loadStatusCounts]
  );

  const handlePromoteClick = useCallback(
    (id: string) => {
      const listing = listings.find((l) => l.id === id);
      if (listing?.is_promoted) {
        handleUnpromote(id);
      } else {
        setSelectedListingId(id);
        setPromotionModalOpen(true);
      }
    },
    [listings, handleUnpromote]
  );

  const handlePromotionSelect = useCallback(
    async (days: number | null) => {
      if (!selectedListingId) return;

      try {
        await adminApi.toggleListingPromotion(selectedListingId, true, days);
        toast.success(t('admin.promotionEnabled'));
        loadListings();
        loadStatusCounts();
      } catch {
        toast.error(t('admin.promotionError'));
      } finally {
        setPromotionModalOpen(false);
        setSelectedListingId(null);
      }
    },
    [selectedListingId, t, loadListings, loadStatusCounts]
  );

  if (loading) {
    return (
      <div>
        <div className="mb-4 md:mb-6">
          <div className="w-full h-[48px] md:h-[52px] bg-bg-light/30 rounded-lg animate-pulse" />
        </div>
        <div className="mb-4 md:mb-6">
          <div className="flex flex-wrap gap-2 md:gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9 md:h-10 w-20 md:w-24 bg-bg-light/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="mb-3 md:mb-4 h-4 md:h-5 bg-bg-light/30 rounded w-40 md:w-48 animate-pulse" />
        <div className="space-y-3 md:space-y-4">
          {[...Array(3)].map((_, i) => (
            <ListingManagementCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('admin.listingsTab.searchByIdPlaceholder')}
          className="w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-light border-2 border-primary-500/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
        />
      </div>

      <div className="mb-4 md:mb-6">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {(['All', 'Active', 'Paused', 'Closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                if (promotedFilter !== 'All') {
                  setPromotedFilter('All');
                }
              }}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-bg-light hover:bg-bg-dark border ${
                statusFilter === status ? 'border-primary-500 text-white' : 'border-primary-500/20'
              }`}
              style={statusFilter !== status ? { color: 'rgb(243, 243, 243)' } : undefined}
            >
              {status === 'All'
                ? t('admin.listingsTab.all')
                : status === 'Active'
                  ? t('admin.listingsTab.active')
                  : status === 'Paused'
                    ? t('admin.listingsTab.paused')
                    : t('admin.listingsTab.closed')}
              {status !== 'All' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                  {statusCounts[status]}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => {
              const newPromotedFilter = promotedFilter === 'Promoted' ? 'All' : 'Promoted';
              setPromotedFilter(newPromotedFilter);
              if (newPromotedFilter === 'Promoted') {
                setStatusFilter('All');
              }
            }}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-bg-light hover:bg-bg-dark border ${
              promotedFilter === 'Promoted'
                ? 'border-primary-500 text-white'
                : 'border-primary-500/20'
            }`}
            style={promotedFilter !== 'Promoted' ? { color: 'rgb(243, 243, 243)' } : undefined}
          >
            {t('myListings.promoted')}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
              {statusCounts.Promoted}
            </span>
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-10 md:py-12">
          <p className="text-base md:text-lg" style={{ color: 'rgb(243, 243, 243)' }}>
            {t('admin.listingsTab.noListings')}
          </p>
        </div>
      ) : (
        <>
          <div
            className="mb-3 md:mb-4 text-sm md:text-base"
            style={{ color: 'rgb(243, 243, 243)' }}
          >
            {t('admin.listingsTab.totalListings')}:{' '}
            <span className="font-semibold text-white">{meta?.total || 0}</span>
          </div>

          <div className="space-y-3 md:space-y-4">
            {listings.map((listing) => (
              <ListingManagementCard
                key={listing.id}
                listing={listing}
                mode="admin"
                onAction={handleAction}
                onCopyId={(id) => handleCopy(id, 'ID')}
                onPromoteClick={handlePromoteClick}
              />
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 md:mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
              >
                {t('common.previous')}
              </button>
              <span className="text-sm md:text-base" style={{ color: 'rgb(243, 243, 243)' }}>
                {t('common.pageOf', { page, totalPages: meta.totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}

      <PromotionModal
        isOpen={promotionModalOpen}
        onClose={() => {
          setPromotionModalOpen(false);
          setSelectedListingId(null);
        }}
        onSelect={handlePromotionSelect}
        isAdmin={true}
      />
    </div>
  );
}

function PromotionsTab() {
  const { t } = useTranslation();
  const [promotions, setPromotions] = useState<PromotionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'All' | 'day' | 'week' | 'month'>('All');
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const loadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasDataRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limit = 50;

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('admin.listingsTab.copySuccess', { label }));
      } catch {
        toast.error(t('admin.listingsTab.copyError'));
      }
    },
    [t]
  );

  const getFromDate = useCallback((filter: 'All' | 'day' | 'week' | 'month'): Date | undefined => {
    if (filter === 'All') return undefined;
    const now = new Date();
    const fromDate = new Date();
    if (filter === 'day') {
      fromDate.setDate(now.getDate() - 1);
    } else if (filter === 'week') {
      fromDate.setDate(now.getDate() - 7);
    } else if (filter === 'month') {
      fromDate.setMonth(now.getMonth() - 1);
    }
    return fromDate;
  }, []);

  const loadPromotions = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    if (!hasDataRef.current) {
      setLoading(true);
    } else {
      showLoadingTimeoutRef.current = setTimeout(() => {
        setLoading(true);
      }, 300);
    }

    try {
      const listingId = searchQuery ? searchQuery : undefined;
      const userId = searchQuery ? searchQuery : undefined;
      const fromDate = getFromDate(timeFilter);
      const response = await adminApi.getAllPromotions(page, limit, listingId, userId, fromDate);
      setPromotions(response.data.data);
      setMeta(response.data.meta);
      hasDataRef.current = true;
    } catch {
      toast.error(t('admin.promotionsTab.loadError'));
    } finally {
      if (showLoadingTimeoutRef.current) {
        clearTimeout(showLoadingTimeoutRef.current);
        showLoadingTimeoutRef.current = null;
      }
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, searchQuery, timeFilter, getFromDate, t]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadPromotions();
    } else {
      loadPromotions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, timeFilter]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const handleTimeFilterChange = useCallback((filter: 'All' | 'day' | 'week' | 'month') => {
    setTimeFilter(filter);
    setPage(1);
  }, []);

  return (
    <div>
      <div className="mb-4 md:mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={t('admin.promotionsTab.searchPlaceholder')}
          className="w-full px-4 py-2.5 md:py-3 rounded-lg bg-bg-light border-2 border-primary-500/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
        />
      </div>

      <div className="mb-4 md:mb-6">
        <div className="flex flex-wrap gap-2 md:gap-3">
          {(['All', 'day', 'week', 'month'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => handleTimeFilterChange(filter)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-bg-light hover:bg-bg-dark border ${
                timeFilter === filter ? 'border-primary-500 text-white' : 'border-primary-500/20'
              }`}
              style={timeFilter !== filter ? { color: 'rgb(243, 243, 243)' } : undefined}
            >
              {filter === 'All'
                ? t('admin.promotionsTab.allTime')
                : filter === 'day'
                  ? t('admin.promotionsTab.lastDay')
                  : filter === 'week'
                    ? t('admin.promotionsTab.lastWeek')
                    : t('admin.promotionsTab.lastMonth')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {searchQuery ? t('admin.promotionsTab.noResults') : t('admin.promotionsTab.noPromotions')}
        </div>
      ) : (
        <>
          <div
            className="mb-3 md:mb-4 text-sm md:text-base"
            style={{ color: 'rgb(243, 243, 243)' }}
          >
            {t('admin.promotionsTab.totalPromotions')}:{' '}
            <span className="font-semibold text-white">{meta?.total || 0}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-primary-500/30">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.listingTitle')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.status')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.days')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.startDate')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.endDate')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.userId')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-primary-300">
                    {t('admin.promotionsTab.listingId')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((promotion) => (
                  <tr key={promotion.id} className="border-b border-primary-500/10">
                    <td className="py-3 px-4 text-sm">
                      <Link
                        href={`/listings/${promotion.listing_id}`}
                        className="text-primary-400 hover:text-primary-300 hover:underline transition-colors"
                      >
                        {promotion.listing_title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      <span
                        className={
                          promotion.listing_status === 'Active'
                            ? 'text-primary-400 font-semibold'
                            : promotion.listing_status === 'Paused'
                              ? 'text-blue-400 font-semibold'
                              : 'text-gray-400 font-semibold'
                        }
                      >
                        {promotion.listing_status === 'Active'
                          ? t('userListings.active')
                          : promotion.listing_status === 'Paused'
                            ? t('userListings.paused')
                            : t('userListings.closed')}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-center"
                      style={{ color: 'rgb(243, 243, 243)' }}
                    >
                      {promotion.days}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-center"
                      style={{ color: 'rgb(243, 243, 243)' }}
                    >
                      {formatDateShort(promotion.started_at)}
                    </td>
                    <td
                      className="py-3 px-4 text-sm text-center"
                      style={{ color: 'rgb(243, 243, 243)' }}
                    >
                      {promotion.ended_at ? formatDateShort(promotion.ended_at) : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-xs break-all">
                          {promotion.user_id}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(promotion.user_id, t('admin.promotionsTab.userId'))
                          }
                          className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors flex-shrink-0"
                          title={t('common.copyId')}
                        >
                          <svg
                            className="w-3.5 h-3.5 md:w-4 md:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-xs break-all">
                          {promotion.listing_id}
                        </span>
                        <button
                          onClick={() =>
                            handleCopy(promotion.listing_id, t('admin.promotionsTab.listingId'))
                          }
                          className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors flex-shrink-0"
                          title={t('common.copyId')}
                        >
                          <svg
                            className="w-3.5 h-3.5 md:w-4 md:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
              >
                {t('common.previous')}
              </button>
              <span className="px-4 py-2 text-gray-300">
                {t('common.page')} {meta.page} {t('common.of')} {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface UsersTabProps {
  onViewUserListings: (_userId: string) => void;
}

function UsersTab({ onViewUserListings }: UsersTabProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Individual' | 'Business' | 'Admin'>('All');
  const [roleCounts, setRoleCounts] = useState({ All: 0, Individual: 0, Business: 0, Admin: 0 });
  const loadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasDataRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadUsers = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    if (!hasDataRef.current) {
      setLoading(true);
    } else {
      showLoadingTimeoutRef.current = setTimeout(() => {
        setLoading(true);
      }, 300);
    }

    try {
      const userType = roleFilter === 'All' ? undefined : roleFilter;
      const search = searchQuery.trim() ? searchQuery.trim() : undefined;

      const response = await adminApi.getAllUsers(page, limit, search, userType);
      setUsers(response.data.data);
      setMeta({
        total: response.data.meta.total || 0,
        page: response.data.meta.page || 1,
        limit: response.data.meta.limit || limit,
        totalPages: response.data.meta.totalPages || 1,
      });
      hasDataRef.current = true;
    } catch {
      toast.error(t('admin.usersTab.loadError'));
    } finally {
      if (showLoadingTimeoutRef.current) {
        clearTimeout(showLoadingTimeoutRef.current);
        showLoadingTimeoutRef.current = null;
      }
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, limit, roleFilter, searchQuery, t]);

  const loadRoleCounts = useCallback(async () => {
    try {
      const [all, individual, business, admin] = await Promise.all([
        adminApi.getAllUsers(1, 1),
        adminApi.getAllUsers(1, 1, undefined, 'Individual'),
        adminApi.getAllUsers(1, 1, undefined, 'Business'),
        adminApi.getAllUsers(1, 1, undefined, 'Admin'),
      ]);
      setRoleCounts({
        All: all.data.meta?.total || 0,
        Individual: individual.data.meta?.total || 0,
        Business: business.data.meta?.total || 0,
        Admin: admin.data.meta?.total || 0,
      });
    } catch {
      // Ignore errors for role counts
    }
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      loadRoleCounts();
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    setPage(1);
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;

    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleToggleStatus = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      const previousActive = user?.active;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, active: user.active === false ? true : false } : user
        )
      );

      try {
        await adminApi.toggleUserStatus(userId);
        toast.success(t('admin.usersTab.userStatusUpdateSuccess'));
        loadRoleCounts();
      } catch {
        if (previousActive !== undefined) {
          setUsers((prev) =>
            prev.map((user) => (user.id === userId ? { ...user, active: previousActive } : user))
          );
        }
        toast.error(t('admin.usersTab.statusUpdateError'));
      }
    },
    [users, t, loadRoleCounts]
  );

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t('admin.usersTab.copySuccess', { label }));
      } catch {
        toast.error(t('admin.usersTab.copyError'));
      }
    },
    [t]
  );

  const handleViewListings = useCallback(
    (user: User) => {
      onViewUserListings(user.id);
    },
    [onViewUserListings]
  );

  if (loading) {
    return (
      <div>
        <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
          <div className="flex-1 h-[48px] md:h-[52px] bg-bg-light/30 rounded-lg animate-pulse" />
          <div className="flex flex-wrap gap-2 md:gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-9 md:h-10 w-24 md:w-28 bg-bg-light/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="mb-3 md:mb-4 h-4 md:h-5 bg-bg-light/30 rounded w-40 md:w-48 animate-pulse" />
        <div className="space-y-3 md:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 md:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-4">
                <div className="flex-1 space-y-2 md:space-y-3">
                  <div className="h-3 md:h-4 bg-bg-light/30 rounded w-28 md:w-32 animate-pulse" />
                  <div className="h-5 md:h-6 bg-bg-light/40 rounded w-3/4 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-3 md:h-4 bg-bg-light/30 rounded w-full animate-pulse" />
                    <div className="h-3 md:h-4 bg-bg-light/30 rounded w-5/6 animate-pulse" />
                    <div className="h-3 md:h-4 bg-bg-light/30 rounded w-4/6 animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-row lg:flex-col gap-2">
                  <div className="h-8 md:h-10 bg-bg-light/30 rounded flex-1 lg:flex-none lg:w-32 animate-pulse" />
                  <div className="h-8 md:h-10 bg-bg-light/30 rounded flex-1 lg:flex-none lg:w-28 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.usersTab.searchPlaceholder')}
            className="flex-1 px-4 py-2.5 md:py-3 rounded-lg bg-bg-light border-2 border-primary-500/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 h-[48px] md:h-[52px] text-sm md:text-base"
          />
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          {(['All', 'Individual', 'Business', 'Admin'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors text-sm md:text-base bg-bg-light hover:bg-bg-dark border ${
                roleFilter === role ? 'border-primary-500 text-white' : 'border-primary-500/20'
              }`}
              style={roleFilter !== role ? { color: 'rgb(243, 243, 243)' } : undefined}
            >
              {role === 'All'
                ? t('admin.usersTab.allRoles')
                : role === 'Individual'
                  ? t('admin.usersTab.individual')
                  : role === 'Business'
                    ? t('admin.usersTab.business')
                    : t('admin.usersTab.admin')}
              {role !== 'All' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                  {roleCounts[role]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-10 md:py-12">
          <p className="text-base md:text-lg" style={{ color: 'rgb(243, 243, 243)' }}>
            {t('admin.usersTab.noUsers')}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:space-y-4">
            {users.map((user) => (
              <div key={user.id} className="card p-4 md:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm md:text-base text-gray-400 font-mono break-all">
                          {t('admin.usersTab.id')} {user.id}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleCopy(user.id, 'ID');
                          }}
                          className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors flex-shrink-0"
                          title={t('common.copyId')}
                        >
                          <svg
                            className="w-3.5 h-3.5 md:w-4 md:h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                      <h3 className="text-sm md:text-base font-bold text-white break-words">
                        {user.firstName
                          ? user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.firstName
                          : user.companyName ||
                            user.email ||
                            user.phone ||
                            t('admin.usersTab.deletedUser')}
                      </h3>
                      {user.companyName && (
                        <p
                          className="text-sm md:text-base mt-1 break-words"
                          style={{ color: 'rgb(243, 243, 243)' }}
                        >
                          {user.companyName}
                        </p>
                      )}
                    </div>
                    <div
                      className="space-y-1 text-sm md:text-base"
                      style={{ color: 'rgb(243, 243, 243)' }}
                    >
                      {user.email ? (
                        <div className="break-words">
                          <span className="text-primary-400">{t('admin.usersTab.email')}</span>{' '}
                          {user.email}
                        </div>
                      ) : (
                        <div>
                          <span className="text-primary-400">{t('admin.usersTab.email')}</span>{' '}
                          <span className="text-gray-500">{t('admin.usersTab.unavailable')}</span>
                        </div>
                      )}
                      {user.phone ? (
                        <div>
                          <span className="text-primary-400">{t('admin.usersTab.phone')}</span>{' '}
                          {user.phone}
                        </div>
                      ) : (
                        <div>
                          <span className="text-primary-400">{t('admin.usersTab.phone')}</span>{' '}
                          <span className="text-gray-500">{t('admin.usersTab.unavailable')}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-primary-400">{t('admin.usersTab.type')}</span>
                        <span
                          className={`px-2 py-1 rounded text-sm md:text-base font-semibold ${
                            user.type === 'Admin'
                              ? 'bg-purple-500/20 text-purple-300'
                              : user.type === 'Business'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-primary-500/20 text-primary-300'
                          }`}
                        >
                          {user.type === 'Admin'
                            ? t('admin.usersTab.admin')
                            : user.type === 'Business'
                              ? t('admin.usersTab.business')
                              : t('admin.usersTab.individual')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-primary-400">{t('admin.usersTab.status')}</span>
                        <span
                          className={`px-2 py-1 rounded text-sm md:text-base font-semibold ${
                            user.active !== false
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {user.active !== false
                            ? t('admin.usersTab.active')
                            : t('admin.usersTab.inactive')}
                        </span>
                      </div>
                      <div>
                        <span className="text-primary-400">{t('admin.usersTab.listings')}</span>{' '}
                        {user.listings?.length || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                    {(user.listings?.length || 0) > 0 && (
                      <button
                        onClick={() => handleViewListings(user)}
                        className="px-3 md:px-4 h-10 text-xs md:text-sm rounded-lg font-medium transition-colors bg-primary-700 hover:bg-primary-800 text-white text-center flex-1 lg:flex-none lg:w-auto flex items-center justify-center"
                      >
                        {t('admin.usersTab.viewListings', { count: user.listings?.length || 0 })}
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleStatus(user.id)}
                      className={`px-3 md:px-4 h-10 text-xs md:text-sm rounded-lg font-medium transition-colors text-center flex-1 lg:flex-none lg:w-auto flex items-center justify-center ${
                        user.active !== false
                          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 border border-primary-500/30'
                      }`}
                    >
                      {user.active !== false
                        ? t('admin.usersTab.deactivate')
                        : t('admin.usersTab.activate')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6 md:mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
              >
                {t('common.previous')}
              </button>
              <span className="text-sm md:text-base" style={{ color: 'rgb(243, 243, 243)' }}>
                {t('common.pageOf', { page, totalPages: meta.totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

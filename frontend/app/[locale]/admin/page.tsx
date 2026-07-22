'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { localStorageGetItem, localStorageSetItem } from '@/lib/browser-local-storage';
import { sessionStorageGetItem, sessionStorageRemoveItem } from '@/lib/browser-session-storage';
import { toast } from '@/lib/toast';

const TabSkeleton = () => (
  <div className="animate-pulse bg-primary-500/10 rounded-lg min-h-[70vh]" />
);

const BrandsModelsTab = dynamic(
  () => import('./components/BrandsModelsTab').then((mod) => ({ default: mod.BrandsModelsTab })),
  { ssr: false, loading: TabSkeleton },
);

const ListingsTab = dynamic(
  () => import('./components/ListingsTab').then((mod) => ({ default: mod.ListingsTab })),
  { ssr: false, loading: TabSkeleton },
);

const ParsingTab = dynamic(
  () => import('./components/ParsingTab').then((mod) => ({ default: mod.ParsingTab })),
  { ssr: false, loading: TabSkeleton },
);

const PromotionsTab = dynamic(
  () => import('./components/PromotionsTab').then((mod) => ({ default: mod.PromotionsTab })),
  { ssr: false, loading: TabSkeleton },
);

const UsersTab = dynamic(
  () => import('./components/UsersTab').then((mod) => ({ default: mod.UsersTab })),
  { ssr: false, loading: TabSkeleton },
);

type AdminTab = 'listings' | 'users' | 'promotions' | 'brandsModels' | 'parsing';

const ADMIN_ACTIVE_TAB_STORAGE_KEY = 'adminActiveTab';

const ADMIN_TAB_VALUES: readonly AdminTab[] = [
  'listings',
  'users',
  'promotions',
  'brandsModels',
  'parsing',
] as const;

function parseStoredAdminTab(raw: string | null): AdminTab | null {
  if (!raw) return null;
  return ADMIN_TAB_VALUES.includes(raw as AdminTab) ? (raw as AdminTab) : null;
}
const LISTING_UPDATED_TOAST_KEY = 'listingUpdatedToast';

export default function AdminPage() {
  const { isLoading, isAuthorized } = useRequireAuth({ requiredRole: 'Admin' });
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const skipPersistActiveTabRef = useRef(true);

  const listingsTabRef = useRef<HTMLButtonElement>(null);
  const usersTabRef = useRef<HTMLButtonElement>(null);
  const promotionsTabRef = useRef<HTMLButtonElement>(null);
  const brandsModelsTabRef = useRef<HTMLButtonElement>(null);
  const parsingTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeTab,
    {
      users: usersTabRef,
      brandsModels: brandsModelsTabRef,
      parsing: parsingTabRef,
      listings: listingsTabRef,
      promotions: promotionsTabRef,
    },
    tabsContainerRef,
  );

  useEffect(() => {
    const parsed = parseStoredAdminTab(localStorageGetItem(ADMIN_ACTIVE_TAB_STORAGE_KEY));
    if (parsed) setActiveTab(parsed);
  }, []);

  useEffect(() => {
    if (skipPersistActiveTabRef.current) {
      skipPersistActiveTabRef.current = false;
      return;
    }
    localStorageSetItem(ADMIN_ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const shouldShowToast = sessionStorageGetItem(LISTING_UPDATED_TOAST_KEY) === 'true';
    if (!shouldShowToast) return;
    sessionStorageRemoveItem(LISTING_UPDATED_TOAST_KEY);
    toast.success(t('listings.changesSaved'));
  }, [t]);

  if (isLoading || !isAuthorized) {
    return null;
  }

  return (
    <div data-testid="admin-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-primary-900">{t('admin.title')}</h1>
      </div>

      <div className="mb-6 border-b border-primary-500/20">
        <div ref={tabsContainerRef} className="relative overflow-x-auto scrollbar-hide">
          <div className="relative flex gap-1 min-w-max">
            <button
              ref={usersTabRef}
              type="button"
              onClick={() => setActiveTab('users')}
              className={`shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
                activeTab === 'users'
                  ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
                  : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
              }`}
              data-testid="admin-tab-users"
            >
              {t('admin.usersTabLabel')}
            </button>
            <button
              ref={brandsModelsTabRef}
              type="button"
              onClick={() => setActiveTab('brandsModels')}
              className={`shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
                activeTab === 'brandsModels'
                  ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
                  : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
              }`}
              data-testid="admin-tab-brands-models"
            >
              {t('admin.brandsModelsTabLabel')}
            </button>
            <button
              ref={parsingTabRef}
              type="button"
              onClick={() => setActiveTab('parsing')}
              className={`shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
                activeTab === 'parsing'
                  ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
                  : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
              }`}
              data-testid="admin-tab-parsing"
            >
              {t('admin.parsingTabLabel')}
            </button>
            <button
              ref={listingsTabRef}
              type="button"
              onClick={() => setActiveTab('listings')}
              className={`shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
                activeTab === 'listings'
                  ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
                  : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
              }`}
              data-testid="admin-tab-listings"
            >
              {t('admin.listingsTabLabel')}
            </button>
            <button
              ref={promotionsTabRef}
              type="button"
              onClick={() => setActiveTab('promotions')}
              className={`shrink-0 px-4 py-3 text-base font-semibold transition-all duration-300 relative z-10 whitespace-nowrap flex items-center ${
                activeTab === 'promotions'
                  ? 'text-primary-700 bg-primary-500/10 rounded-t-lg'
                  : 'text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:bg-primary-500/10'
              }`}
              data-testid="admin-tab-promotions"
            >
              {t('admin.promotionsTabLabel')}
            </button>
            <div
              ref={indicatorRef}
              className="absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out"
              style={{ left: `${indicatorStyle.left}px`, width: `${indicatorStyle.width}px` }}
            />
          </div>
        </div>
      </div>

      <div className="min-h-[70vh]">
        {activeTab === 'users' && (
          <UsersTab
            isActive
            onViewUserListings={(userId) => {
              localStorageSetItem('adminListingsSearchQuery', userId);
              setActiveTab('listings');
            }}
          />
        )}
        {activeTab === 'brandsModels' && <BrandsModelsTab isActive />}
        {activeTab === 'parsing' && <ParsingTab isActive />}
        {activeTab === 'listings' && (
          <ListingsTab
            isActive
            initialSearchQuery={
              typeof window !== 'undefined'
                ? localStorageGetItem('adminListingsSearchQuery') || ''
                : ''
            }
          />
        )}
        {activeTab === 'promotions' && <PromotionsTab isActive />}
      </div>
    </div>
  );
}

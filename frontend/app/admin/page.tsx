'use client';

import { useEffect, useRef, useState } from 'react';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from '@/lib/toast';

import { BrandsModelsTab } from './components/BrandsModelsTab';
import { ListingsTab } from './components/ListingsTab';
import { PromotionsTab } from './components/PromotionsTab';
import { UsersTab } from './components/UsersTab';

type AdminTab = 'listings' | 'users' | 'promotions' | 'brandsModels';
const LISTING_UPDATED_TOAST_KEY = 'listingUpdatedToast';

export default function AdminPage() {
  const { isLoading, isAuthorized } = useRequireAuth({ requiredRole: 'Admin' });
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const listingsTabRef = useRef<HTMLButtonElement>(null);
  const usersTabRef = useRef<HTMLButtonElement>(null);
  const promotionsTabRef = useRef<HTMLButtonElement>(null);
  const brandsModelsTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const { indicatorRef, indicatorStyle } = useTabIndicator(
    activeTab,
    {
      users: usersTabRef,
      brandsModels: brandsModelsTabRef,
      listings: listingsTabRef,
      promotions: promotionsTabRef,
    },
    tabsContainerRef,
  );

  useEffect(() => {
    const shouldShowToast = sessionStorage.getItem(LISTING_UPDATED_TOAST_KEY) === 'true';
    if (!shouldShowToast) return;
    sessionStorage.removeItem(LISTING_UPDATED_TOAST_KEY);
    toast.success(t('listings.changesSaved'));
  }, [t]);

  if (isLoading || !isAuthorized) {
    return null;
  }

  return (
    <div>
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
            >
              {t('admin.brandsModelsTabLabel')}
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

      <div
        className={activeTab !== 'listings' ? 'hidden' : undefined}
        aria-hidden={activeTab !== 'listings'}
      >
        <ListingsTab
          initialSearchQuery={
            typeof window !== 'undefined'
              ? localStorage.getItem('adminListingsSearchQuery') || ''
              : ''
          }
        />
      </div>
      <div
        className={activeTab !== 'users' ? 'hidden' : undefined}
        aria-hidden={activeTab !== 'users'}
      >
        <UsersTab
          onViewUserListings={(userId) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminListingsSearchQuery', userId);
            }
            setActiveTab('listings');
          }}
        />
      </div>
      <div
        className={activeTab !== 'promotions' ? 'hidden' : undefined}
        aria-hidden={activeTab !== 'promotions'}
      >
        <PromotionsTab />
      </div>
      <div
        className={activeTab !== 'brandsModels' ? 'hidden' : undefined}
        aria-hidden={activeTab !== 'brandsModels'}
      >
        <BrandsModelsTab />
      </div>
    </div>
  );
}

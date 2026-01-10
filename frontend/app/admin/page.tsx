'use client';

import { useEffect, useState } from 'react';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';

import { ListingsTab } from './components/ListingsTab';
import { PromotionsTab } from './components/PromotionsTab';
import { UsersTab } from './components/UsersTab';

type AdminTab = 'listings' | 'users' | 'promotions';

export default function AdminPage() {
  const { isLoading, isAuthorized } = useRequireAuth({ requiredRole: 'Admin' });
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

  if (isLoading || !isAuthorized) {
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
          onViewUserListings={(userId) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminListingsSearchQuery', userId);
            }
            setActiveTab('listings');
          }}
        />
      )}
      {activeTab === 'promotions' && <PromotionsTab />}
    </div>
  );
}

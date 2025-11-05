'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { ListingManagementCard } from '@/components/ListingManagementCard';
import { listingsApi, Listing } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function MyListingsPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    listingsApi
      .getMy()
      .then((res) => {
        setListings(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    const lastRefreshKey = `lastRefreshDate_${user.id}`;
    const lastRefreshStr = localStorage.getItem(lastRefreshKey);
    if (lastRefreshStr) {
      const lastRefresh = parseInt(lastRefreshStr, 10);
      const now = Date.now();
      const twoDays = 48 * 60 * 60 * 1000;
      const timePassed = now - lastRefresh;

      if (timePassed < twoDays) {
        const remaining = twoDays - timePassed;
        setTimeUntilRefresh(remaining);
      }
    }
  }, [user, isInitialized, router]);

  useEffect(() => {
    if (timeUntilRefresh === null || timeUntilRefresh <= 0) return;

    const interval = setInterval(() => {
      setTimeUntilRefresh((prev) => {
        if (prev === null || prev <= 1000) {
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeUntilRefresh]);

  const handleAction = async (id: string, action: 'publish' | 'pause' | 'close') => {
    try {
      switch (action) {
        case 'publish':
          await listingsApi.publish(id);
          toast.success('Објавата е објавена');
          break;
        case 'pause':
          await listingsApi.pause(id);
          toast.success('Објавата е привремено застарена');
          break;
        case 'close':
          await listingsApi.close(id);
          toast.success('Објавата е затворена');
          break;
      }
      const res = await listingsApi.getMy();
      setListings(res.data);
    } catch {}
  };

  const handleRefreshDates = async () => {
    if (timeUntilRefresh !== null && timeUntilRefresh > 0) {
      toast.error('Можете да ја користите оваа функција на секои 48 часа');
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await listingsApi.refreshDates();
      toast.success(`Датите се ажурирани за ${res.data.updated} објави`);

      const lastRefreshKey = `lastRefreshDate_${user?.id}`;
      localStorage.setItem(lastRefreshKey, Date.now().toString());
      setTimeUntilRefresh(48 * 60 * 60 * 1000);

      const listingsRes = await listingsApi.getMy();
      setListings(listingsRes.data);
    } catch {
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isInitialized) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Мои објави
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefreshDates}
            disabled={isRefreshing || (timeUntilRefresh !== null && timeUntilRefresh > 0)}
            className="w-full sm:w-auto btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Ажурирање...
              </>
            ) : timeUntilRefresh !== null && timeUntilRefresh > 0 ? (
              <>Обнови дата ({formatTimeRemaining(timeUntilRefresh)})</>
            ) : (
              'Обнови дата'
            )}
          </button>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg mb-4">Сè уште немате објави</p>
          <a href="/listings/new" className="btn-primary inline-block">
            Креирај објава
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <ListingManagementCard
              key={listing.id}
              listing={listing}
              mode="my-listings"
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

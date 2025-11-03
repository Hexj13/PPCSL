'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { listingsApi, Listing, PaginationMeta } from '@/lib/api';
import { ListingCard } from './ListingCard';
import { useSearchParams } from 'next/navigation';

export function ListingGrid() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchListings = useCallback(
    async (page: number, append: boolean = false) => {
      const params: Record<string, string | number> = {
        page,
        limit: 20,
      };

      searchParams.forEach((value, key) => {
        if (key === 'engine_displ_l_gte' || key === 'engine_displ_l_lte') {
          params[key] = parseFloat(value);
        } else if (
          key === 'year_gte' ||
          key === 'year_lte' ||
          key === 'price_gte' ||
          key === 'price_lte' ||
          key === 'mileage_gte' ||
          key === 'mileage_lte' ||
          key === 'doors'
        ) {
          params[key] = parseInt(value);
        } else if (
          key === 'brand_id' ||
          key === 'model_id' ||
          key === 'currency' ||
          key === 'title' ||
          key === 'body_type' ||
          key === 'color'
        ) {
          params[key] = value;
        } else if (key !== 'page') {
          params[key] = value;
        }
      });

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await listingsApi.getAll(params);
        if (append) {
          setListings((prev) => [...prev, ...res.data.data]);
        } else {
          setListings(res.data.data);
          setCurrentPage(1);
        }
        setMeta(res.data.meta);
        setError(null);
      } catch (err) {
        console.error('Error fetching listings:', err);
        if (!append) {
          setListings([]);
          setError('Грешка при вчитување на објави. Проверете дали бекенд серверот е стартуван.');
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchParams]
  );

  useEffect(() => {
    fetchListings(1, false);
  }, [fetchListings]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && meta && meta.totalPages && currentPage < meta.totalPages) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          fetchListings(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadingMore, meta, currentPage, fetchListings]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-400 text-lg font-semibold mb-2">Грешка</p>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-lg">Објави не се пронајдени</p>
      </div>
    );
  }

  const hasMore = meta && meta.totalPages && currentPage < meta.totalPages;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {loadingMore && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-300">Вчитување...</p>
        </div>
      )}

      {!hasMore && listings.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-300">Нема повеќе објави</p>
        </div>
      )}

      <div ref={observerTarget} style={{ height: '1px' }} />
    </div>
  );
}

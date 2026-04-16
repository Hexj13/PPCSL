'use client';

import { useParams } from 'next/navigation';
import { useMemo } from 'react';

import { getBlurForListing } from '@/lib/blur-navigation-cache';
import { blurhashToDataURL } from '@/lib/utils/blurhash';

export default function ListingLoading() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : undefined;

  const blurDataURL = useMemo(() => {
    if (!id) return undefined;
    const cached = getBlurForListing(id);
    if (!cached) return undefined;
    try {
      return blurhashToDataURL(cached.blurHash);
    } catch {
      return undefined;
    }
  }, [id]);

  return (
    <div className="max-w-6xl mx-auto animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-[1.86fr_1fr] gap-8 lg:gap-6">
        <div className="space-y-6 min-w-0 order-1">
          {blurDataURL ? (
            <div
              className="relative h-64 sm:h-80 md:h-96 rounded-xl mb-4 bg-cover bg-center"
              style={{ backgroundImage: `url(${blurDataURL})` }}
            />
          ) : (
            <div className="relative h-64 sm:h-80 md:h-96 bg-primary-500/10 rounded-xl mb-4" />
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 sm:h-32 bg-primary-500/10 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="order-2 lg:order-3 lg:col-span-2">
          <nav className="flex items-center space-x-2 text-sm mb-6">
            <div className="h-4 bg-primary-500/10 rounded-sm w-20" />
            <span className="text-text-secondary">/</span>
            <div className="h-4 bg-primary-500/10 rounded-sm w-48" />
          </nav>
        </div>
        <div className="space-y-6 min-w-0 order-3 lg:order-2">
          <h1 className="mb-6">
            <span className="inline-block h-10 bg-primary-500/10 rounded-sm w-3/4" />
          </h1>
          <div className="flex items-baseline gap-3 mb-5">
            <div className="h-12 bg-primary-500/10 rounded-sm w-48" />
            <div className="h-6 bg-primary-500/10 rounded-sm w-16" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 bg-primary-500/10 rounded-lg w-24" />
            <div className="h-8 bg-primary-500/10 rounded-lg w-20" />
          </div>
          <div className="h-12 bg-primary-500/10 rounded-lg w-full sm:w-56 mt-8" />
        </div>
      </div>
      <div className="my-6 border-t-0 lg:border-t border-primary-500/20" />
      <div className="bg-primary-500/10 p-4 md:p-6 rounded-xl h-64 mb-6" />
    </div>
  );
}

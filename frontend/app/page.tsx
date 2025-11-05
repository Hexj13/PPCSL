import { Suspense } from 'react';

import { ListingGrid } from '@/components/ListingGrid';
import { SearchFilters } from '@/components/SearchFilters';

function SearchFiltersWrapper() {
  return (
    <Suspense fallback={<div className="card p-4 md:p-5 mb-6">Вчитување...</div>}>
      <SearchFilters />
    </Suspense>
  );
}

function ListingGridWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-300">Вчитување...</div>}>
      <ListingGrid />
    </Suspense>
  );
}

export default function Home() {
  return (
    <div>
      <div className="mb-8 md:mb-12 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-primary-400/5 to-transparent rounded-2xl blur-3xl -z-10" />
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-6 leading-tight">
          <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent drop-shadow-lg">
            Автомобили во Северна Македонија
          </span>
        </h1>
        <p className="text-xl md:text-2xl font-medium text-gray-200 leading-relaxed tracking-wide">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Купете или продадете го вашиот авто на{' '}
          </span>
          <span className="bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent font-bold">
            kupito
          </span>
        </p>
      </div>

      <SearchFiltersWrapper />

      <ListingGridWrapper />
    </div>
  );
}

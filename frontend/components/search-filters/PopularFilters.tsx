'use client';

import Link from 'next/link';

import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { compareNames, createSlug } from '@/lib/utils';

interface PopularFiltersProps {
  isQuickFilterActive: (_brandName: string, _modelName?: string) => boolean;
  onApplyFilter: (_brandName: string, _modelName?: string) => void;
}

export function PopularFilters({ isQuickFilterActive, onApplyFilter }: PopularFiltersProps) {
  const sortedBrands = [...POPULAR_BRANDS].sort((a, b) => compareNames(a, b));

  const renderBrand = (brand: string) => {
    const models = [...(POPULAR_MODELS_BY_BRAND[brand] || [])].sort((a, b) => compareNames(a, b));
    const brandHref = `/?brand=${encodeURIComponent(createSlug(brand))}`;
    const isBrandActive = isQuickFilterActive(brand);
    return (
      <div key={brand} className="flex flex-wrap items-center gap-2 w-full">
        <Link
          href={brandHref}
          scroll={false}
          suppressHydrationWarning
          onClick={(e) => {
            e.preventDefault();
            if (!isBrandActive) {
              onApplyFilter(brand);
            }
          }}
          className={`px-3 py-2 rounded-full text-primary-100 border-2 transition-all text-sm ${
            isBrandActive
              ? 'bg-gradient-to-r from-primary-500/30 via-primary-500/40 to-primary-500/30 border-primary-400 shadow-[0_0_8px_rgba(0,255,136,0.3)]'
              : 'bg-primary-500/15 border-primary-400/60 hover:bg-primary-500/25 hover:border-primary-300/90'
          }`}
        >
          {brand}
        </Link>
        {models.map((model) => {
          const modelHref = `/?brand=${encodeURIComponent(createSlug(brand))}&model=${encodeURIComponent(createSlug(model))}`;
          const isModelActive = isQuickFilterActive(brand, model);
          return (
            <Link
              key={`${brand}-${model}`}
              href={modelHref}
              scroll={false}
              suppressHydrationWarning
              onClick={(e) => {
                e.preventDefault();
                if (!isModelActive) {
                  onApplyFilter(brand, model);
                }
              }}
              className={`px-3 py-2 rounded-full text-primary-200 border transition-all text-sm ${
                isModelActive
                  ? 'bg-gradient-to-r from-primary-500/25 via-primary-500/35 to-primary-500/25 text-primary-100 border-primary-500/40 shadow-[0_0_6px_rgba(0,255,136,0.25)]'
                  : 'bg-primary-500/5 border-primary-500/20 hover:bg-primary-500/15 hover:text-primary-100 hover:border-primary-500/30'
              }`}
            >
              {brand} {model}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mb-5">
      <div className="flex flex-col gap-4">{sortedBrands.map(renderBrand)}</div>
    </div>
  );
}

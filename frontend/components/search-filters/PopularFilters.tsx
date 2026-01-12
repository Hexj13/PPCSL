'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { compareNames, createSlug } from '@/lib/utils';

interface PopularFiltersProps {
  showPopularFilters: boolean;
  onToggle: () => void;
  isQuickFilterActive: (_brandName: string, _modelName?: string) => boolean;
  onApplyFilter: (_brandName: string, _modelName?: string) => void;
}

export function PopularFilters({
  showPopularFilters,
  onToggle,
  isQuickFilterActive,
  onApplyFilter,
}: PopularFiltersProps) {
  const { t } = useTranslation();

  const sortedBrands = [...POPULAR_BRANDS].sort((a, b) => compareNames(a, b));
  const midPoint = Math.ceil(sortedBrands.length / 2);
  const firstColumnBrands = sortedBrands.slice(0, midPoint);
  const secondColumnBrands = sortedBrands.slice(midPoint);

  const renderBrand = (brand: string) => {
    const models = POPULAR_MODELS_BY_BRAND[brand] || [];
    const brandHref = `/?brand=${encodeURIComponent(createSlug(brand))}`;
    const isBrandActive = isQuickFilterActive(brand);
    return (
      <div
        key={brand}
        className="flex flex-wrap items-center gap-2"
        style={{ maxWidth: 'calc(120px * 10 + 0.5rem * 9)' }}
      >
        <Link
          href={brandHref}
          scroll={false}
          suppressHydrationWarning
          onClick={(e) => {
            e.preventDefault();
            onApplyFilter(brand);
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
                onApplyFilter(brand, model);
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
      <div className="flex items-center gap-3 mb-6">
        <h2
          onClick={onToggle}
          className="text-base md:text-lg font-bold text-primary-400 underline cursor-pointer hover:text-primary-300 transition-colors"
        >
          {t('searchFilters.popularFilters')}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            showPopularFilters
              ? `${t('searchFilters.hideAdvanced')} ${t('searchFilters.popularFilters')}`
              : `${t('searchFilters.showAdvanced')} ${t('searchFilters.popularFilters')}`
          }
          className="px-3 py-1 text-sm font-semibold text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors duration-200 flex items-center gap-1"
        >
          <span>
            {showPopularFilters ? t('searchFilters.hideAdvanced') : t('searchFilters.showAdvanced')}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              showPopularFilters ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div
        className={`grid grid-cols-2 gap-x-3 gap-y-3 items-start ${showPopularFilters ? '' : 'hidden'}`}
      >
        <div className="flex flex-col gap-3">{firstColumnBrands.map(renderBrand)}</div>
        <div className="flex flex-col gap-3">{secondColumnBrands.map(renderBrand)}</div>
      </div>
    </div>
  );
}

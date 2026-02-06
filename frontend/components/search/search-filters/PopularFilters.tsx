'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useTranslation } from '@/hooks/useTranslation';
import { getPopularBrands, getPopularModelsByBrand } from '@/lib/content/popular-brands';
import { compareNames, createSlug } from '@/lib/utils';

interface PopularFiltersProps {
  isQuickFilterActive: (_brandName: string, _modelName?: string) => boolean;
  onApplyFilter: (_brandName: string, _modelName?: string) => void;
  onReset?: () => void;
  vehicleType?: 'car' | 'truck' | 'moto';
}

export function PopularFilters({
  isQuickFilterActive,
  onApplyFilter,
  onReset,
  vehicleType = 'car',
}: PopularFiltersProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const popularBrands = getPopularBrands(vehicleType) || [];
  const popularModelsByBrand = getPopularModelsByBrand(vehicleType) || {};
  const sortedBrands =
    popularBrands.length > 0 ? [...popularBrands].sort((a, b) => compareNames(a, b)) : [];

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      const baseUrl = vehicleType !== 'car' ? `/?vehicleType=${vehicleType}` : '/';
      router.push(baseUrl);
    }
  };

  const renderBrand = (brand: string) => {
    if (!brand) return null;
    const models = [...(popularModelsByBrand[brand] || [])].sort((a, b) => compareNames(a, b));
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
            if (isBrandActive) {
              handleReset();
            } else {
              onApplyFilter(brand);
            }
          }}
          className={`relative px-3 py-2 rounded-full text-text-secondary border-2 transition-all text-sm ${
            isBrandActive
              ? 'bg-primary-500/5 border-primary-500'
              : 'bg-primary-500/15 border-primary-400/60 hover:bg-primary-500/25 hover:border-primary-300/90'
          }`}
        >
          {brand}
          {isBrandActive && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none"
              style={{
                borderRadius: 'inherit',
                background:
                  'radial-gradient(circle, rgba(64, 145, 107, 0.25) 0%, rgba(64, 145, 107, 0.15) 40%, rgba(64, 145, 107, 0.05) 100%)',
              }}
            >
              <div className="w-5 h-5 bg-primary-500/50 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}
        </Link>
        {models
          .filter((model) => model && model.trim() !== '')
          .map((model) => {
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
                  if (isModelActive) {
                    handleReset();
                  } else {
                    onApplyFilter(brand, model);
                  }
                }}
                className={`relative px-3 py-2 rounded-full text-text-secondary border transition-all text-sm ${
                  isModelActive
                    ? 'bg-primary-500/5 border-primary-500'
                    : 'bg-primary-500/5 border-primary-500/20 hover:bg-primary-500/15 hover:border-primary-500/30'
                }`}
              >
                {brand} {model}
                {isModelActive && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none"
                    style={{
                      borderRadius: 'inherit',
                      background:
                        'radial-gradient(circle, rgba(64, 145, 107, 0.25) 0%, rgba(64, 145, 107, 0.15) 40%, rgba(64, 145, 107, 0.05) 100%)',
                    }}
                  >
                    <div className="w-5 h-5 bg-primary-500/50 rounded-full flex items-center justify-center shadow-lg">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
      </div>
    );
  };

  return (
    <div className="mb-5">
      {sortedBrands.length > 0 ? (
        <div className="flex flex-col gap-4">
          {sortedBrands.map(renderBrand).filter((brand) => brand !== null)}
        </div>
      ) : (
        <div className="text-sm text-text-secondary">
          {t('searchFilters.noPopularBrands') || 'Нет популярных марок для этой категории'}
        </div>
      )}
    </div>
  );
}

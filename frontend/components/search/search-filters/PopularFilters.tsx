'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { usePopularModels } from '@/hooks/usePopularModels';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import type { Brand, VehicleModel } from '@/lib/api';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import {
  getPopularBrands,
  getPopularModelsByBrand,
  getMostPopularModel,
} from '@/lib/content/popular-brands';
import { toast } from '@/lib/toast';
import { compareNames } from '@/lib/utils';

import {
  PopularFilterBrandTile,
  PopularFilterChip,
  popularVehicleBrandLogoUrl,
} from './PopularFilterPickers';

interface PopularFiltersProps {
  brands: Brand[];
  models: VehicleModel[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  vehicleType: 'car' | 'truck' | 'moto';
}

type ChipItem = { brand: string; model: string };

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function shuffleNoAdjacentBrand(items: ChipItem[], random: () => number): ChipItem[] {
  if (items.length <= 1) return [...items];
  const byBrand = new Map<string, ChipItem[]>();
  for (const item of items) {
    const list = byBrand.get(item.brand) ?? [];
    list.push(item);
    byBrand.set(item.brand, list);
  }
  const brands = Array.from(byBrand.keys());
  const result: ChipItem[] = [];
  let lastBrand: string | null = null;
  let total = items.length;
  while (total > 0) {
    const available = brands.filter((b) => byBrand.get(b)!.length > 0 && b !== lastBrand);
    const pickBrand =
      available.length > 0
        ? available[Math.floor(random() * available.length)]
        : brands.find((b) => byBrand.get(b)!.length > 0)!;
    const list = byBrand.get(pickBrand)!;
    const item = list.pop()!;
    result.push(item);
    total--;
    lastBrand = pickBrand;
  }
  return result;
}

function useShuffledOtherChips(vehicleType: 'car' | 'truck' | 'moto'): ChipItem[] {
  const cacheRef = useRef<{ vehicleType: string; value: ChipItem[] } | null>(null);
  return useMemo(() => {
    const key = vehicleType;
    if (cacheRef.current?.vehicleType === key) return cacheRef.current.value;
    const popularBrands = getPopularBrands(vehicleType);
    const modelsByBrand = getPopularModelsByBrand(vehicleType);
    const other: ChipItem[] = [];
    const sortedBrands = [...popularBrands].sort(compareNames);
    for (const brand of sortedBrands) {
      const mostPopular = getMostPopularModel(brand, vehicleType);
      const models = modelsByBrand[brand] ?? [];
      for (const model of models) {
        if (model && model.trim() !== '' && model !== mostPopular) {
          other.push({ brand, model });
        }
      }
    }
    const seed = hashString(`popular-other-${key}`);
    const shuffled = shuffleNoAdjacentBrand(other, seededRandom(seed));
    cacheRef.current = { vehicleType: key, value: shuffled };
    return shuffled;
  }, [vehicleType]);
}

export function PopularFilters({
  brands,
  models,
  filters,
  setFilters,
  vehicleType = 'car',
}: PopularFiltersProps) {
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [expandAnimating, setExpandAnimating] = useState(false);
  const [collapseAnimating, setCollapseAnimating] = useState(false);
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const popularModelsBlockRef = useRef<HTMLDivElement>(null);
  const scrollThenHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HIDE_DURATION_MS = 300;
  const SCROLL_DURATION_MS = 400;
  const { toggleModel, isModelSelected, toggleBrand, isBrandExplicitlySelected, selectedItems } =
    usePopularModels({
      brands,
      models,
      filters,
      setFilters,
      vehicleType,
      onBrandLimitReached: () =>
        toast.error(
          t('searchFilters.selectionLimitBrands', {
            max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
          }),
        ),
      onModelLimitReached: () =>
        toast.error(
          t('searchFilters.selectionLimitModels', {
            max: MAX_SEARCH_MODEL_SELECTIONS.toString(),
          }),
        ),
    });

  const popularBrandsSorted = useMemo(
    () => [...getPopularBrands(vehicleType)].sort(compareNames),
    [vehicleType],
  );

  const mostPopularChips = useMemo(() => {
    const list = getPopularBrands(vehicleType)
      .map((brand) => {
        const model = getMostPopularModel(brand, vehicleType);
        return model ? { brand, model } : null;
      })
      .filter((x): x is ChipItem => x !== null);
    return list.sort((a, b) => compareNames(a.brand, b.brand));
  }, [vehicleType]);

  const otherChips = useShuffledOtherChips(vehicleType);

  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
      }
      if (scrollThenHideRef.current) {
        clearTimeout(scrollThenHideRef.current);
      }
    };
  }, []);

  if (mostPopularChips.length === 0) {
    return (
      <div className="mb-5">
        <div className="text-sm text-text-secondary">{t('searchFilters.noPopularBrands')}</div>
      </div>
    );
  }

  const handleShowMore = () => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
    setExpandAnimating(true);
    setShowMore(true);
    expandTimeoutRef.current = setTimeout(() => {
      setExpandAnimating(false);
      expandTimeoutRef.current = null;
    }, 400);
  };

  const handleHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (scrollThenHideRef.current) {
      clearTimeout(scrollThenHideRef.current);
      scrollThenHideRef.current = null;
    }
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    const startHideAnimation = () => {
      setIsHiding(true);
      hideTimeoutRef.current = setTimeout(() => {
        setShowMore(false);
        setExpandAnimating(false);
        setIsHiding(false);
        setCollapseAnimating(true);
        collapseTimeoutRef.current = setTimeout(() => {
          setCollapseAnimating(false);
          collapseTimeoutRef.current = null;
        }, 350);
        hideTimeoutRef.current = null;
      }, HIDE_DURATION_MS);
    };
    const isMobile =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      popularModelsBlockRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      scrollThenHideRef.current = setTimeout(() => {
        scrollThenHideRef.current = null;
        startHideAnimation();
      }, SCROLL_DURATION_MS);
    } else {
      startHideAnimation();
    }
  };

  return (
    <div ref={blockRef} className="mb-5 scroll-mt-20">
      <>
        <h3 className="text-sm font-medium text-primary-900 mb-3">
          {t('searchFilters.popularBrands')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {popularBrandsSorted.map((brandName) => (
            <PopularFilterBrandTile
              key={brandName}
              label={brandName}
              imageSrc={popularVehicleBrandLogoUrl(brandName)}
              letterPlaceholder={vehicleType === 'truck' || vehicleType === 'moto'}
              selected={isBrandExplicitlySelected(brandName)}
              onToggle={() => toggleBrand(brandName)}
            />
          ))}
        </div>
      </>
      <div ref={popularModelsBlockRef} className="scroll-mt-20">
        <h3 className="text-sm font-medium text-primary-900 mb-3">
          {t('searchFilters.popularModels')}
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {mostPopularChips.map(({ brand, model }) => (
          <PopularFilterChip
            key={`${brand}-${model}`}
            label={`${brand} ${model}`}
            selected={isModelSelected(brand, model)}
            onToggle={() => toggleModel(brand, model)}
          />
        ))}
        {otherChips.length > 0 && !showMore && !isHiding && (
          <button
            type="button"
            onClick={handleShowMore}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-primary-500 text-primary-700 hover:text-primary-900 hover:border-primary-900 text-sm transition-all"
            style={
              collapseAnimating ? { animation: 'popular-chip-in 0.25s ease-out both' } : undefined
            }
          >
            {t('searchFilters.showMore')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        )}
        {(showMore || isHiding) &&
          otherChips.map(({ brand, model }) => (
            <PopularFilterChip
              key={`${brand}-${model}`}
              label={`${brand} ${model}`}
              selected={isModelSelected(brand, model)}
              onToggle={() => toggleModel(brand, model)}
              style={
                isHiding
                  ? { animation: `popular-chip-out ${HIDE_DURATION_MS}ms ease-in both` }
                  : expandAnimating
                    ? { animation: 'popular-chip-in 0.3s ease-out both' }
                    : undefined
              }
            />
          ))}
        {(showMore || isHiding) && otherChips.length > 0 && (
          <button
            type="button"
            onClick={handleHide}
            disabled={isHiding}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border-2 border-primary-500 text-primary-700 hover:text-primary-900 hover:border-primary-900 text-sm transition-all disabled:opacity-70 disabled:pointer-events-none"
            style={
              isHiding
                ? { animation: `popular-chip-out ${HIDE_DURATION_MS}ms ease-in both` }
                : expandAnimating
                  ? { animation: 'popular-chip-in 0.25s ease-out both', animationDelay: '0.3s' }
                  : undefined
            }
          >
            {t('searchFilters.showLess')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          </button>
        )}
      </div>
      <p className="mt-4 text-sm text-text-secondary">
        {t('searchFilters.youSelected')}{' '}
        {selectedItems.length > 0
          ? selectedItems
              .map(({ brand, model }) => (model ? `${brand} ${model}` : brand))
              .join(', ')
          : '—'}
      </p>
    </div>
  );
}

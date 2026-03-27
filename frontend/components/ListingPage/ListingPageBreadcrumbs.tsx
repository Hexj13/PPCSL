'use client';

import { useCallback, useMemo } from 'react';

import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { createSlug, formatTransmission, getVehicleType, isTireListing } from '@/lib/utils';

interface ListingPageBreadcrumbsProps {
  listing: Listing;
  className?: string;
}

function buildBreadcrumbHref(
  type: 'category' | 'transmission' | 'brand' | 'model',
  listing: Listing,
): string {
  const vehicleType = getVehicleType(listing);
  const base = '/';
  const params = new URLSearchParams();

  if (type === 'category') {
    if (vehicleType !== 'car') params.set('vehicleType', vehicleType);
    return params.toString() ? `${base}?${params.toString()}` : base;
  }

  if (vehicleType !== 'car') {
    params.set('vehicleType', vehicleType);
  }

  if (type === 'transmission') {
    const transmission = listing.vehicle?.transmission;
    if (transmission) params.set('transmissions', transmission);
    return params.toString() ? `${base}?${params.toString()}` : base;
  }

  const brand = listing.vehicle?.brand;
  const model = listing.vehicle?.model;

  if (type === 'brand' && brand?.name) {
    params.set('brand', createSlug(brand.name));
    return params.toString() ? `${base}?${params.toString()}` : base;
  }

  if (type === 'model' && brand?.name && model?.name) {
    params.set('brand', createSlug(brand.name));
    params.set('model', createSlug(model.name));
    return params.toString() ? `${base}?${params.toString()}` : base;
  }

  return base;
}

export function ListingPageBreadcrumbs({ listing, className = '' }: ListingPageBreadcrumbsProps) {
  const { t } = useTranslation();

  const scrollToResultsAfterSearch = useCallback(() => {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem('scrollToResultsAfterLoad', '1');
    sessionStorage.removeItem('homeScrollPosition');
    sessionStorage.removeItem('homeScrollTimestamp');
    sessionStorage.removeItem('kupito_grid_state');
    sessionStorage.removeItem('forceHomeScrollTop');
  }, []);

  const tireItems = useMemo(() => {
    if (!isTireListing(listing) || !listing.tire) return null;
    const tire = listing.tire;
    const brandName = tire.brand?.name;
    const modelDisplay =
      tire.model?.is_other && tire.custom_model_name?.trim()
        ? tire.custom_model_name.trim()
        : tire.model?.name;
    const result: Array<{ label: string; href?: string; onClick?: () => void }> = [
      {
        label: t('searchFilters.tiresCategory'),
        href: '/?category=tire',
        onClick: scrollToResultsAfterSearch,
      },
    ];
    if (brandName && tire.brand?.id) {
      const p = new URLSearchParams();
      p.set('category', 'tire');
      p.set('tire_brand_ids', tire.brand.id);
      result.push({
        label: brandName,
        href: `/?${p.toString()}`,
        onClick: scrollToResultsAfterSearch,
      });
    }
    if (modelDisplay && tire.model?.id && !tire.model?.is_other) {
      const p = new URLSearchParams();
      p.set('category', 'tire');
      if (tire.brand?.id) p.set('tire_brand_ids', tire.brand.id);
      p.append('tire_model_ids', tire.model.id);
      result.push({
        label: modelDisplay,
        href: `/?${p.toString()}`,
        onClick: scrollToResultsAfterSearch,
      });
    }
    return result;
  }, [listing, t, scrollToResultsAfterSearch]);

  const vehicleBreadcrumbItems = useMemo(() => {
    if (isTireListing(listing)) {
      return [] as Array<{ label: string; href?: string; onClick?: () => void }>;
    }
    const vehicle = listing.vehicle;
    const vehicleType = getVehicleType(listing);
    const transmission = vehicle?.transmission;
    const brandName = vehicle?.brand?.name;
    const modelName = vehicle?.model?.name;

    const fullCategoryKey = `listings.vehicleTypeFull.${vehicleType}`;
    const shortCategoryKey = `listings.vehicleTypeShort.${vehicleType}`;
    const fallbackCategoryKey = `listings.vehicleType.${vehicleType}`;
    const shortCategoryLabel = t(shortCategoryKey);
    const fullCategoryLabel = t(fullCategoryKey);
    const fallbackCategoryLabel = t(fallbackCategoryKey);
    const categoryLabel =
      (shortCategoryLabel && shortCategoryLabel !== shortCategoryKey ? shortCategoryLabel : '') ||
      (fullCategoryLabel && fullCategoryLabel !== fullCategoryKey ? fullCategoryLabel : '') ||
      (fallbackCategoryLabel && fallbackCategoryLabel !== fallbackCategoryKey
        ? fallbackCategoryLabel
        : t('breadcrumbs.transport'));

    const result: Array<{ label: string; href?: string; onClick?: () => void }> = [
      {
        label: categoryLabel,
        href: buildBreadcrumbHref('category', listing),
        onClick: scrollToResultsAfterSearch,
      },
    ];
    if (transmission) {
      const transmissionHref = buildBreadcrumbHref('transmission', listing);
      result.push({
        label: formatTransmission(transmission, t),
        href: transmissionHref,
        onClick: scrollToResultsAfterSearch,
      });
    }
    if (brandName) {
      const brandHref = buildBreadcrumbHref('brand', listing);
      result.push({
        label: brandName,
        href: brandHref,
        onClick: scrollToResultsAfterSearch,
      });
    }
    if (modelName) {
      const modelHref = buildBreadcrumbHref('model', listing);
      result.push({
        label: modelName,
        href: modelHref,
        onClick: scrollToResultsAfterSearch,
      });
    }
    return result;
  }, [listing, t, scrollToResultsAfterSearch]);

  if (isTireListing(listing) && tireItems && tireItems.length > 0) {
    return (
      <Breadcrumbs
        items={tireItems}
        className={className}
        itemClassName="text-[12px] sm:text-sm text-primary-900"
        itemHoverClassName="hover-only:hover:text-primary-700"
        separator=" > "
        allowLastItemLink
      />
    );
  }

  if (vehicleBreadcrumbItems.length <= 1) return null;

  return (
    <Breadcrumbs
      items={vehicleBreadcrumbItems}
      className={className}
      itemClassName="text-[12px] sm:text-sm text-primary-900"
      itemHoverClassName="hover-only:hover:text-primary-700"
      separator=" > "
      allowLastItemLink
    />
  );
}

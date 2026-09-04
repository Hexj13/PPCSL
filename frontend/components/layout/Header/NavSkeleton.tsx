'use client';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

import { DESKTOP_HEADER_CLUSTER_GAP_CLASSES } from './desktopHeaderGapClasses';
import {
  HEADER_LOGO_DESKTOP_SLOT_CLASSES,
  HEADER_LOGO_MOBILE_SLOT_CLASSES,
  HEADER_LOGO_SKELETON_FILL_CLASSES,
  HEADER_LOGO_WRAP_CLASSES,
} from './headerLogoClasses';
import { headerLogoAspectVars, resolveHeaderLogo } from './headerLogoSize';

type NavSkeletonProps = {
  variant:
    | 'logo'
    | 'desktopLinks'
    | 'desktopActions'
    | 'desktopSignGuest'
    | 'desktopCatalogSearch'
    | 'mobile'
    | 'mobileSignGuest'
    | 'mobileCatalogSearch';
};

export function NavSkeleton({ variant }: NavSkeletonProps) {
  if (variant === 'logo') {
    const headerLogo = resolveHeaderLogo(loadSiteConfigSync(getCountry()).headerLogo);
    return (
      <div
        className={HEADER_LOGO_WRAP_CLASSES}
        style={headerLogoAspectVars(headerLogo)}
        aria-hidden
        data-testid="header-logo-skeleton"
      >
        <span className={HEADER_LOGO_DESKTOP_SLOT_CLASSES}>
          <span className={HEADER_LOGO_SKELETON_FILL_CLASSES} />
        </span>
        <span className={HEADER_LOGO_MOBILE_SLOT_CLASSES}>
          <span className={HEADER_LOGO_SKELETON_FILL_CLASSES} />
        </span>
      </div>
    );
  }
  if (variant === 'desktopLinks') {
    return (
      <div className={`flex ${DESKTOP_HEADER_CLUSTER_GAP_CLASSES} items-center`}>
        <div className="h-9 w-28 bg-primary-700/20 rounded-sm animate-pulse" />
        <div className="h-9 w-24 bg-primary-700/20 rounded-sm animate-pulse" />
        <div className="h-9 w-20 bg-primary-700/20 rounded-sm animate-pulse" />
      </div>
    );
  }
  if (variant === 'desktopActions') {
    return (
      <div className={`flex ${DESKTOP_HEADER_CLUSTER_GAP_CLASSES} items-center`}>
        <div className="h-10 w-44 bg-primary-700/20 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-primary-700/20 rounded-lg animate-pulse" />
      </div>
    );
  }
  if (variant === 'desktopSignGuest') {
    return (
      <div className="h-10 w-28 bg-primary-700/20 rounded-lg animate-pulse shrink-0" aria-hidden />
    );
  }
  if (variant === 'desktopCatalogSearch') {
    return (
      <div
        className="h-10 w-full rounded-lg bg-primary-700/20 animate-pulse"
        aria-hidden
        data-testid="header-catalog-search-skeleton"
      />
    );
  }
  if (variant === 'mobileCatalogSearch') {
    return (
      <div
        className="h-9 w-9 shrink-0 bg-primary-700/20 rounded-lg animate-pulse"
        aria-hidden
        data-testid="header-mobile-search-skeleton"
      />
    );
  }
  if (variant === 'mobileSignGuest') {
    return (
      <div
        className="h-[52px] w-28 bg-primary-700/20 rounded-lg animate-pulse shrink-0"
        aria-hidden
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="h-10 bg-white/20 rounded-sm animate-pulse" />
      <div className="h-10 bg-white/20 rounded-sm animate-pulse" />
    </div>
  );
}

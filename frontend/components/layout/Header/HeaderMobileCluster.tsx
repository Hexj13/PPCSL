'use client';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';

import { MobileToolbar } from './MobileToolbar';
import { NavSkeleton } from './NavSkeleton';

type HeaderMobileClusterProps = {
  showInlineMobileLanguage: boolean;
  showSkeleton: boolean;
  showNav: boolean;
  isMobileMenuOpen: boolean;
  isDrawerVisible: boolean;
  isMenuToggleLocked: boolean;
  onToggle: () => void;
  toggleAriaLabel: string;
  toggleId: string;
  drawerId: string;
  isSignPage: boolean;
  hideMobileCreateListing: boolean;
  showCatalogSearch: boolean;
  catalogSearchOpen: boolean;
  catalogSearchAriaLabel: string;
  onOpenCatalogSearch: () => void;
};

export function HeaderMobileCluster({
  showInlineMobileLanguage,
  showSkeleton,
  showNav,
  isMobileMenuOpen,
  isDrawerVisible,
  isMenuToggleLocked,
  onToggle,
  toggleAriaLabel,
  toggleId,
  drawerId,
  isSignPage,
  hideMobileCreateListing,
  showCatalogSearch,
  catalogSearchOpen,
  catalogSearchAriaLabel,
  onOpenCatalogSearch,
}: HeaderMobileClusterProps) {
  return (
    <div className="ml-auto flex lg:hidden items-center min-w-0 gap-1">
      {showInlineMobileLanguage && (
        <div className="flex items-center shrink-0">
          {showSkeleton ? (
            <NavSkeleton variant="mobileSignGuest" />
          ) : (
            <LanguageSwitcher variant="mobile" context="header" />
          )}
        </div>
      )}
      {showNav && (
        <MobileToolbar
          showSkeleton={showSkeleton}
          isMobileMenuOpen={isMobileMenuOpen}
          isDrawerVisible={isDrawerVisible}
          isMenuToggleLocked={isMenuToggleLocked}
          onToggle={onToggle}
          toggleAriaLabel={toggleAriaLabel}
          toggleId={toggleId}
          drawerId={drawerId}
          showMenuToggle={!isSignPage}
          showCreateListing={!hideMobileCreateListing}
          showCatalogSearch={showCatalogSearch}
          catalogSearchOpen={catalogSearchOpen}
          catalogSearchAriaLabel={catalogSearchAriaLabel}
          onOpenCatalogSearch={onOpenCatalogSearch}
        />
      )}
    </div>
  );
}

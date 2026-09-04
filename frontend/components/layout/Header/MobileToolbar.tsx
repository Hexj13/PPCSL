'use client';

import { CreateListingButton } from '@/components/listing/CreateListingButton';

import { NavSkeleton } from './NavSkeleton';
import { CloseIcon, MenuIcon, SearchIcon } from './icons';

const MOBILE_HEADER_ICON_BUTTON_CLASSES =
  'flex h-9 w-9 shrink-0 items-center justify-center touch-manipulation text-primary-700 transition-colors duration-200 select-none hover-only:hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base';

type MobileToolbarProps = {
  showSkeleton: boolean;
  isMobileMenuOpen: boolean;
  isDrawerVisible: boolean;
  isMenuToggleLocked?: boolean;
  onToggle: () => void;
  toggleAriaLabel: string;
  toggleId: string;
  drawerId: string;
  showMenuToggle?: boolean;
  showCreateListing?: boolean;
  showCatalogSearch?: boolean;
  catalogSearchOpen?: boolean;
  catalogSearchAriaLabel: string;
  onOpenCatalogSearch?: () => void;
};

export function MobileToolbar({
  showSkeleton,
  isMobileMenuOpen,
  isDrawerVisible,
  isMenuToggleLocked = false,
  onToggle,
  toggleAriaLabel,
  toggleId,
  drawerId,
  showMenuToggle = true,
  showCreateListing = true,
  showCatalogSearch = false,
  catalogSearchOpen = false,
  catalogSearchAriaLabel,
  onOpenCatalogSearch,
}: MobileToolbarProps) {
  return (
    <div className="flex items-center lg:hidden min-w-0 gap-1.5">
      {showSkeleton ? (
        showCreateListing ? (
          <div className="h-8 w-[5.75rem] bg-primary-700/20 rounded-lg animate-pulse" />
        ) : null
      ) : (
        showCreateListing && !isDrawerVisible && <CreateListingButton variant="mobile" />
      )}
      {showCatalogSearch &&
        (showSkeleton ? (
          <NavSkeleton variant="mobileCatalogSearch" />
        ) : (
          <button
            type="button"
            data-testid="header-mobile-search"
            className={MOBILE_HEADER_ICON_BUTTON_CLASSES}
            aria-label={catalogSearchAriaLabel}
            aria-expanded={catalogSearchOpen}
            onClick={onOpenCatalogSearch}
          >
            <SearchIcon className="h-5 w-5" />
          </button>
        ))}
      {showMenuToggle && (
        <button
          id={toggleId}
          type="button"
          onClick={onToggle}
          disabled={isMenuToggleLocked}
          data-testid="header-mobile-menu-toggle"
          className={`${MOBILE_HEADER_ICON_BUTTON_CLASSES} lg:hidden disabled:pointer-events-none disabled:opacity-100`}
          aria-label={toggleAriaLabel}
          aria-expanded={isMobileMenuOpen}
          aria-busy={isMenuToggleLocked}
          aria-controls={drawerId}
        >
          {isMobileMenuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}

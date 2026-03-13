'use client';

import { CreateListingButton } from '@/components/listing/CreateListingButton';

import { CloseIcon, MenuIcon } from './icons';

type MobileToolbarProps = {
  showSkeleton: boolean;
  isMobileMenuOpen: boolean;
  onToggle: () => void;
  toggleAriaLabel: string;
  toggleId: string;
  drawerId: string;
};

export function MobileToolbar({
  showSkeleton,
  isMobileMenuOpen,
  onToggle,
  toggleAriaLabel,
  toggleId,
  drawerId,
}: MobileToolbarProps) {
  return (
    <div className="flex items-center lg:hidden gap-3">
      {showSkeleton ? (
        <div className="h-9 w-20 bg-primary-700/20 rounded-sm animate-pulse" />
      ) : (
        !isMobileMenuOpen && <CreateListingButton variant="mobile" shortLabel />
      )}
      <button
        id={toggleId}
        type="button"
        onClick={onToggle}
        className="lg:hidden text-primary-700 transition-colors duration-200 p-2 select-none hover-only:hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        aria-label={toggleAriaLabel}
        aria-expanded={isMobileMenuOpen}
        aria-controls={drawerId}
        suppressHydrationWarning
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
    </div>
  );
}

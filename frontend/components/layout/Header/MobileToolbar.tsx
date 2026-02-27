'use client';

import { CreateListingButton } from '@/components/listing/CreateListingButton';

import { CloseIcon, MenuIcon } from './icons';

type MobileToolbarProps = {
  showSkeleton: boolean;
  isMobileMenuOpen: boolean;
  onToggle: () => void;
  toggleAriaLabel: string;
};

export function MobileToolbar({
  showSkeleton,
  isMobileMenuOpen,
  onToggle,
  toggleAriaLabel,
}: MobileToolbarProps) {
  return (
    <div className="flex items-center lg:hidden gap-3">
      {showSkeleton ? (
        <div className="h-9 w-20 bg-white/20 rounded-sm animate-pulse" />
      ) : (
        !isMobileMenuOpen && <CreateListingButton variant="mobile" shortLabel />
      )}
      <button
        onClick={onToggle}
        className="lg:hidden text-primary-300 transition-colors duration-200 p-2 select-none"
        aria-label={toggleAriaLabel}
        suppressHydrationWarning
      >
        {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
    </div>
  );
}

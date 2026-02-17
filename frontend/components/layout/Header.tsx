'use client';

import { useComparisonStore } from '@/lib/store';

import { DesktopNav } from './Header/DesktopNav';
import { HeaderLogo } from './Header/HeaderLogo';
import { MobileNavDrawer } from './Header/MobileNavDrawer';
import { MobileToolbar } from './Header/MobileToolbar';
import { useHeaderState } from './Header/useHeaderState';

export function Header() {
  const comparisonCount = useComparisonStore((state) => state.count());
  const {
    user,
    showSkeleton,
    showNav,
    isAuthPage,
    isErrorPage,
    isMobileMenuOpen,
    handleLogout,
    handleMobileMenuToggle,
    handleMobileMenuClose,
    handleSetReturnUrl,
    navLinkClasses,
    mobileNavLinkClasses,
    t,
  } = useHeaderState();

  return (
    <header
      className="bg-primary-700 shadow-lg border-b-2 border-primary-500/20 sticky top-0 z-50 backdrop-blur-sm h-[72px]"
      suppressHydrationWarning
    >
      <div className="container mx-auto px-3 sm:px-4 h-full" suppressHydrationWarning>
        <div className="flex justify-between items-center h-full" suppressHydrationWarning>
          <HeaderLogo brandAlt={t('header.brandName')} />

          {showNav && (
            <MobileToolbar
              showSkeleton={showSkeleton}
              isMobileMenuOpen={isMobileMenuOpen}
              onToggle={handleMobileMenuToggle}
              toggleAriaLabel={t('header.toggleMenu')}
            />
          )}

          <DesktopNav
            user={user}
            showSkeleton={showSkeleton}
            showNav={showNav}
            comparisonCount={comparisonCount}
            isAuthPage={isAuthPage}
            isErrorPage={isErrorPage}
            navLinkClasses={navLinkClasses}
            onLogout={handleLogout}
            onSetReturnUrl={handleSetReturnUrl}
            t={t}
          />
        </div>
      </div>

      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        user={user}
        showSkeleton={showSkeleton}
        showNav={showNav}
        comparisonCount={comparisonCount}
        isAuthPage={isAuthPage}
        isErrorPage={isErrorPage}
        mobileNavLinkClasses={mobileNavLinkClasses}
        onLogout={handleLogout}
        onClose={handleMobileMenuClose}
        onSetReturnUrl={handleSetReturnUrl}
        t={t}
      />
    </header>
  );
}

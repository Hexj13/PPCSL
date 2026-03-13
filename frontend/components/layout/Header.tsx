'use client';

import { useEffect, useRef, useState } from 'react';

import { useComparisonStore } from '@/lib/store';

import { DesktopNav } from './Header/DesktopNav';
import { HeaderLogo } from './Header/HeaderLogo';
import { MobileNavDrawer } from './Header/MobileNavDrawer';
import { MobileToolbar } from './Header/MobileToolbar';
import { useHeaderState } from './Header/useHeaderState';

const MOBILE_DRAWER_ID = 'header-mobile-drawer';
const MOBILE_MENU_TOGGLE_ID = 'header-mobile-menu-toggle';

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [isTelegramWebView, setIsTelegramWebView] = useState(false);
  const comparisonCount = useComparisonStore((state) => state.count());
  const prevMenuOpenRef = useRef(false);
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

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        handleMobileMenuClose();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isMobileMenuOpen, handleMobileMenuClose]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleMobileMenuClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen, handleMobileMenuClose]);

  useEffect(() => {
    if (prevMenuOpenRef.current && !isMobileMenuOpen) {
      document.getElementById(MOBILE_MENU_TOGGLE_ID)?.focus();
    }
    prevMenuOpenRef.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsTelegramWebView('TelegramWebviewProxy' in window);
  }, []);

  return (
    <header
      ref={headerRef}
      className={`bg-bg-base shadow-lg h-[72px] z-50 ${isTelegramWebView ? 'relative' : 'sticky top-0'}`}
      suppressHydrationWarning
    >
      <div
        className="container relative z-[1] mx-auto px-3 sm:px-4 h-full border-b border-primary-700"
        suppressHydrationWarning
      >
        <div className="flex justify-between items-center h-full" suppressHydrationWarning>
          <HeaderLogo brandAlt={t('header.brandName')} />

          {showNav && (
            <MobileToolbar
              showSkeleton={showSkeleton}
              isMobileMenuOpen={isMobileMenuOpen}
              onToggle={handleMobileMenuToggle}
              toggleAriaLabel={t('header.toggleMenu')}
              toggleId={MOBILE_MENU_TOGGLE_ID}
              drawerId={MOBILE_DRAWER_ID}
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

      {isMobileMenuOpen && showNav && (
        <div
          className="lg:hidden fixed inset-0 z-0 bg-transparent"
          aria-hidden
          onClick={handleMobileMenuClose}
          onPointerDown={handleMobileMenuClose}
        />
      )}

      <MobileNavDrawer
        id={MOBILE_DRAWER_ID}
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

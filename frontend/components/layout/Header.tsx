'use client';

import { useEffect, useRef, useState } from 'react';

import { useComparisonStore } from '@/lib/store';

import { DesktopNav } from './Header/DesktopNav';
import { HeaderLogo } from './Header/HeaderLogo';
import { MobileNavDrawer } from './Header/MobileNavDrawer';
import { MobileToolbar } from './Header/MobileToolbar';
import { useHeaderState } from './Header/useHeaderState';

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [isTelegramWebView, setIsTelegramWebView] = useState(false);
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
    setIsTelegramWebView('TelegramWebviewProxy' in window);
  }, []);

  useEffect(() => {
    if (isTelegramWebView) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewportChange = () => {
      if (headerRef.current) {
        headerRef.current.style.transform = `translateZ(0) translateY(${vv.offsetTop}px)`;
      }
    };

    handleViewportChange();
    vv.addEventListener('scroll', handleViewportChange);
    vv.addEventListener('resize', handleViewportChange);

    const headerEl = headerRef.current;
    return () => {
      if (headerEl) {
        headerEl.style.transform = 'translateZ(0)';
      }
      vv.removeEventListener('scroll', handleViewportChange);
      vv.removeEventListener('resize', handleViewportChange);
    };
  }, [isTelegramWebView]);

  return (
    <header
      ref={headerRef}
      style={{ transform: 'translateZ(0)' }}
      className={`bg-primary-700 shadow-lg border-b-2 border-primary-500/20 h-[72px] z-50 ${isTelegramWebView ? 'relative' : 'sticky top-0'}`}
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

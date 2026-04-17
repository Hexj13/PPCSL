'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { isHideFooterPath } from '@/components/layout/header-flow-paths';
import { MOBILE_MENU_ENTER_ANIM_MS, useMenuDrawerPresence } from '@/hooks/useMenuDrawerPresence';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useComparisonStore } from '@/lib/store';

import { DesktopNavActions, DesktopNavMenuArea } from './Header/DesktopNav';
import { HeaderLogo } from './Header/HeaderLogo';
import { MobileNavDrawer } from './Header/MobileNavDrawer';
import { MobileToolbar } from './Header/MobileToolbar';
import { NavSkeleton } from './Header/NavSkeleton';
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

  const pathname = usePathname();
  const showInlineMobileLanguage = isHideFooterPath(pathname) && !isErrorPage;
  const hideMobileCreateListing = isHideFooterPath(pathname);

  const menuWantOpen = isMobileMenuOpen && showNav;
  const { mounted: drawerMounted, exiting: drawerExiting } = useMenuDrawerPresence(menuWantOpen);
  const [enterAnimating, setEnterAnimating] = useState(false);

  useScrollLock(drawerMounted);

  useEffect(() => {
    if (!menuWantOpen) {
      setEnterAnimating(false);
      return undefined;
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? 0 : MOBILE_MENU_ENTER_ANIM_MS;
    if (ms === 0) {
      setEnterAnimating(false);
      return undefined;
    }
    setEnterAnimating(true);
    const id = window.setTimeout(() => setEnterAnimating(false), ms);
    return () => window.clearTimeout(id);
  }, [menuWantOpen]);

  const isMenuToggleLocked = drawerExiting || enterAnimating;

  useEffect(() => {
    if (pathname === '/sign' && isMobileMenuOpen) {
      handleMobileMenuClose();
    }
  }, [pathname, isMobileMenuOpen, handleMobileMenuClose]);

  useEffect(() => {
    if (!drawerMounted) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (headerRef.current && !headerRef.current.contains(target)) {
        handleMobileMenuClose();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [drawerMounted, handleMobileMenuClose]);

  useEffect(() => {
    if (!drawerMounted) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleMobileMenuClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerMounted, handleMobileMenuClose]);

  useEffect(() => {
    if (prevMenuOpenRef.current && !isMobileMenuOpen) {
      document.getElementById(MOBILE_MENU_TOGGLE_ID)?.focus();
    }
    prevMenuOpenRef.current = isMobileMenuOpen;
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsTelegramWebView('TelegramWebviewProxy' in window);
  }, []);

  const backdropMotionClass = drawerExiting
    ? 'mobile-menu-backdrop-leave'
    : 'mobile-menu-backdrop-enter';

  const drawerMotionKey = `${drawerMounted}-${drawerExiting}-${backdropMotionClass}`;

  const mobileMenuBackdrop =
    drawerMounted &&
    showNav &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        key={drawerMotionKey}
        className={`${backdropMotionClass} fixed inset-0 z-40 lg:hidden bg-dark-900/35`}
        aria-hidden
        onPointerDown={handleMobileMenuClose}
      />,
      document.body,
    );

  return (
    <>
      {mobileMenuBackdrop}
      <header
        ref={headerRef}
        className={`flex flex-col bg-bg-base shadow-lg z-50 ${isTelegramWebView ? 'relative' : 'sticky top-0'}`}
        suppressHydrationWarning
      >
        <div className="relative z-20 shrink-0 h-[72px] bg-bg-base">
          <div
            className="container relative mx-auto px-3 sm:px-4 h-full border-b border-primary-700"
            suppressHydrationWarning
          >
            <div
              className="flex justify-between items-center h-full w-full min-w-0 gap-2"
              suppressHydrationWarning
            >
              <HeaderLogo brandAlt={t('header.brandName')} />

              <div className="flex items-center justify-end shrink-0 min-w-0 gap-2 xl:gap-4">
                {showInlineMobileLanguage && (
                  <div className="flex lg:hidden items-center shrink-0">
                    {showSkeleton ? (
                      <NavSkeleton variant="mobileSignGuest" />
                    ) : (
                      <LanguageSwitcher variant="mobile" context="header" />
                    )}
                  </div>
                )}
                {!showNav && !isErrorPage && (
                  <div className="hidden lg:flex items-center shrink-0">
                    {showSkeleton ? (
                      <NavSkeleton variant="desktopSignGuest" />
                    ) : (
                      <LanguageSwitcher variant="desktop" context="header" />
                    )}
                  </div>
                )}
                {showNav && (
                  <MobileToolbar
                    showSkeleton={showSkeleton}
                    isMobileMenuOpen={isMobileMenuOpen}
                    isMenuToggleLocked={isMenuToggleLocked}
                    onToggle={handleMobileMenuToggle}
                    toggleAriaLabel={t('header.toggleMenu')}
                    toggleId={MOBILE_MENU_TOGGLE_ID}
                    drawerId={MOBILE_DRAWER_ID}
                    showMenuToggle={pathname !== '/sign'}
                    showCreateListing={!hideMobileCreateListing}
                  />
                )}
                <DesktopNavMenuArea
                  user={user}
                  showSkeleton={showSkeleton}
                  showNav={showNav}
                  comparisonCount={comparisonCount}
                  navLinkClasses={navLinkClasses}
                  onLogout={handleLogout}
                  t={t}
                />
                {showNav && user && (
                  <div
                    className="hidden lg:block mx-1 h-6 w-px shrink-0 bg-primary-700/30"
                    aria-hidden
                  />
                )}
                <DesktopNavActions
                  user={user}
                  showSkeleton={showSkeleton}
                  showNav={showNav}
                  comparisonCount={comparisonCount}
                  navLinkClasses={navLinkClasses}
                  isAuthPage={isAuthPage}
                  isErrorPage={isErrorPage}
                  onSetReturnUrl={handleSetReturnUrl}
                  t={t}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 h-0 w-full overflow-visible lg:hidden">
          <MobileNavDrawer
            key={drawerMotionKey}
            id={MOBILE_DRAWER_ID}
            presenceMounted={drawerMounted}
            presenceClosing={drawerExiting}
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
        </div>
      </header>
    </>
  );
}

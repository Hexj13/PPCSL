'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

import { MOBILE_MENU_ENTER_ANIM_MS, useMenuDrawerPresence } from '@/hooks/useMenuDrawerPresence';
import { forceReleaseScrollLockToTop, useScrollLock } from '@/hooks/useScrollLock';
import { useComparisonStore } from '@/lib/store';

import {
  HEADER_CATALOG_SEARCH_SHEET_INPUT_ID,
  HeaderCatalogSearch,
} from './Header/HeaderCatalogSearch';
import { HeaderDesktopRow } from './Header/HeaderDesktopRow';
import { HeaderLogo } from './Header/HeaderLogo';
import { HeaderMobileCluster } from './Header/HeaderMobileCluster';
import { MobileNavDrawer } from './Header/MobileNavDrawer';
import { NavSkeleton } from './Header/NavSkeleton';
import { HEADER_INNER_BAR_CLASSES } from './Header/headerBarClasses';
import { resolveHeaderSlots } from './Header/resolveHeaderSlots';
import { useHeaderState } from './Header/useHeaderState';

const MOBILE_DRAWER_ID = 'header-mobile-drawer';
const MOBILE_MENU_TOGGLE_ID = 'header-mobile-menu-toggle';

export function Header() {
  const [isTelegramWebView, setIsTelegramWebView] = useState(false);
  const [isMobileCatalogSearchOpen, setIsMobileCatalogSearchOpen] = useState(false);
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
  const {
    isSignPage,
    showInlineMobileLanguage,
    hideMobileCreateListing,
    showMenuSlot,
    showActionsSlot,
    showCatalogSearch,
    showDesktopLanguage,
  } = resolveHeaderSlots(pathname, showNav, isErrorPage);

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
    if (isSignPage && isMobileMenuOpen) {
      handleMobileMenuClose();
    }
  }, [isSignPage, isMobileMenuOpen, handleMobileMenuClose]);

  useEffect(() => {
    setIsMobileCatalogSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    forceReleaseScrollLockToTop();
  }, [pathname]);

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

  const handleBackdropClick = () => {
    if (enterAnimating) {
      return;
    }
    handleMobileMenuClose();
  };

  const handleMenuToggle = () => {
    setIsMobileCatalogSearchOpen(false);
    handleMobileMenuToggle();
  };

  const handleOpenCatalogSearch = () => {
    handleMobileMenuClose();
    flushSync(() => {
      setIsMobileCatalogSearchOpen(true);
    });
    document.getElementById(HEADER_CATALOG_SEARCH_SHEET_INPUT_ID)?.focus();
  };

  const mobileMenuBackdrop =
    drawerMounted &&
    showNav &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className={`${backdropMotionClass} fixed left-0 right-0 top-[4.5rem] bottom-0 z-40 lg:hidden bg-dark-900/35`}
        aria-hidden
        onClick={handleBackdropClick}
      />,
      document.body,
    );

  return (
    <>
      {mobileMenuBackdrop}
      <header
        className={`flex flex-col bg-bg-base z-50 ${drawerMounted ? '' : 'shadow-lg'} ${isTelegramWebView ? 'relative' : 'sticky top-0'}`}
      >
        <div className="relative z-20 shrink-0 h-[72px] bg-bg-base">
          <div className={HEADER_INNER_BAR_CLASSES}>
            <div className="flex items-center h-full w-full min-w-0 gap-2">
              {showSkeleton ? (
                <NavSkeleton variant="logo" />
              ) : (
                <HeaderLogo brandAlt={t('header.brandName')} />
              )}
              <HeaderDesktopRow
                user={user}
                showSkeleton={showSkeleton}
                showNav={showNav}
                showMenuSlot={showMenuSlot}
                showActionsSlot={showActionsSlot}
                showCatalogSearch={showCatalogSearch}
                showDesktopLanguage={showDesktopLanguage}
                isSignPage={isSignPage}
                comparisonCount={comparisonCount}
                navLinkClasses={navLinkClasses}
                onLogout={handleLogout}
                onSetReturnUrl={handleSetReturnUrl}
                t={t}
              />
              <HeaderMobileCluster
                showInlineMobileLanguage={showInlineMobileLanguage}
                showSkeleton={showSkeleton}
                showNav={showNav}
                isMobileMenuOpen={isMobileMenuOpen}
                isDrawerVisible={drawerMounted}
                isMenuToggleLocked={isMenuToggleLocked}
                onToggle={handleMenuToggle}
                toggleAriaLabel={t('header.toggleMenu')}
                toggleId={MOBILE_MENU_TOGGLE_ID}
                drawerId={MOBILE_DRAWER_ID}
                isSignPage={isSignPage}
                hideMobileCreateListing={hideMobileCreateListing}
                showCatalogSearch={showCatalogSearch}
                catalogSearchOpen={isMobileCatalogSearchOpen}
                catalogSearchAriaLabel={t('header.openCatalogSearch')}
                onOpenCatalogSearch={handleOpenCatalogSearch}
              />
            </div>
          </div>
        </div>
      </header>
      {showCatalogSearch && (
        <HeaderCatalogSearch
          variant="mobile"
          mobileOpen={isMobileCatalogSearchOpen}
          onMobileOpenChange={setIsMobileCatalogSearchOpen}
        />
      )}
      <MobileNavDrawer
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
    </>
  );
}

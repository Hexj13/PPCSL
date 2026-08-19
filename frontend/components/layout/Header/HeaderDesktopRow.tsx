'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import type { User } from '@/lib/api';

import { DesktopNavActions, DesktopNavMenuArea } from './DesktopNav';
import { HeaderCatalogSearch } from './HeaderCatalogSearch';
import { NavSkeleton } from './NavSkeleton';
import { DESKTOP_HEADER_CLUSTER_GAP_CLASSES } from './desktopHeaderGapClasses';
import { HEADER_CATALOG_SEARCH_MIN_WIDTH_PX } from './headerBreakpoints';

function HeaderSlotDivider() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-primary-700/30" aria-hidden />;
}

const NAV_EXPAND_TRANSITION = 'duration-300 ease-out motion-reduce:transition-none';

type HeaderDesktopRowProps = {
  user: User | null;
  showSkeleton: boolean;
  showNav: boolean;
  showMenuSlot: boolean;
  showActionsSlot: boolean;
  showCatalogSearch: boolean;
  showDesktopLanguage: boolean;
  isSignPage: boolean;
  comparisonCount: number;
  navLinkClasses: string;
  onLogout: () => void;
  onSetReturnUrl: (url: string) => void;
  t: (key: string) => string;
};

export function HeaderDesktopRow({
  user,
  showSkeleton,
  showNav,
  showMenuSlot,
  showActionsSlot,
  showCatalogSearch,
  showDesktopLanguage,
  isSignPage,
  comparisonCount,
  navLinkClasses,
  onLogout,
  onSetReturnUrl,
  t,
}: HeaderDesktopRowProps) {
  const searchSlotRef = useRef<HTMLDivElement>(null);
  const [hideNav, setHideNav] = useState(false);

  useEffect(() => {
    if (!showCatalogSearch || showSkeleton) {
      setHideNav(false);
    }
  }, [showCatalogSearch, showSkeleton]);

  const handleSearchActiveChange = useCallback(
    (active: boolean) => {
      if (!active || !showCatalogSearch || showSkeleton) {
        setHideNav(false);
        return;
      }
      setHideNav((alreadyHidden) => {
        if (alreadyHidden) {
          return true;
        }
        const width = searchSlotRef.current?.getBoundingClientRect().width ?? 0;
        return width < HEADER_CATALOG_SEARCH_MIN_WIDTH_PX;
      });
    },
    [showCatalogSearch, showSkeleton],
  );

  return (
    <div
      className={`hidden lg:flex min-w-0 flex-1 items-center ${DESKTOP_HEADER_CLUSTER_GAP_CLASSES}`}
    >
      {showMenuSlot && (
        <div
          data-testid="header-desktop-nav-cluster"
          className={`grid min-w-0 transition-[grid-template-columns] ${NAV_EXPAND_TRANSITION}`}
          style={{ gridTemplateColumns: hideNav ? '0fr' : '1fr' }}
          aria-hidden={hideNav}
          inert={hideNav ? true : undefined}
        >
          <div
            data-testid="header-desktop-nav-cluster-panel"
            className={`min-w-0 transition-opacity ${NAV_EXPAND_TRANSITION} ${
              hideNav ? 'overflow-hidden opacity-0' : 'overflow-visible opacity-100'
            }`}
          >
            <div className={`flex w-max items-center ${DESKTOP_HEADER_CLUSTER_GAP_CLASSES}`}>
              <DesktopNavMenuArea
                user={user}
                showSkeleton={showSkeleton}
                showNav={showNav}
                comparisonCount={comparisonCount}
                navLinkClasses={navLinkClasses}
                t={t}
              />
              {(showCatalogSearch || showActionsSlot) && <HeaderSlotDivider />}
            </div>
          </div>
        </div>
      )}
      {showCatalogSearch ? (
        <div
          ref={searchSlotRef}
          data-testid="header-catalog-search-slot"
          className="min-w-0 flex-1"
        >
          {showSkeleton ? (
            <NavSkeleton variant="desktopCatalogSearch" />
          ) : (
            <HeaderCatalogSearch
              variant="desktop"
              onDesktopActiveChange={handleSearchActiveChange}
            />
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {showCatalogSearch && showActionsSlot && <HeaderSlotDivider />}
      {showActionsSlot && (
        <DesktopNavActions
          user={user}
          showSkeleton={showSkeleton}
          showNav={showNav}
          onLogout={onLogout}
          onSetReturnUrl={onSetReturnUrl}
          t={t}
        />
      )}
      {showDesktopLanguage && (
        <>
          {showActionsSlot && <HeaderSlotDivider />}
          {showSkeleton && isSignPage ? (
            <NavSkeleton variant="desktopSignGuest" />
          ) : (
            <LanguageSwitcher variant="desktop" context="header" />
          )}
        </>
      )}
    </div>
  );
}

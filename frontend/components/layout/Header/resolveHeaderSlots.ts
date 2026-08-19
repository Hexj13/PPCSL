import {
  isAdminPathname,
  isHideFooterPath,
  isSignRoutePathname,
} from '@/components/layout/header-flow-paths';

export function resolveHeaderSlots(
  pathname: string,
  showNav: boolean,
  isErrorPage: boolean,
): {
  isSignPage: boolean;
  showInlineMobileLanguage: boolean;
  hideMobileCreateListing: boolean;
  showMenuSlot: boolean;
  showActionsSlot: boolean;
  showCatalogSearch: boolean;
  showDesktopLanguage: boolean;
} {
  const isSignPage = isSignRoutePathname(pathname);
  const showMenuSlot = showNav && !isSignPage;
  return {
    isSignPage,
    showInlineMobileLanguage: isHideFooterPath(pathname) && !isErrorPage,
    hideMobileCreateListing: isHideFooterPath(pathname),
    showMenuSlot,
    showActionsSlot: showMenuSlot,
    showCatalogSearch: showMenuSlot && !isAdminPathname(pathname),
    showDesktopLanguage: !isErrorPage,
  };
}

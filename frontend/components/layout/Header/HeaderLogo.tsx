'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { getVersionedAssetPath } from '@/lib/assets';
import { clearHomeSearchRestoreState } from '@/lib/clear-home-search-restore-state';
import { loadSiteConfigSync } from '@/lib/site-config';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

import {
  HEADER_LOGO_DESKTOP_SLOT_CLASSES,
  HEADER_LOGO_MOBILE_SLOT_CLASSES,
  HEADER_LOGO_SKELETON_FILL_CLASSES,
  HEADER_LOGO_WRAP_CLASSES,
} from './headerLogoClasses';
import { headerLogoAspectVars, resolveHeaderLogo } from './headerLogoSize';

export const RESET_SEARCH_EVENT = 'ppcsl-reset-search';

type HeaderLogoProps = {
  brandAlt: string;
};

function LogoSlot({
  slotClassName,
  src,
  alt,
  width,
  height,
  testId,
}: {
  slotClassName: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  testId: string;
}) {
  const [isReady, setIsReady] = useState(false);
  const markReady = useCallback(() => setIsReady(true), []);
  const setImageNode = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setIsReady(true);
    }
  }, []);

  return (
    <span className={slotClassName} data-testid={testId}>
      {!isReady ? (
        <span
          className={HEADER_LOGO_SKELETON_FILL_CLASSES}
          data-testid="header-logo-image-skeleton"
        />
      ) : null}
      <Image
        ref={setImageNode}
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`h-full w-full ${isReady ? 'opacity-100' : 'opacity-0'}`}
        priority
        suppressHydrationWarning
        onLoad={markReady}
      />
    </span>
  );
}

export function HeaderLogo({ brandAlt }: HeaderLogoProps) {
  const pathname = usePathname();
  const { href, replace, push } = useLocalizedNavigation();
  const siteConfig = loadSiteConfigSync(getCountry());
  const headerLogo = resolveHeaderLogo(siteConfig.headerLogo);
  const desktopLogoUrl = getVersionedAssetPath('/logo-desktop.svg', siteConfig.assetVersion);
  const mobileLogoUrl = getVersionedAssetPath('/logo-mobile.svg', siteConfig.assetVersion);

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    clearHomeSearchRestoreState();
    window.dispatchEvent(new CustomEvent(RESET_SEARCH_EVENT));
    const homeHref = href('/');
    const { restPath } = stripLocalePrefixFromPathname(pathname ?? '/');
    if (restPath === '/') {
      replace(homeHref, { scroll: false });
    } else {
      push(homeHref);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Link
      href={href('/')}
      onClick={handleClick}
      data-testid="header-logo"
      className={`${HEADER_LOGO_WRAP_CLASSES} hover-only:hover:opacity-90 transition-opacity duration-200`}
      style={headerLogoAspectVars(headerLogo)}
    >
      <LogoSlot
        slotClassName={HEADER_LOGO_DESKTOP_SLOT_CLASSES}
        src={desktopLogoUrl}
        alt={brandAlt}
        width={headerLogo.desktop.width}
        height={headerLogo.desktop.height}
        testId="header-logo-full"
      />
      <LogoSlot
        slotClassName={HEADER_LOGO_MOBILE_SLOT_CLASSES}
        src={mobileLogoUrl}
        alt={brandAlt}
        width={headerLogo.mobile.width}
        height={headerLogo.mobile.height}
        testId="header-logo-short"
      />
    </Link>
  );
}

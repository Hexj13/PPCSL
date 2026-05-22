'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { getVersionedAssetPath } from '@/lib/assets';
import { clearHomeSearchRestoreState } from '@/lib/clear-home-search-restore-state';
import { loadSiteConfigSync } from '@/lib/site-config';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

export const RESET_SEARCH_EVENT = 'kupito-reset-search';

type HeaderLogoProps = {
  brandAlt: string;
};

export function HeaderLogo({ brandAlt }: HeaderLogoProps) {
  const pathname = usePathname();
  const { href, replace, push } = useLocalizedNavigation();
  const siteConfig = loadSiteConfigSync(getCountry());
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
      className="flex shrink-0 items-center h-full min-h-[44px] hover-only:hover:opacity-90 transition-opacity duration-200 select-none mr-4 lg:mr-6"
    >
      <span className="flex items-center h-8 md:h-10">
        <Image
          src={desktopLogoUrl}
          alt={brandAlt}
          width={200}
          height={65}
          className="hidden lg:block h-8 md:h-10 w-auto"
          priority
          suppressHydrationWarning
        />
        <Image
          src={mobileLogoUrl}
          alt={brandAlt}
          width={150}
          height={48}
          className="lg:hidden h-8 w-auto"
          priority
          suppressHydrationWarning
        />
      </span>
    </Link>
  );
}

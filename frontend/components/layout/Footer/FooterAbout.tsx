'use client';

import Image from 'next/image';
import Link from 'next/link';

import { PWAInstallButtonGray } from '@/components/pwa/PWAInstallButtonGray';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { getVersionedAssetPath } from '@/lib/assets';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

import { FooterSocialLinks } from './FooterSocialLinks';

export function FooterAbout() {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();
  const siteConfig = loadSiteConfigSync(getCountry());
  const logoUrl = getVersionedAssetPath('/logo-desktop.svg', siteConfig.assetVersion);

  return (
    <div className="flex flex-col items-start gap-4 sm:col-span-2 lg:max-w-xs lg:shrink-0">
      <PWAInstallButtonGray fullWidth />
      <p className="text-sm leading-relaxed text-white/80" suppressHydrationWarning>
        {t('footer.about')}
      </p>
      <Link
        href={href('/')}
        className="inline-flex transition-opacity duration-200 hover-only:hover:opacity-90"
        aria-label={t('header.brandName')}
      >
        <Image
          src={logoUrl}
          alt={t('header.brandName')}
          width={240}
          height={64}
          className="h-14 w-auto brightness-0 invert"
        />
      </Link>
      <FooterSocialLinks socialLinks={siteConfig.socialLinks} />
    </div>
  );
}

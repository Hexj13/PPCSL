'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { PWAInstallButtonGray } from '@/components/pwa/PWAInstallButtonGray';
import { useTranslation } from '@/hooks/useTranslation';
import type { SiteConfig } from '@/lib/site-config';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

type FooterPartner = NonNullable<SiteConfig['footerPartners']>[number];
type FooterPartnerLogoSurface = NonNullable<SiteConfig['footerPartnerLogoSurfaceDefault']>;

function getPartnerLogoSurfaceClasses(surface: FooterPartnerLogoSurface): string {
  if (surface === 'transparent') {
    return 'flex h-14 w-full items-center justify-center rounded-lg bg-transparent px-2';
  }
  return 'flex h-14 w-full items-center justify-center rounded-lg bg-bg-partnerLogo/95 px-2';
}

function FooterPartnerCard({
  partner,
  logoSurfaceDefault,
  t,
}: {
  partner: FooterPartner;
  logoSurfaceDefault: FooterPartnerLogoSurface;
  t: (key: string) => string;
}) {
  const effectiveLogoSurface = partner.logoSurface ?? logoSurfaceDefault;
  return (
    <a
      href={partner.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-[156px] shrink-0 sm:w-[172px] flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-transform duration-200 hover-only:hover:-translate-y-1 hover-only:hover:bg-white/10"
    >
      <div className={getPartnerLogoSurfaceClasses(effectiveLogoSurface)}>
        <Image
          src={partner.logoSrc}
          alt={partner.name}
          width={partner.logoWidth ?? 189}
          height={partner.logoHeight ?? 48}
          className="h-auto max-h-10 w-auto"
        />
      </div>
      <div className="text-xs sm:text-sm text-white/90 group-hover:text-white text-center">
        {partner.name}
      </div>
      {partner.descriptionKey ? (
        <div className="text-[10px] sm:text-[11px] leading-snug text-white/65 text-center px-0.5">
          {t(partner.descriptionKey)}
        </div>
      ) : null}
    </a>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function subscribeMobileViewport(onChange: () => void) {
  const mq = window.matchMedia('(max-width: 767px)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getMobileViewportSnapshot() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function useMobileViewport() {
  return useSyncExternalStore(subscribeMobileViewport, getMobileViewportSnapshot, () => false);
}

function FooterPartnersRow({
  partners,
  logoSurfaceDefault,
  t,
}: {
  partners: NonNullable<SiteConfig['footerPartners']>;
  logoSurfaceDefault: FooterPartnerLogoSurface;
  t: (key: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [needsCarousel, setNeedsCarousel] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const mobileViewport = useMobileViewport();
  const mobileCarousel = mobileViewport && !prefersReducedMotion;
  const scrollMode = needsCarousel && !mobileCarousel;

  const measure = useCallback(() => {
    const row = trackRef.current;
    const container = containerRef.current;
    if (!row || !container) return;
    const copies = mobileCarousel ? 2 : 1;
    const singleWidth = row.scrollWidth / copies;
    setNeedsCarousel(singleWidth > container.clientWidth + 1);
  }, [mobileCarousel]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    if (trackRef.current) {
      ro.observe(trackRef.current);
    }
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, partners, prefersReducedMotion]);

  const renderCards = (suffix: string) =>
    partners.map((partner, index) => (
      <FooterPartnerCard
        key={`${partner.href}-${index}-${suffix}`}
        partner={partner}
        logoSurfaceDefault={logoSurfaceDefault}
        t={t}
      />
    ));

  const containerClassName = mobileCarousel
    ? 'min-w-0 w-full overflow-hidden pt-1'
    : scrollMode
      ? 'scrollbar-hide min-w-0 w-full overflow-x-auto overflow-y-hidden pt-1'
      : 'min-w-0 w-full overflow-hidden pt-1';

  const trackClassName = mobileCarousel
    ? 'footer-partners-marquee flex w-max flex-nowrap items-start'
    : scrollMode
      ? 'flex w-max flex-nowrap items-start gap-4 md:gap-6'
      : 'flex w-full flex-nowrap items-start justify-center gap-4 md:gap-6';

  const groupClassName = 'flex shrink-0 flex-nowrap items-start gap-4 pr-4 md:gap-6 md:pr-6';

  return (
    <div ref={containerRef} className={containerClassName}>
      <div ref={trackRef} className={trackClassName}>
        {mobileCarousel ? (
          <>
            <div className={groupClassName}>{renderCards('a')}</div>
            <div className={groupClassName}>{renderCards('b')}</div>
          </>
        ) : (
          renderCards('a')
        )}
      </div>
    </div>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const siteConfig = loadSiteConfigSync(getCountry());
  const footerPartners = siteConfig.footerPartners ?? [];
  const footerPartnerLogoSurfaceDefault = siteConfig.footerPartnerLogoSurfaceDefault ?? 'light';

  return (
    <footer className="bg-primary-700 shadow-lg text-white mt-auto border-t-2 border-primary-500/20 backdrop-blur-xs">
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="text-center">
          <div className="flex justify-center mb-6" suppressHydrationWarning>
            <div suppressHydrationWarning>
              <PWAInstallButtonGray mobileApp={siteConfig.mobileApp} />
            </div>
          </div>

          {footerPartners.length > 0 && (
            <div className="mb-6" suppressHydrationWarning>
              <div className="text-sm sm:text-base font-semibold text-white/90 mb-4">
                {t('footer.partnersTitle')}
              </div>
              <FooterPartnersRow
                partners={footerPartners}
                logoSurfaceDefault={footerPartnerLogoSurfaceDefault}
                t={t}
              />
            </div>
          )}

          <div
            className="flex flex-col lg:flex-row justify-center gap-2 lg:gap-4 text-xs sm:text-sm mb-4 mt-6"
            suppressHydrationWarning
          >
            <Link
              href="/faq"
              className="text-white hover-only:hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
              suppressHydrationWarning
            >
              {t('footer.faq')}
            </Link>
            <span className="hidden lg:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/terms"
              className="text-white hover-only:hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
              suppressHydrationWarning
            >
              {t('footer.terms')}
            </Link>
            <span className="hidden lg:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/privacy"
              className="text-white hover-only:hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
              suppressHydrationWarning
            >
              {t('footer.privacy')}
            </Link>
            <span className="hidden lg:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/cookie-settings"
              className="text-white hover-only:hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
              suppressHydrationWarning
            >
              {t('footer.cookieSettings')}
            </Link>
            <span className="hidden lg:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/contacts"
              className="text-white hover-only:hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
              suppressHydrationWarning
            >
              {t('footer.contacts')}
            </Link>
          </div>
          <p className="text-xs sm:text-sm" suppressHydrationWarning>
            <span className="font-medium text-white" suppressHydrationWarning>
              {t('footer.copyright')}
            </span>
            <span className="text-white mx-2">|</span>
            <span className="text-white" suppressHydrationWarning>
              {t('footer.tagline')}
            </span>
          </p>
          <div className="mt-4 flex justify-center" suppressHydrationWarning>
            <LanguageSwitcher variant="desktop" context="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}

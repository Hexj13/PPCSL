'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import type { SiteConfig } from '@/lib/site-config';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

type FooterPartner = NonNullable<SiteConfig['footerPartners']>[number];
type FooterPartnerLogoSurface = NonNullable<SiteConfig['footerPartnerLogoSurfaceDefault']>;

function shuffledFooterPartnersCopy(partners: readonly FooterPartner[]): FooterPartner[] {
  const a = partners.slice() as FooterPartner[];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const logoSurfaceClasses = partner.logoBackgroundColor
    ? 'flex h-14 w-full items-center justify-center rounded-lg px-2'
    : getPartnerLogoSurfaceClasses(effectiveLogoSurface);
  const logoSurfaceStyle = partner.logoBackgroundColor
    ? { backgroundColor: partner.logoBackgroundColor }
    : undefined;
  return (
    <a
      href={partner.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-[156px] shrink-0 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 transition-transform duration-200 hover-only:hover:-translate-y-1 hover-only:hover:bg-white/10 sm:w-[172px]"
    >
      <div className={logoSurfaceClasses} style={logoSurfaceStyle}>
        <Image
          src={partner.logoSrc}
          alt={partner.name}
          width={partner.logoWidth ?? 189}
          height={partner.logoHeight ?? 48}
          className="h-auto max-h-10 w-auto"
        />
      </div>
      <div className="text-center text-xs text-white/90 group-hover:text-white sm:text-sm">
        {partner.name}
      </div>
      {partner.descriptionKey ? (
        <div className="px-0.5 text-center text-[10px] leading-snug text-white/65 sm:text-[11px]">
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
  const [isInViewport, setIsInViewport] = useState(false);
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

  useEffect(() => {
    if (!mobileCarousel) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [mobileCarousel]);

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
    ? `footer-partners-marquee flex w-max flex-nowrap items-start${isInViewport ? '' : ' footer-partners-marquee-paused'}`
    : scrollMode
      ? 'flex w-max flex-nowrap items-start gap-4 px-3 sm:px-4 md:gap-6'
      : 'flex w-full flex-nowrap items-start justify-center gap-4 px-3 sm:px-4 md:gap-6';

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

export function FooterPartners() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const siteConfig = loadSiteConfigSync(getCountry());
  const fromConfig = siteConfig.footerPartners;
  const [partnersInDisplayOrder, setPartnersInDisplayOrder] = useState<FooterPartner[]>(() => [
    ...(fromConfig ?? []),
  ]);
  const footerPartnerLogoSurfaceDefault = siteConfig.footerPartnerLogoSurfaceDefault ?? 'light';

  useLayoutEffect(() => {
    if (!fromConfig?.length) {
      return;
    }
    setPartnersInDisplayOrder(shuffledFooterPartnersCopy(fromConfig));
  }, [pathname, fromConfig]);

  if (partnersInDisplayOrder.length === 0) {
    return null;
  }

  return (
    <section
      className="border-b border-primary-500/40 bg-primary-700"
      aria-labelledby="footer-partners-title"
      suppressHydrationWarning
    >
      <div className="py-6 md:py-8">
        <h2
          id="footer-partners-title"
          className="container mx-auto mb-4 px-3 text-center text-sm font-semibold leading-none text-white sm:px-4 sm:text-base"
          suppressHydrationWarning
        >
          {t('footer.partnersTitle')}
        </h2>
        <FooterPartnersRow
          partners={partnersInDisplayOrder}
          logoSurfaceDefault={footerPartnerLogoSurfaceDefault}
          t={t}
        />
      </div>
    </section>
  );
}

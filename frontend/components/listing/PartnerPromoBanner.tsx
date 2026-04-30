'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { preserveHomeScrollPosition } from '@/lib/preserve-home-scroll';
import { blurhashToDataURL } from '@/lib/utils/blurhash';

const DISMISS_FADE_MS = 300;

const PARTNER_BANNER_BLUR_HASH = 'L85?L}DPM0.luNR6MeyC8_xutkM{';
const PARTNER_BANNER_BLUR_DATA_URL = blurhashToDataURL(PARTNER_BANNER_BLUR_HASH);

const features = [
  {
    key: 'sync',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    ),
  },
  {
    key: 'promotion',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    key: 'visibility',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
  },
] as const;

type PartnerPromoBannerProps = {
  onDismiss: () => void | Promise<void>;
};

export function PartnerPromoBanner({ onDismiss }: PartnerPromoBannerProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!exiting) return;
    const id = window.setTimeout(() => {
      void Promise.resolve(onDismiss());
    }, DISMISS_FADE_MS + 50);
    return () => window.clearTimeout(id);
  }, [exiting, onDismiss]);

  return (
    <section
      data-testid="partner-promo-banner"
      className={`overflow-hidden rounded-xl bg-gradient-to-br from-primary-900 via-primary-900 to-primary-700 text-white shadow-lg border border-primary-500/30 transition-opacity duration-300 ease-out ${exiting ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.48fr)_minmax(0,1fr)_minmax(200px,0.3fr)] lg:items-stretch lg:gap-4 xl:grid-cols-[minmax(280px,0.55fr)_minmax(0,0.82fr)_minmax(250px,0.32fr)] xl:gap-6">
        <div className="relative min-h-[180px] overflow-hidden sm:min-h-[220px] lg:min-h-0 lg:h-full">
          <Image
            src="/partner-banner.webp"
            alt={t('listings.partnerPromo.imageAlt')}
            fill
            priority
            placeholder={PARTNER_BANNER_BLUR_DATA_URL ? 'blur' : undefined}
            blurDataURL={PARTNER_BANNER_BLUR_DATA_URL}
            sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 44vw, 100vw"
            className="object-cover object-left [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_100%)] [mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_100%)] lg:[-webkit-mask-image:linear-gradient(to_right,black_0%,black_45%,transparent_100%)] lg:[mask-image:linear-gradient(to_right,black_0%,black_45%,transparent_100%)]"
          />
        </div>

        <div className="flex max-w-3xl flex-col justify-center px-4 pb-0 sm:px-5 lg:px-0 lg:py-5 lg:pl-6 xl:pl-8">
          <h2 className="text-base md:text-lg font-bold leading-tight mb-3">
            <span>{t('listings.partnerPromo.titleQuestion')}</span>{' '}
            <span className="text-primary-100">
              {t('listings.partnerPromo.titlePartnerLead')}
              <Link
                href="/partners"
                onClick={() => preserveHomeScrollPosition(pathname)}
                className="text-primary-100 underline decoration-primary-100 underline-offset-2 transition-colors duration-200 hover-only:hover:decoration-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
              >
                {t('listings.partnerPromo.titlePartnerEmphasis')}
              </Link>
              {t('listings.partnerPromo.titlePartnerTail')}
            </span>
          </h2>
          <p className="text-sm leading-relaxed text-primary-50/95 max-w-2xl mb-3">
            {t('listings.partnerPromo.description')}
          </p>
          <div className="flex flex-col gap-2.5">
            {features.map((feature) => (
              <div key={feature.key} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/30 border border-primary-300/40">
                  <svg
                    className="h-4.5 w-4.5 text-primary-50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {feature.icon}
                  </svg>
                </span>
                <span className="text-sm font-medium leading-snug text-white">
                  {t(`listings.partnerPromo.features.${feature.key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 mb-4 flex flex-col gap-5 border-t border-primary-300/30 p-4 sm:mx-5 sm:mb-5 sm:p-5 lg:mt-4 lg:mb-4 lg:mr-3 lg:ml-0 lg:border-l lg:border-t-0 lg:border-primary-300/30 lg:pl-6 xl:m-5 xl:ml-0">
          <div className="text-center">
            <h3 className="text-base md:text-lg font-bold text-white">
              {t('listings.partnerPromo.sideTitle')}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-primary-50/90">
              {t('listings.partnerPromo.sideDescription')}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <Link
              href="/partners"
              onClick={() => preserveHomeScrollPosition(pathname)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border-2 border-primary-200 bg-primary-500 px-4 text-sm font-bold text-white transition-colors duration-200 hover-only:hover:border-primary-100 active:border-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
            >
              {t('listings.partnerPromo.cta')}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <button
              type="button"
              disabled={exiting}
              onClick={() => setExiting(true)}
              className="self-center text-xs leading-snug font-medium text-primary-300 underline decoration-primary-300 underline-offset-2 transition-colors duration-200 hover-only:hover:text-primary-100 hover-only:hover:decoration-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-100 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 rounded-sm disabled:opacity-50"
            >
              {t('listings.partnerPromo.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

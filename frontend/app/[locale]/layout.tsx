import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';

import { DeferredTelemetry } from '@/components/DeferredTelemetry';
import { ProfileSaveSuccessToast } from '@/components/ProfileSaveSuccessToast';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { GoogleAnalyticsConsent } from '@/components/analytics/GoogleAnalyticsConsent';
import { GoogleTagManager } from '@/components/analytics/GoogleTagManager';
import { GoogleTagManagerNoscript } from '@/components/analytics/GoogleTagManagerNoscript';
import { OrganizationSchema } from '@/components/analytics/OrganizationSchema';
import { WebsiteSearchSchema } from '@/components/analytics/WebsiteSearchSchema';
import { AuthGuardsShell } from '@/components/auth/AuthGuardsShell';
import { ConditionalFooter } from '@/components/layout/ConditionalFooter';
import { Header } from '@/components/layout/Header';
import { NavSkeleton } from '@/components/layout/Header/NavSkeleton';
import { HEADER_INNER_BAR_CLASSES } from '@/components/layout/Header/headerBarClasses';
import { LocaleHtmlLang } from '@/components/layout/LocaleHtmlLang';
import { LocaleHtmlLangScript } from '@/components/layout/LocaleHtmlLangScript';
import { MainContentShell } from '@/components/layout/MainContentShell';
import { ScrollReset } from '@/components/layout/ScrollReset';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ClientToaster } from '@/components/providers/ClientToaster';
import { CookieConsent } from '@/components/providers/CookieConsent';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { getVersionedAssetPath } from '@/lib/assets';
import {
  getMetadataLocaleFromParams,
  getServerTranslations,
  type LocaleRouteParams,
} from '@/lib/i18n';
import { resolveLocaleRouting } from '@/lib/locale-routing';
import { buildSiteRobotsMetadata } from '@/lib/robots-metadata';
import { loadSiteConfig, loadSiteConfigSync } from '@/lib/site-config';
import { loadThemeSync } from '@/lib/theme';
import { absoluteUrlWithLocalePrefix } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });
const theme = loadThemeSync(getCountry());

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<LocaleRouteParams>;
};

export function generateStaticParams() {
  const routing = resolveLocaleRouting(loadSiteConfigSync(getCountry()));
  return routing.supportedLocales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  const siteConfig = await loadSiteConfig(getCountry());
  const metadataLocale = await getMetadataLocaleFromParams(params);
  const t = getServerTranslations(metadataLocale);

  const defaultTitle = siteConfig.name;
  const defaultDescription = t.metadata.site.defaultDescription;
  const faviconIcoUrl = getVersionedAssetPath('/favicon.ico', siteConfig.assetVersion);
  const favicon192Url = getVersionedAssetPath('/favicon-192.png', siteConfig.assetVersion);
  const favicon512Url = getVersionedAssetPath('/favicon-512.png', siteConfig.assetVersion);
  const favicon64Url = getVersionedAssetPath('/favicon-64.png', siteConfig.assetVersion);
  const favicon32Url = getVersionedAssetPath('/favicon-32.png', siteConfig.assetVersion);
  const appleIconUrl = getVersionedAssetPath('/logo.png', siteConfig.assetVersion);
  const manifestUrl = getVersionedAssetPath('/manifest.json', siteConfig.assetVersion);

  return {
    metadataBase: new URL(siteConfig.siteUrl),
    title: {
      default: defaultTitle,
      template: `%s | ${siteConfig.name}`,
    },
    description: defaultDescription,
    keywords: t.metadata.site.keywords,
    authors: [{ name: siteConfig.name }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: metadataLocale === 'ru' ? 'ru_RU' : siteConfig.locale,
      url: absoluteUrlWithLocalePrefix(siteConfig.siteUrl, '/', metadataLocale),
      siteName: siteConfig.name,
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: `${siteConfig.siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: `${siteConfig.siteUrl}/opengraph-image`,
          alt: siteConfig.name,
        },
      ],
    },
    robots: buildSiteRobotsMetadata({
      googleBotExtra: {
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    }),
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    },
    icons: {
      icon: [
        { url: faviconIcoUrl, sizes: 'any' },
        { url: favicon192Url, sizes: '192x192', type: 'image/png' },
        { url: favicon512Url, sizes: '512x512', type: 'image/png' },
        { url: favicon64Url, sizes: '64x64', type: 'image/png' },
        { url: favicon32Url, sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: appleIconUrl, sizes: '180x180', type: 'image/png' }],
    },
    manifest: manifestUrl,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: siteConfig.name,
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: theme.pwa?.themeColor || '#40916B',
  colorScheme: 'light',
  userScalable: true,
};

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 flex flex-col bg-bg-base shadow-lg" aria-hidden>
      <div className="relative z-20 h-[72px] shrink-0 bg-bg-base">
        <div className={HEADER_INNER_BAR_CLASSES}>
          <div className="flex h-full w-full min-w-0 items-center gap-2">
            <NavSkeleton variant="logo" />
            <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex xl:gap-4">
              <NavSkeleton variant="desktopLinks" />
              <div className="min-w-0 flex-1">
                <NavSkeleton variant="desktopCatalogSearch" />
              </div>
              <NavSkeleton variant="desktopActions" />
              <NavSkeleton variant="desktopSignGuest" />
            </div>
            <div className="ml-auto flex items-center gap-2 lg:hidden">
              <NavSkeleton variant="mobileCatalogSearch" />
              <div className="h-10 w-10 shrink-0 rounded-lg bg-primary-700/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const siteConfig = await loadSiteConfig(getCountry());
  const initialLocale = await getMetadataLocaleFromParams(params);

  return (
    <div className={inter.className}>
      <LocaleHtmlLangScript locale={initialLocale} />
      <LocaleHtmlLang locale={initialLocale} />
      <Suspense fallback={null}>
        <GoogleTagManager />
        <GoogleTagManagerNoscript title={siteConfig.name} />
        <GoogleAnalyticsConsent />
        <GoogleAnalytics />
        <OrganizationSchema locale={initialLocale} />
        <WebsiteSearchSchema locale={initialLocale} />
        <I18nProvider
          initialLocale={initialLocale}
          initialTranslations={getServerTranslations(initialLocale)}
        >
          <CookieConsent />
          <AuthProvider>
            <AuthGuardsShell>
              <ProfileSaveSuccessToast />
              <DeferredTelemetry />
              <ScrollReset />
              <Suspense fallback={null}>
                <div className="min-h-screen flex flex-col">
                  <Suspense fallback={<HeaderFallback />}>
                    <Header />
                  </Suspense>
                  <OfflineBanner />
                  <main className="grow container mx-auto px-3 sm:px-4 py-6 md:py-8">
                    <MainContentShell>{children}</MainContentShell>
                  </main>
                  <ConditionalFooter />
                </div>
              </Suspense>
              <Suspense fallback={null}>
                <ClientToaster />
              </Suspense>
            </AuthGuardsShell>
          </AuthProvider>
        </I18nProvider>
      </Suspense>
    </div>
  );
}

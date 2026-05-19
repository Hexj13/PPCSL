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
import { MainContentShell } from '@/components/layout/MainContentShell';
import { ScrollReset } from '@/components/layout/ScrollReset';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { CookieConsent } from '@/components/providers/CookieConsent';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { getVersionedAssetPath } from '@/lib/assets';
import { getServerTranslations, getMetadataLocale } from '@/lib/i18n';
import { loadSiteConfig } from '@/lib/site-config';
import { loadThemeSync } from '@/lib/theme';
import { Toaster } from '@/lib/toast';
import { absoluteUrlWithLocalePrefix } from '@/lib/url-locale';
import { getCountry } from '@/lib/utils';
import { designTokens } from '@/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });
const theme = loadThemeSync(getCountry());

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await loadSiteConfig(getCountry());

  const metadataLocale = await getMetadataLocale();

  const t = getServerTranslations(metadataLocale);

  const defaultTitle = `${siteConfig.name} - ${t.metadata.site.defaultTitle}`;
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
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
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
  themeColor: theme.pwa?.themeColor || '#40916B',
  userScalable: true,
};

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 flex flex-col bg-bg-base shadow-lg" aria-hidden>
      <div className="relative z-20 h-[72px] shrink-0 bg-bg-base">
        <div className="container relative mx-auto h-full border-b border-primary-700 px-3 sm:px-4">
          <div className="flex h-full w-full min-w-0 items-center justify-between gap-2">
            <div className="h-6 w-16 rounded-sm bg-primary-700/20" />
            <div className="flex items-center justify-end gap-2 xl:gap-4">
              <div className="h-10 w-28 shrink-0 rounded-lg bg-primary-700/20" />
              <div className="hidden h-10 w-44 rounded-lg bg-primary-700/20 lg:block" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteConfig = await loadSiteConfig(getCountry());

  const initialLocale = await getMetadataLocale();

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Suspense fallback={null}>
          <QueryProvider>
            <GoogleTagManager />
            <GoogleTagManagerNoscript title={siteConfig.name} />
            <GoogleAnalyticsConsent />
            <GoogleAnalytics />
            <OrganizationSchema />
            <WebsiteSearchSchema />
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
                    <Toaster
                      position="top-right"
                      containerStyle={{
                        top: '80px',
                        zIndex: designTokens.zIndex.toast,
                      }}
                      toastOptions={{
                        style: {
                          zIndex: designTokens.zIndex.toast,
                          minWidth: '320px',
                          maxWidth: '400px',
                          width: '100%',
                          background: '#FFFFFF',
                          color: '#1B1B1B',
                          border: '2px solid rgba(74, 154, 126, 0.4)',
                          borderRadius: '0.75rem',
                          padding: '16px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        },
                        success: {
                          style: {
                            background: '#FFFFFF',
                            color: '#1B1B1B',
                            border: '2px solid rgba(40, 167, 69, 0.6)',
                            borderRadius: '0.75rem',
                            padding: '16px',
                            boxShadow:
                              '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                          },
                        },
                        error: {
                          style: {
                            background: '#FFFFFF',
                            color: '#1B1B1B',
                            border: '2px solid rgba(220, 53, 69, 0.6)',
                            borderRadius: '0.75rem',
                            padding: '16px',
                            boxShadow:
                              '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                          },
                        },
                      }}
                    />
                  </Suspense>
                </AuthGuardsShell>
              </AuthProvider>
            </I18nProvider>
          </QueryProvider>
        </Suspense>
      </body>
    </html>
  );
}

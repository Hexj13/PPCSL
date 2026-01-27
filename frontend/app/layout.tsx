import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/components/AuthProvider';
import { CookieConsent } from '@/components/CookieConsent';
import { ExternalLinkTracker } from '@/components/ExternalLinkTracker';
import { Footer } from '@/components/Footer';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { GoogleAnalyticsConsent } from '@/components/GoogleAnalyticsConsent';
import { GoogleTagManager, GoogleTagManagerNoscript } from '@/components/GoogleTagManager';
import { Header } from '@/components/Header';
import { I18nProvider } from '@/components/I18nProvider';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OrganizationSchema } from '@/components/OrganizationSchema';
import { PageScrollTracker } from '@/components/PageScrollTracker';
import { ProfileSaveSuccessToast } from '@/components/ProfileSaveSuccessToast';
import { RegisterPageBodyClass } from '@/components/RegisterPageBodyClass';
import { ScrollReset } from '@/components/ScrollReset';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { getServerTranslations, type Locale } from '@/lib/i18n';
import { loadSiteConfig } from '@/lib/site-config';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'], display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const siteConfig = await loadSiteConfig(country);

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('kupito-locale')?.value;
  const defaultLocale = siteConfig.locale.split('-')[0] as Locale;
  const enableLanguageSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER === 'true';

  let metadataLocale: Locale = defaultLocale;
  if (enableLanguageSwitcher && localeCookie && (localeCookie === 'ro' || localeCookie === 'ru')) {
    metadataLocale = localeCookie as Locale;
  }

  const t = getServerTranslations(metadataLocale);

  const defaultTitle = `${siteConfig.name} - ${t.metadata.site.defaultTitle}`;
  const defaultDescription = t.metadata.site.defaultDescription;

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
      locale: siteConfig.locale,
      url: siteConfig.siteUrl,
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
      images: [`${siteConfig.siteUrl}/opengraph-image`],
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
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
        { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
        { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
        { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
    },
    manifest: '/manifest.json',
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
  themeColor: '#40916B',
  userScalable: true,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'md';
  const siteConfig = await loadSiteConfig(country);

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('kupito-locale')?.value;
  const defaultLocale = siteConfig.locale.split('-')[0] as Locale;
  const enableLanguageSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER === 'true';

  let initialLocale: Locale = defaultLocale;
  if (enableLanguageSwitcher && localeCookie && (localeCookie === 'ro' || localeCookie === 'ru')) {
    initialLocale = localeCookie as Locale;
  }

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
        <GoogleTagManager />
        <GoogleTagManagerNoscript />
        <GoogleAnalyticsConsent />
        <GoogleAnalytics />
        <OrganizationSchema />
        <CookieConsent />
        <I18nProvider initialLocale={initialLocale}>
          <AuthProvider>
            <RegisterPageBodyClass />
            <ProfileSaveSuccessToast />
            <ServiceWorkerRegistration />
            <ScrollReset />
            <PageScrollTracker />
            <ExternalLinkTracker />
            <div className="min-h-screen flex flex-col">
              <Header />
              <OfflineBanner />
              <main className="flex-grow container mx-auto px-3 sm:px-4 py-6 md:py-8 register-page-main">
                {children}
              </main>
              <Footer />
            </div>
            <Toaster
              position="top-right"
              containerStyle={{
                top: '80px',
              }}
              toastOptions={{
                style: {
                  zIndex: 40,
                  minWidth: '320px',
                  maxWidth: '400px',
                  width: '100%',
                  background: '#F5F5F5',
                  color: '#1B1B1B',
                  border: '2px solid rgba(74, 154, 126, 0.4)',
                  borderRadius: '0.75rem',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#28A745',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: '#F5F5F5',
                    color: '#1B1B1B',
                    border: '2px solid rgba(40, 167, 69, 0.6)',
                    borderRadius: '0.75rem',
                    padding: '16px',
                    boxShadow:
                      '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#DC3545',
                    secondary: '#ffffff',
                  },
                  style: {
                    background: '#F5F5F5',
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
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

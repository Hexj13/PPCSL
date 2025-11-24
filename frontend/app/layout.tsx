import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/components/AuthProvider';
import { CookieConsent } from '@/components/CookieConsent';
import { Footer } from '@/components/Footer';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { GoogleAnalyticsConsent } from '@/components/GoogleAnalyticsConsent';
import { GoogleTagManager, GoogleTagManagerNoscript } from '@/components/GoogleTagManager';
import { Header } from '@/components/Header';
import { OrganizationSchema } from '@/components/OrganizationSchema';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';
const siteName = 'Kupito';
const defaultTitle = 'Kupito - Автомобили во Македонија';
const defaultDescription = 'Купете или продадете авто на Kupito!';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    'автомобили',
    'купи автомобил',
    'продади автомобил',
    'користени автомобили',
    'нови автомобили',
    'Северна Македонија',
    'Скопје',
    'автомобили Македонија',
    'авто плаза',
    'автомобили за продажба',
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'mk_MK',
    url: siteUrl,
    siteName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    images: [`${siteUrl}/opengraph-image`],
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
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mk" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <GoogleTagManager />
        <GoogleTagManagerNoscript />
        <GoogleAnalyticsConsent />
        <GoogleAnalytics />
        <OrganizationSchema />
        <CookieConsent />
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-3 sm:px-4 py-6 md:py-8">
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
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/components/AuthProvider';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Kupito - Автомобильная площадка Северной Македонии',
  description: 'Продажа новых и подержанных автомобилей в Северной Македонии',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mk">
      <body className={inter.className}>
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

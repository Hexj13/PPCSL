import type { ReactNode } from 'react';

import { getDefaultLocale } from '@/lib/i18n';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={getDefaultLocale()} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

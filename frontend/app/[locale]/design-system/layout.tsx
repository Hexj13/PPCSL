import type { Metadata } from 'next';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const siteConfig = loadSiteConfigSync(getCountry());

export const metadata: Metadata = {
  title: `Design System - ${siteConfig.name}`,
  description: 'Interactive design system documentation',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="grow">{children}</main>
    </div>
  );
}

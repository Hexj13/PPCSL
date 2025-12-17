import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design System - Kupito',
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
      <main className="flex-grow">{children}</main>
    </div>
  );
}

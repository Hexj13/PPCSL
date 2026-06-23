/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

import { I18nProvider } from '@/components/providers/I18nProvider';
import type { Translations } from '@/lib/i18n';

import { UserDesktopNavLinks } from './UserDesktopNav';

function Tree({ children }: { children: ReactNode }) {
  return (
    <I18nProvider initialLocale="ru" initialTranslations={{} as Translations}>
      {children}
    </I18nProvider>
  );
}

describe('UserDesktopNavLinks', () => {
  it('uses /ru-prefixed hrefs when locale is ru', () => {
    render(
      <Tree>
        <UserDesktopNavLinks
          comparisonCount={0}
          navLinkClasses="x"
          userType="Business"
          t={(k) => k}
        />
      </Tree>,
    );

    expect(screen.getByRole('link', { name: 'header.listings' })).toHaveAttribute('href', '/ru');
    expect(screen.getByRole('link', { name: 'header.myListings' })).toHaveAttribute(
      'href',
      '/ru/my-listings',
    );
    expect(screen.getByRole('link', { name: 'header.favorites' })).toHaveAttribute(
      'href',
      '/ru/favorites',
    );
    expect(screen.getByRole('link', { name: 'header.compare' })).toHaveAttribute(
      'href',
      '/ru/compare',
    );
    expect(screen.getByRole('link', { name: 'header.forBusiness' })).toHaveAttribute(
      'href',
      '/ru/partners',
    );
  });

  it('hides the for-business link for individual users', () => {
    render(
      <Tree>
        <UserDesktopNavLinks
          comparisonCount={0}
          navLinkClasses="x"
          userType="Individual"
          t={(k) => k}
        />
      </Tree>,
    );

    expect(screen.queryByRole('link', { name: 'header.forBusiness' })).toBeNull();
  });
});

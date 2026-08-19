/**
 * @jest-environment jsdom
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'en' }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } }),
}));

import { CreateListingButton } from './CreateListingButton';

describe('CreateListingButton', () => {
  it('uses the short Post label in the mobile toolbar and hides it below 360px', () => {
    render(<CreateListingButton variant="mobile" />);

    expect(screen.queryByText('header.createListing')).toBeNull();
    expect(screen.getByText('header.createListingShort')).toHaveClass('max-[359px]:hidden');
  });

  it('keeps the full Post Listing label in the mobile drawer', () => {
    render(<CreateListingButton variant="mobile" drawerCta />);

    expect(screen.getByText('header.createListing')).toBeInTheDocument();
    expect(screen.queryByText('header.createListingShort')).toBeNull();
  });

  it('uses the short Post label below xl on desktop', () => {
    render(<CreateListingButton variant="desktop" />);

    expect(screen.getByText('header.createListing')).toHaveClass('hidden', 'xl:inline');
    expect(screen.getByText('header.createListingShort')).toHaveClass('xl:hidden');
  });
});

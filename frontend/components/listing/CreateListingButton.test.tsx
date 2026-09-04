import { render, screen } from '@testing-library/react';
import React from 'react';

import { CreateListingButton } from './CreateListingButton';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'header.createListing': 'Post Listing',
        'header.createListingShort': 'Post',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'en' }),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: () => ({ user: null }),
}));

describe('CreateListingButton', () => {
  it('keeps the compact header CTA from shrinking below its label', () => {
    render(<CreateListingButton variant="mobile" />);

    const link = screen.getByRole('link', { name: 'Post Listing' });
    expect(link.className.split(/\s+/)).toContain('shrink-0');
    expect(link.className.split(/\s+/)).not.toContain('shrink');
    expect(link.className.split(/\s+/)).not.toContain('min-w-0');
  });

  it('exposes the full action name when the compact label is hidden', () => {
    render(<CreateListingButton variant="mobile" />);

    expect(screen.getByRole('link', { name: 'Post Listing' })).toHaveAttribute(
      'aria-label',
      'Post Listing',
    );
    expect(screen.getByText('Post')).toBeInTheDocument();
  });
});

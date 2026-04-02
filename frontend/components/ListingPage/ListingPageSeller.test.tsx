import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Listing } from '@/lib/api';

import { ListingPageSeller } from './ListingPageSeller';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'listingDetail.contactInfo': 'Contact Information',
        'listingDetail.sellerType': 'Seller type',
        'listingDetail.business': 'Business',
        'listingDetail.individual': 'Individual',
        'listingDetail.city': 'City',
        'listingDetail.email': 'Email',
        'listingDetail.copyEmail': 'Copy email',
        'listingDetail.phone': 'Main number',
        'listingDetail.phoneWhenSole': 'Phone number',
        'listingDetail.copyPhone': 'Copy number',
        'listingDetail.additionalPhone': 'Additional number',
        'listingDetail.revealAdditionalPhone': 'Reveal additional number',
        'listingDetail.hideAdditionalPhone': 'Hide additional number',
        'listingDetail.copied': 'Copied',
        'listingDetail.copyError': 'Copy error',
        'listingDetail.availableMessengers': 'Messengers',
      })[key] ?? key,
  }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'en' }),
}));

jest.mock('@/hooks/useCities', () => ({
  useCities: () => ({
    cities: [{ name: 'Chisinau', nameEn: 'Chisinau', nameRu: 'Кишинёв' }],
    loading: false,
  }),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: { contactSeller: jest.fn() },
  buildListingViewItemParams: jest.fn(() => ({})),
}));

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'l1',
    title: 'Car',
    city: 'Chisinau',
    status: 'Active',
    category: 'vehicle',
    condition: 'Used',
    registration_type: 'Registered',
    last_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: 'u1',
      email: 'seller@test.com',
      type: 'Business',
      phone: '+37361111111',
      additionalPhone: '+49891234567',
      companyName: 'Acme',
    },
    ...overrides,
  } as Listing;
}

describe('ListingPageSeller', () => {
  it('shows additional phone after primary phone and reveals on button click', async () => {
    const user = userEvent.setup();
    const listing = makeListing();
    render(
      <ListingPageSeller
        listing={listing}
        listingId={listing.id}
        activeListingsCount={1}
        boardSlug={null}
      />,
    );

    const masked = '+49891234567'.replace(/./g, '*');
    expect(screen.getByText(masked)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '+49891234567' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal additional number' }));

    expect(screen.getByRole('link', { name: '+49891234567' })).toHaveAttribute(
      'href',
      'tel:+49891234567',
    );
    expect(screen.queryByText(masked)).not.toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Listing } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

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
        'listingDetail.revealPhone': 'Reveal number',
        'listingDetail.hidePhone': 'Hide number',
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

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api');
  return {
    ...actual,
    listingsApi: {
      ...actual.listingsApi,
      getPhones: jest.fn().mockResolvedValue({
        data: {
          phone: '+37361111111',
          additionalPhone: '+49891234567',
        },
      }),
    },
  };
});

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
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
      phone: '+37361111***',
      additionalPhone: '+49891234***',
      companyName: 'Acme',
    },
    ...overrides,
  } as Listing;
}

describe('ListingPageSeller', () => {
  beforeEach(() => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: { id: 'viewer-other', type: 'Individual' } }),
    );
  });

  it('renders masked phones from server and reveals both on eye click', async () => {
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

    expect(screen.getByText('+373 61 111 ***')).toBeInTheDocument();
    expect(screen.getByText('+49 89 1234***')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '+373 61 111 111' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Copy number')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal number' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '+373 61 111 111' })).toHaveAttribute(
        'href',
        'tel:+37361111111',
      );
    });
    expect(screen.getByTitle('Copy number')).toBeInTheDocument();
    expect(screen.queryByText('+373 61 111 ***')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reveal additional number' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '+49 89 1234567' })).toHaveAttribute(
        'href',
        'tel:+49891234567',
      );
    });
    expect(screen.getAllByTitle('Copy number').length).toBe(2);
    expect(screen.queryByText('+49 89 1234***')).not.toBeInTheDocument();
  });

  it('owner with full phones: no reveal control, copy and tel link', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: { id: 'u1', type: 'Business' } }),
    );
    const listing = makeListing({
      user: {
        id: 'u1',
        email: 'seller@test.com',
        type: 'Business',
        phone: '+37361111111',
        additionalPhone: '+49891234567',
        companyName: 'Acme',
      },
    });
    render(
      <ListingPageSeller
        listing={listing}
        listingId={listing.id}
        activeListingsCount={1}
        boardSlug={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Reveal number' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reveal additional number' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+373 61 111 111' })).toHaveAttribute(
      'href',
      'tel:+37361111111',
    );
    expect(screen.getByRole('link', { name: '+49 89 1234567' })).toHaveAttribute(
      'href',
      'tel:+49891234567',
    );
    expect(screen.getAllByTitle('Copy number').length).toBe(2);
  });

  it('admin with full phones: no reveal control, copy and tel link', () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({ user: { id: 'admin-1', type: 'Admin' } }),
    );
    const listing = makeListing({
      user: {
        id: 'seller-99',
        email: 'seller@test.com',
        type: 'Business',
        phone: '+37361111111',
        additionalPhone: '+49891234567',
        companyName: 'Acme',
      },
    });
    render(
      <ListingPageSeller
        listing={listing}
        listingId={listing.id}
        activeListingsCount={1}
        boardSlug={null}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Reveal number' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+373 61 111 111' })).toBeInTheDocument();
    expect(screen.getAllByTitle('Copy number').length).toBe(2);
  });
});

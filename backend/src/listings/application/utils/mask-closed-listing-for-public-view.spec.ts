import {
  maskClosedListingForPublicView,
  type ListingLikeWithApprox,
} from './mask-closed-listing-for-public-view';

describe('maskClosedListingForPublicView', () => {
  it('clears price currency approx and seller contacts when status is Closed', () => {
    const listing = {
      status: 'Closed',
      price: 1000,
      currency: 'EUR',
      approxPriceDefaultCurrency: 900,
      user: {
        phone: '+1',
        email: 'a@b.c',
        firstName: 'A',
        lastName: 'B',
        companyName: 'C',
        companyWebsiteUrl: 'https://x.test',
        additionalPhone: '+4989',
      },
    } as unknown as ListingLikeWithApprox;

    maskClosedListingForPublicView(listing);

    expect(listing.price).toBeUndefined();
    expect(listing.currency).toBeUndefined();
    expect(listing.approxPriceDefaultCurrency).toBeNull();
    expect(listing.user?.phone).toBeNull();
    expect(listing.user?.additionalPhone).toBeNull();
    expect(listing.user?.email).toBeNull();
  });

  it('does nothing when status is not Closed', () => {
    const listing = {
      status: 'Active',
      price: 1000,
      currency: 'EUR',
    } as unknown as ListingLikeWithApprox;

    maskClosedListingForPublicView(listing);

    expect(listing.price).toBe(1000);
    expect(listing.currency).toBe('EUR');
  });
});

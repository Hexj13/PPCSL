import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import type { Listing } from '../../entities/listing.entity';

export type ListingLikeWithApprox = Listing & {
  approxPriceDefaultCurrency?: number | null;
};

export function maskClosedListingForPublicView(listing: ListingLikeWithApprox): void {
  if (listing.status !== ListingStatusEnum.Closed) {
    return;
  }
  (listing as Partial<Listing>).price = undefined;
  (listing as Partial<Listing>).currency = undefined;
  listing.approxPriceDefaultCurrency = null;
  if (listing.user) {
    listing.user.phone = null;
    listing.user.email = null;
    listing.user.firstName = null;
    listing.user.lastName = null;
    listing.user.companyName = null;
    listing.user.companyWebsiteUrl = null;
  }
}

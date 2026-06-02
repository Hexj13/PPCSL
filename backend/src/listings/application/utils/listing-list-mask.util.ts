import { ListingStatus as ListingStatusEnum } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { maskPhoneLastDigits } from '../../../common/utils/phone-mask.util';
import type { Listing } from '../../entities/listing.entity';

import { stripListingVideoForListResponse } from './listing-video-public.util';

const MAX_SEARCH_IMAGES = 5;

export function maskListingsForListResponse(listings: Listing[]): Listing[] {
  return listings.map((listing) => {
    if (listing.images && listing.images.length > MAX_SEARCH_IMAGES) {
      listing.images = listing.images.slice(0, MAX_SEARCH_IMAGES);
    }
    if (listing.user) {
      listing.user = removePasswordFromUser(listing.user) as typeof listing.user;
      if (
        listing.status === ListingStatusEnum.Closed ||
        (!listing.user.email && !listing.user.phone)
      ) {
        listing.user.phone = null;
        listing.user.additionalPhone = null;
        listing.user.email = null;
        listing.user.firstName = null;
        listing.user.lastName = null;
        listing.user.companyName = null;
        listing.user.companyWebsiteUrl = null;
      } else {
        if (listing.user.phone) {
          listing.user.phone = maskPhoneLastDigits(listing.user.phone);
        }
        if (listing.user.additionalPhone) {
          listing.user.additionalPhone = maskPhoneLastDigits(listing.user.additionalPhone);
        }
      }
    }
    stripListingVideoForListResponse(listing);
    return listing;
  });
}

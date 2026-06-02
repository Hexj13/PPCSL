import { Injectable } from '@nestjs/common';

import { Listing } from '../../entities/listing.entity';
import { maskListingsForListResponse } from '../utils/listing-list-mask.util';

@Injectable()
export class ListingPublicViewMapper {
  toListViews(listings: Listing[]): Listing[] {
    return maskListingsForListResponse(listings);
  }

  toListView(listing: Listing): Listing {
    return maskListingsForListResponse([listing])[0];
  }
}

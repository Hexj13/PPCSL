import { ListingCategory } from '../constants';
import type { ListingCategory as ListingCategoryValue } from '../types';

export function inferListingCategoryFromPayload(input: {
  category?: ListingCategoryValue;
  vehicle?: unknown;
  tire?: unknown;
}): ListingCategoryValue {
  if (input.category != null) {
    return input.category;
  }
  if (input.tire != null && input.vehicle == null) {
    return ListingCategory.Tire;
  }
  if (input.vehicle != null && input.tire == null) {
    return ListingCategory.Vehicle;
  }
  return ListingCategory.Vehicle;
}

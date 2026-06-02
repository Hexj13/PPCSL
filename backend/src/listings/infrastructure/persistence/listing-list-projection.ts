export const LISTING_CARD_LISTING_FIELDS = [
  'listing.id',
  'listing.title',
  'listing.price',
  'listing.currency',
  'listing.city',
  'listing.status',
  'listing.images',
  'listing.cover_blur_hash',
  'listing.urgent',
  'listing.is_new',
  'listing.is_promoted',
  'listing.promoted_until',
  'listing.views',
  'listing.condition',
  'listing.registration_type',
  'listing.category',
  'listing.created_at',
  'listing.last_updated_at',
  'listing.slug',
] as const;

export const LISTING_CARD_VEHICLE_FIELDS = [
  'vehicle.id',
  'vehicle.year',
  'vehicle.fuel',
  'vehicle.transmission',
  'vehicle.mileage_km',
  'vehicle.body_type',
  'vehicle.engine_displ_l',
  'vehicle.color',
  'vehicle.doors',
  'vehicle.drive_type',
] as const;

export const LISTING_CARD_BRAND_FIELDS = ['brand.id', 'brand.name', 'brand.logoUrl'] as const;

export const LISTING_CARD_MODEL_FIELDS = ['model.id', 'model.name', 'model.vehicle_types'] as const;

export const LISTING_CARD_USER_FIELDS = [
  'user.id',
  'user.type',
  'user.phone',
  'user.firstName',
  'user.lastName',
  'user.companyName',
  'user.companyWebsiteUrl',
] as const;

export const LISTING_HAS_VIDEO_SELECT = `(CASE WHEN listing.video IS NOT NULL AND listing.video::text <> 'null' AND listing.video::text <> '{}' THEN true ELSE false END)`;

export const ACTIVELY_PROMOTED_SQL = `(CASE WHEN listing.is_promoted = true AND (listing.promoted_until IS NULL OR listing.promoted_until > NOW()) THEN 1 ELSE 0 END)`;

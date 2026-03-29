import type { Listing } from '../../listings/entities/listing.entity';
import { ListingCategory } from '../constants';

export type ListingAuditChange = {
  field: string;
  before: unknown;
  after: unknown;
};

const DESCRIPTION_PREVIEW_MAX = 80;

export function maskVinForLog(vin: string | null | undefined): string | null {
  if (vin == null || vin === '') return null;
  if (vin.length <= 4) return '****';
  return `****${vin.slice(-4)}`;
}

export function descriptionForAuditLog(description: string | null | undefined): {
  length: number;
  preview: string;
} {
  if (description == null || description === '') {
    return { length: 0, preview: '' };
  }
  const plain = description
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const preview =
    plain.length <= DESCRIPTION_PREVIEW_MAX ? plain : `${plain.slice(0, DESCRIPTION_PREVIEW_MAX)}…`;
  return { length: plain.length, preview };
}

export function imagesForAuditLog(images: string[] | null | undefined): {
  count: number;
  paths: string[];
} {
  if (!images?.length) {
    return { count: 0, paths: [] };
  }
  const paths = images.map((u) => {
    try {
      return new URL(u).pathname;
    } catch {
      return u.split('?')[0];
    }
  });
  return { count: images.length, paths };
}

function normalizeEquipment(equipment: string[] | null | undefined): string[] | null {
  if (equipment == null || equipment.length === 0) {
    return null;
  }
  return [...equipment].sort();
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function buildListingAuditSnapshot(listing: Listing): Record<string, unknown> {
  const snap: Record<string, unknown> = {
    category: listing.category,
    price: listing.price,
    currency: listing.currency,
    city: listing.city,
    negotiable: listing.negotiable,
    available_in_credit: listing.available_in_credit,
    down_payment_amount: listing.down_payment_amount ?? null,
    description: descriptionForAuditLog(listing.description),
    images: imagesForAuditLog(listing.images ?? null),
    title: listing.title,
    urgent: listing.urgent,
    is_new: listing.is_new,
    vin: maskVinForLog(listing.vin),
    condition: listing.condition ?? null,
    registration_type: listing.registration_type ?? null,
    horsepower: listing.horsepower ?? null,
    power_kw: listing.power_kw ?? null,
    equipment: normalizeEquipment(listing.equipment),
    image_blur_hash_count: listing.image_blur_hashes?.length ?? 0,
    has_cover_blur_hash: Boolean(listing.cover_blur_hash),
  };

  if (listing.category === ListingCategory.Tire) {
    const t = listing.tire;
    if (t) {
      snap['tire.brand_id'] = t.brand_id;
      snap['tire.model_id'] = t.model_id;
      snap['tire.tire_vehicle_type'] = t.tire_vehicle_type;
      snap['tire.season'] = t.season;
      snap['tire.condition'] = t.condition;
      snap['tire.width_mm'] = t.width_mm;
      snap['tire.aspect_ratio'] = t.aspect_ratio;
      snap['tire.diameter_inch'] = num(t.diameter_inch);
      snap['tire.quantity'] = t.quantity;
      snap['tire.load_index'] = t.load_index;
      snap['tire.speed_index'] = t.speed_index;
      snap['tire.studded'] = t.studded ?? null;
      snap['tire.run_flat'] = t.run_flat ?? null;
      snap['tire.reinforced_xl'] = t.reinforced_xl ?? null;
      snap['tire.spare_donut'] = t.spare_donut ?? null;
      snap['tire.tubeless'] = t.tubeless ?? null;
      snap['tire.acoustic'] = t.acoustic ?? null;
    }
  } else {
    const v = listing.vehicle;
    if (v) {
      snap['vehicle.brand_id'] = v.brand_id;
      snap['vehicle.model_id'] = v.model_id;
      snap['vehicle.year'] = v.year;
      snap['vehicle.engine_displ_l'] = num(v.engine_displ_l);
      snap['vehicle.mileage_km'] = v.mileage_km ?? null;
      snap['vehicle.fuel'] = v.fuel ?? null;
      snap['vehicle.transmission'] = v.transmission ?? null;
      snap['vehicle.drive_type'] = v.drive_type ?? null;
      snap['vehicle.body_type'] = v.body_type;
      snap['vehicle.color'] = v.color ?? null;
      snap['vehicle.doors'] = v.doors ?? null;
    }
  }

  return snap;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffListingAuditSnapshots(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): ListingAuditChange[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: ListingAuditChange[] = [];
  for (const field of [...keys].sort()) {
    const bv = before[field];
    const av = after[field];
    if (!valuesEqual(bv, av)) {
      changes.push({ field, before: bv ?? null, after: av ?? null });
    }
  }
  return changes;
}

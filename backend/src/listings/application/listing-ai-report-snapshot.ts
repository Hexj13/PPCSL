import * as crypto from 'crypto';

import * as constants from '../../common/constants';
import type { Listing } from '../entities/listing.entity';

import type { AiReportLanguage } from './listing-ai-report.types';

export interface ListingAiModelSnapshotVehicle {
  year: number;
  mileage_km: number | null;
  fuel: string | null;
  transmission: string | null;
  drive_type: string | null;
  body_type: string;
  brand_name: string | null;
  model_name: string | null;
  engine_displ_l: number | null;
  color: string | null;
  doors: number | null;
}

export interface ListingAiInputSnapshot {
  listingId: string;
  reportLanguage: AiReportLanguage;
  category: string;
  title: string;
  price: number;
  currency: string;
  negotiable: boolean;
  city: string;
  descriptionForReport: string | null;
  registration_type: string | null;
  registration_semantic_hint: string | null;
  equipment: string[];
  condition: string | null;
  is_new: boolean;
  status: string;
  last_updated_at: string;
  vehicle: ListingAiModelSnapshotVehicle | null;
}

const REGISTRATION_HINTS: Record<string, string> = {
  Local: 'Local registration in country; local plate context.',
  Foreign: 'Foreign registration; paperwork and import context.',
  Cleared: 'Customs cleared; typical post-clearance tax and document questions.',
  NotCleared: 'Not customs cleared; uncertainty on timelines and clearance cost.',
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function registrationSemanticHint(
  registrationType: string | null | undefined,
): string | null {
  if (registrationType == null) {
    return 'Registration type not stated in listing; do not assume.';
  }
  return REGISTRATION_HINTS[registrationType] ?? null;
}

export function descriptionForReportLanguage(
  listing: Listing,
  reportLanguage: AiReportLanguage,
): string | null {
  if (reportLanguage === 'ru') {
    return (
      listing.description_ru?.trim() ||
      listing.description_ro?.trim() ||
      listing.description?.trim() ||
      null
    );
  }
  return (
    listing.description_ro?.trim() ||
    listing.description_ru?.trim() ||
    listing.description?.trim() ||
    null
  );
}

export function buildListingAiInputSnapshot(
  listing: Listing,
  reportLanguage: AiReportLanguage,
): ListingAiInputSnapshot {
  const registration_type = listing.registration_type ?? null;
  const equipment = [...(listing.equipment ?? [])].filter(Boolean).sort();
  const v = listing.vehicle;
  const vehicle: ListingAiModelSnapshotVehicle | null = v
    ? {
        year: v.year,
        mileage_km: v.mileage_km ?? null,
        fuel: v.fuel ?? null,
        transmission: v.transmission ?? null,
        drive_type: v.drive_type ?? null,
        body_type: v.body_type,
        brand_name: v.brand?.name ?? null,
        model_name: v.model?.name ?? null,
        engine_displ_l: v.engine_displ_l != null ? Number(v.engine_displ_l) : null,
        color: v.color ?? null,
        doors: v.doors ?? null,
      }
    : null;

  return {
    listingId: listing.id,
    reportLanguage,
    category: listing.category,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    negotiable: listing.negotiable,
    city: listing.city,
    descriptionForReport: descriptionForReportLanguage(listing, reportLanguage),
    registration_type,
    registration_semantic_hint: registrationSemanticHint(registration_type),
    equipment,
    condition: listing.condition ?? null,
    is_new: listing.is_new,
    status: listing.status,
    last_updated_at:
      listing.last_updated_at instanceof Date
        ? listing.last_updated_at.toISOString()
        : String(listing.last_updated_at),
    vehicle,
  };
}

export function computeListingAiInputHash(snapshot: ListingAiInputSnapshot): string {
  const canonical = stableStringify(snapshot);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function isVehicleListingForAiReport(listing: Listing): boolean {
  if (listing.category === constants.ListingCategory.Tire) {
    return false;
  }
  return listing.category === constants.ListingCategory.Vehicle || listing.category == null;
}

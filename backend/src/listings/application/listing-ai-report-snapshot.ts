import * as crypto from 'crypto';

import * as constants from '../../common/constants';
import type { Listing } from '../entities/listing.entity';

import { AI_LISTING_REPORT_SCHEMA_VERSION, type AiReportLanguage } from './listing-ai-report.types';

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
  country_of_origin: string | null;
  owners_count: number | null;
  interior_color: string | null;
  seats: number | null;
}

export interface ListingAiDataCompletenessSnapshot {
  filled_fields: string[];
  missing_fields: string[];
  important_missing_fields: string[];
  optional_missing_fields: string[];
  completeness_percent: number;
  score_hint: number;
}

export interface ListingAiInputSnapshot {
  reportSchemaVersion: number;
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
  availability: string | null;
  is_new: boolean;
  status: string;
  last_updated_at: string;
  images_count: number;
  has_video: boolean;
  vin_present: boolean;
  data_completeness: ListingAiDataCompletenessSnapshot;
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

export function buildDataCompletenessSnapshot(params: {
  title: string;
  descriptionForReport: string | null;
  city: string;
  registration_type: string | null;
  condition: string | null;
  availability: string | null;
  equipment: string[];
  vin_present: boolean;
  images_count: number;
  has_video: boolean;
  vehicle: ListingAiModelSnapshotVehicle | null;
}): ListingAiDataCompletenessSnapshot {
  const checks: Array<{ field: string; filled: boolean; weight: number; optional?: boolean }> = [
    { field: 'title', filled: params.title.trim().length > 0, weight: 8 },
    {
      field: 'description',
      filled: (params.descriptionForReport?.trim().length ?? 0) > 0,
      weight: 12,
    },
    { field: 'city', filled: params.city.trim().length > 0, weight: 5 },
    { field: 'registration_type', filled: params.registration_type != null, weight: 6 },
    { field: 'condition', filled: params.condition != null, weight: 6 },
    { field: 'availability', filled: (params.availability?.trim().length ?? 0) > 0, weight: 4 },
    { field: 'equipment', filled: params.equipment.length > 0, weight: 5 },
    { field: 'vin', filled: params.vin_present, weight: 4, optional: true },
    { field: 'photos', filled: params.images_count > 0, weight: 10 },
    { field: 'video', filled: params.has_video, weight: 2, optional: true },
    { field: 'vehicle_year', filled: params.vehicle?.year != null, weight: 8 },
    { field: 'vehicle_mileage', filled: params.vehicle?.mileage_km != null, weight: 8 },
    { field: 'vehicle_fuel', filled: params.vehicle?.fuel != null, weight: 5 },
    { field: 'vehicle_transmission', filled: params.vehicle?.transmission != null, weight: 5 },
    {
      field: 'vehicle_drive_type',
      filled: params.vehicle?.drive_type != null,
      weight: 3,
      optional: true,
    },
    {
      field: 'vehicle_body_type',
      filled: (params.vehicle?.body_type?.trim().length ?? 0) > 0,
      weight: 5,
    },
    {
      field: 'vehicle_brand',
      filled: (params.vehicle?.brand_name?.trim().length ?? 0) > 0,
      weight: 8,
    },
    {
      field: 'vehicle_model',
      filled: (params.vehicle?.model_name?.trim().length ?? 0) > 0,
      weight: 8,
    },
    {
      field: 'vehicle_engine',
      filled: params.vehicle?.engine_displ_l != null,
      weight: 4,
      optional: true,
    },
    {
      field: 'vehicle_color',
      filled: (params.vehicle?.color?.trim().length ?? 0) > 0,
      weight: 2,
      optional: true,
    },
    { field: 'vehicle_doors', filled: params.vehicle?.doors != null, weight: 2, optional: true },
    {
      field: 'vehicle_country_of_origin',
      filled: (params.vehicle?.country_of_origin?.trim().length ?? 0) > 0,
      weight: 3,
      optional: true,
    },
    {
      field: 'vehicle_owners_count',
      filled: params.vehicle?.owners_count != null,
      weight: 4,
      optional: true,
    },
    {
      field: 'vehicle_interior_color',
      filled: (params.vehicle?.interior_color?.trim().length ?? 0) > 0,
      weight: 2,
      optional: true,
    },
    { field: 'vehicle_seats', filled: params.vehicle?.seats != null, weight: 2, optional: true },
  ];

  const filled_fields = checks.filter((c) => c.filled).map((c) => c.field);
  const missing_fields = checks.filter((c) => !c.filled).map((c) => c.field);
  const important_missing_fields = checks
    .filter((c) => !c.filled && !c.optional)
    .map((c) => c.field);
  const optional_missing_fields = checks.filter((c) => !c.filled && c.optional).map((c) => c.field);
  const completeness_percent =
    checks.length === 0 ? 0 : Math.round((filled_fields.length / checks.length) * 100);
  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const filledWeight = checks
    .filter((check) => check.filled)
    .reduce((sum, check) => sum + check.weight, 0);
  const score_hint = totalWeight === 0 ? 0 : Math.round((filledWeight / totalWeight) * 100);

  return {
    filled_fields,
    missing_fields,
    important_missing_fields,
    optional_missing_fields,
    completeness_percent,
    score_hint,
  };
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
        country_of_origin: v.country_of_origin ?? null,
        owners_count: v.owners_count ?? null,
        interior_color: v.interior_color ?? null,
        seats: v.seats ?? null,
      }
    : null;

  const images = listing.images?.filter(Boolean) ?? [];
  const descriptionForReport = descriptionForReportLanguage(listing, reportLanguage);
  const vin_present = typeof listing.vin === 'string' && listing.vin.trim().length > 0;
  const has_video = listing.video != null;
  const images_count = images.length;

  return {
    reportSchemaVersion: AI_LISTING_REPORT_SCHEMA_VERSION,
    listingId: listing.id,
    reportLanguage,
    category: listing.category,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    negotiable: listing.negotiable,
    city: listing.city,
    descriptionForReport,
    registration_type,
    registration_semantic_hint: registrationSemanticHint(registration_type),
    equipment,
    condition: listing.condition ?? null,
    availability: listing.availability,
    is_new: listing.is_new,
    status: listing.status,
    last_updated_at:
      listing.last_updated_at instanceof Date
        ? listing.last_updated_at.toISOString()
        : String(listing.last_updated_at),
    images_count,
    has_video,
    vin_present,
    data_completeness: buildDataCompletenessSnapshot({
      title: listing.title,
      descriptionForReport,
      city: listing.city,
      registration_type,
      condition: listing.condition ?? null,
      availability: listing.availability,
      equipment,
      vin_present,
      images_count,
      has_video,
      vehicle,
    }),
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

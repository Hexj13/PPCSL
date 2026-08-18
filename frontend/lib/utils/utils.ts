import type { Listing } from '@/lib/api';
import type { Locale } from '@/lib/i18n-types';

import { VEHICLE_TYPE_BY_BODY_TYPE } from '../constants';
import { loadSiteConfigSync } from '../site-config';
import { localePrefixPath } from '../url-locale';

export const isBrowser = typeof window !== 'undefined';

const VIN_MASKED_REGEX = /^[A-HJ-NPR-Z0-9]{4}\*{9}[A-HJ-NPR-Z0-9]{4}$/i;

export function isVinMasked(vin: string | undefined): boolean {
  return !!vin?.trim() && VIN_MASKED_REGEX.test(vin.trim());
}

export function getCountry(): string {
  return process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md';
}

export function getLocale(): string {
  const siteConfig = loadSiteConfigSync(getCountry());
  return siteConfig.locale.split('-')[0];
}

export type LabeledOption<T = string> = { value: T; label: string };

function getCollator(): Intl.Collator {
  const locale = getLocale();
  return new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
}

export function compareNames(a: string, b: string): number {
  const collator = getCollator();
  return collator.compare(a, b);
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  const collator = getCollator();
  return [...items].sort((a, b) => collator.compare(a.name, b.name));
}

export function sortOptionsByLabel<T>(options: Array<LabeledOption<T>>): Array<LabeledOption<T>> {
  const collator = getCollator();
  return [...options].sort((a, b) => collator.compare(a.label, b.label));
}

export function formatPrice(price: number | undefined, currency?: string): string {
  if (price === undefined || price === null) {
    return '';
  }

  if (!currency) {
    const siteConfig = loadSiteConfigSync(getCountry());
    currency = siteConfig.currency;
  }

  const integerPrice = Math.floor(price);
  return integerPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const DISPLAY_TIME_ZONE = 'Europe/Chisinau';

export function formatDate(date: string | Date, locale?: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const currentLocale = locale || getLocale();
  return d.toLocaleDateString(currentLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TIME_ZONE,
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: DISPLAY_TIME_ZONE,
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${day}.${month}.${year}`;
}

export function formatAdminTableDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function getCalendarDayKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

export function formatDateRelative(
  date: string | Date,
  t: (_key: string, _params?: Record<string, string | number>) => string,
  locale?: string,
): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const todayKey = getCalendarDayKey(new Date());
  const dateKey = getCalendarDayKey(d);

  const today = new Date(`${todayKey}T00:00:00Z`);
  const dateOnly = new Date(`${dateKey}T00:00:00Z`);

  const diffTime = today.getTime() - dateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return t('common.today');
  } else if (diffDays > 0 && diffDays <= 7) {
    const currentLocale = locale || getLocale();

    if (currentLocale === 'ru') {
      let dayWord: string;
      if (diffDays === 1) {
        dayWord = 'день';
      } else if (diffDays >= 2 && diffDays <= 4) {
        dayWord = 'дня';
      } else {
        dayWord = 'дней';
      }
      return `${diffDays} ${dayWord} назад`;
    }

    if (currentLocale === 'ro') {
      if (diffDays === 1) {
        return 'acum o zi';
      }
      return `acum ${diffDays} zile`;
    }

    return t('common.daysAgo', { days: diffDays });
  } else {
    return formatDateShort(date);
  }
}

export function formatDateLong(date: string | Date, locale?: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const currentLocale = locale || getLocale();
  return d.toLocaleDateString(currentLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  });
}

export function formatEngineVolume(volume: number): string {
  const num = parseFloat(volume.toString());
  const formatted = num.toFixed(3);
  return formatted.replace(/\.?0+$/, '');
}

export function formatThousandsWithSpaces(value: string): string {
  if (!value) return '';
  const numericValue = value.replace(/\s/g, '');
  if (!numericValue) return '';
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatMileage(mileage: number): string {
  return formatThousandsWithSpaces(mileage.toString());
}

export function formatViewsCompact(views: number): string {
  if (views < 1000) return views.toString();
  const k = Math.floor(views / 100) / 10;
  return `${k}k`;
}

export function formatTransmission(
  transmission: string | undefined,
  t: (_key: string) => string,
): string {
  if (!transmission) return '';
  switch (transmission) {
    case 'Manual':
      return t('vehicleOptions.transmission.Manual');
    case 'Automatic':
      return t('vehicleOptions.transmission.Automatic');
    case 'CVT':
      return t('vehicleOptions.transmission.CVT');
    case 'Robot':
      return t('vehicleOptions.transmission.Robot');
    default:
      return transmission;
  }
}

export function formatDriveType(
  driveType: string | undefined,
  t: (_key: string) => string,
): string {
  if (!driveType) return '';
  switch (driveType) {
    case 'FWD':
      return t('vehicleOptions.driveType.FWD');
    case 'RWD':
      return t('vehicleOptions.driveType.RWD');
    case 'AWD':
      return t('vehicleOptions.driveType.AWD');
    default:
      return driveType;
  }
}

export function formatRegistrationType(
  registrationType: string | undefined,
  t: (_key: string) => string,
): string {
  if (!registrationType) return '';
  switch (registrationType) {
    case 'Local':
      return t('searchFilters.registrationTypeOptions.Local');
    case 'Foreign':
      return t('searchFilters.registrationTypeOptions.Foreign');
    case 'Cleared':
      return t('searchFilters.registrationTypeOptions.Cleared');
    case 'NotCleared':
      return t('searchFilters.registrationTypeOptions.NotCleared');
    default:
      return registrationType;
  }
}

export function formatBodyType(bodyType: string | undefined, t: (_key: string) => string): string {
  if (!bodyType) return '';
  try {
    return t(`vehicleOptions.bodyType.${bodyType}`);
  } catch {
    return bodyType;
  }
}

export function formatFuel(fuel: string | undefined, t: (_key: string) => string): string {
  if (!fuel) return '';
  switch (fuel) {
    case 'Petrol':
      return t('vehicleOptions.fuel.Petrol');
    case 'Diesel':
      return t('vehicleOptions.fuel.Diesel');
    case 'Electric':
      return t('vehicleOptions.fuel.Electric');
    case 'Hybrid':
      return t('vehicleOptions.fuel.Hybrid');
    case 'MHEV':
      return t('vehicleOptions.fuel.MHEV');
    case 'PHEV':
      return t('vehicleOptions.fuel.PHEV');
    case 'LPG':
      return t('vehicleOptions.fuel.LPG');
    default:
      return fuel;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function normalizeUrl(url: string): string {
  if (url.startsWith('http://')) {
    if (isBrowser && window.location.protocol === 'https:') {
      return url.replace('http://', 'https://');
    }
    if (process.env.NODE_ENV === 'production') {
      return url.replace('http://', 'https://');
    }
  }
  return url;
}

export function getOptimizedImageUrl(
  imageUrl: string,
  quality: number = 75,
  width?: number,
): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    return imageUrl;
  }

  let relativePath = '';

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const url = new URL(imageUrl);
      const pathname = url.pathname;

      if (pathname.startsWith('/uploads/')) {
        relativePath = pathname.substring('/uploads/'.length);
      } else if (pathname.startsWith('/api/upload/image/')) {
        return normalizeUrl(imageUrl);
      } else {
        return normalizeUrl(imageUrl);
      }
    } catch {
      return normalizeUrl(imageUrl);
    }
  } else if (imageUrl.startsWith('/uploads/')) {
    relativePath = imageUrl.substring('/uploads/'.length);
  } else if (imageUrl.startsWith('/')) {
    relativePath = imageUrl.substring(1);
  } else {
    relativePath = imageUrl;
  }

  if (!relativePath) {
    return imageUrl;
  }

  const params = new URLSearchParams();
  if (quality) {
    params.set('quality', quality.toString());
  }
  if (width) {
    params.set('width', width.toString());
  }

  const queryString = params.toString();
  const IMAGE_CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL;
  const baseUrl = IMAGE_CDN_URL ? normalizeUrl(IMAGE_CDN_URL) : normalizeUrl(API_URL);
  return `${baseUrl}/api/upload/image/${encodeURIComponent(relativePath)}${queryString ? `?${queryString}` : ''}`;
}

export function getCityNameMk(cityNameEn: string | undefined): string {
  if (!cityNameEn) return '';
  return cityNameEn;
}

export interface City {
  name: string;
  nameEn: string;
  nameRu?: string;
}

const SINGERA_ALIASES = new Set(['sângera', 'sangera']);

export function findCity(cities: City[], query: string | undefined): City | undefined {
  if (!query) {
    return undefined;
  }
  const normalized = query.toLowerCase();
  return cities.find((city) => {
    if (
      city.name.toLowerCase() === normalized ||
      city.nameEn.toLowerCase() === normalized ||
      city.nameRu?.toLowerCase() === normalized
    ) {
      return true;
    }
    return city.name === 'Sîngera' && SINGERA_ALIASES.has(normalized);
  });
}

export function getCityName(
  cityNameEn: string | undefined,
  locale: string,
  cities?: City[],
): string {
  if (!cityNameEn) return '';

  if (cities && cities.length > 0) {
    const city = findCity(cities, cityNameEn);
    if (city) {
      if (getCountry() === 'al') {
        return city.nameEn;
      }
      if (locale === 'ro') {
        return city.name;
      }
      if (locale === 'ru' && city.nameRu) {
        return `${city.nameRu} (${city.name})`;
      }
      if (locale === 'en') {
        return city.nameEn;
      }
      return city.name;
    }
    return cityNameEn;
  }

  if (getCountry() === 'mk') {
    return getCityNameMk(cityNameEn);
  }

  return cityNameEn;
}

export function getCityNamePlain(
  cityNameEn: string | undefined,
  locale: string,
  cities?: City[],
): string {
  if (!cityNameEn) return '';

  if (cities && cities.length > 0) {
    const city = findCity(cities, cityNameEn);
    if (city) {
      if (getCountry() === 'al') {
        return city.nameEn;
      }
      if (locale === 'ro') {
        return city.name;
      }
      if (locale === 'ru' && city.nameRu) {
        return city.nameRu;
      }
      if (locale === 'en') {
        return city.nameEn;
      }
      return city.name;
    }
    return cityNameEn;
  }

  if (getCountry() === 'mk') {
    return getCityNameMk(cityNameEn);
  }

  return cityNameEn;
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function getPhoneWithCountryCode(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  const callingCode = getCountry() === 'al' ? '355' : '373';
  const nationalDigits = getCountry() === 'al' ? 9 : 8;
  if (digits.startsWith(callingCode)) {
    return digits;
  }
  if (digits.length === nationalDigits) {
    return `${callingCode}${digits}`;
  }
  return digits;
}

export function getTelegramUrl(phone: string | undefined): string | null {
  if (!phone) return null;
  const withCountryCode = getPhoneWithCountryCode(phone);
  return `https://t.me/+${withCountryCode}`;
}

export function getWhatsAppUrl(phone: string | undefined): string | null {
  if (!phone) return null;
  const withCountryCode = getPhoneWithCountryCode(phone);
  return `https://wa.me/${withCountryCode}`;
}

export function getViberUrl(phone: string | undefined): string | null {
  if (!phone) return null;
  const withCountryCode = getPhoneWithCountryCode(phone);
  return `viber://chat?number=${withCountryCode}`;
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',
};

function transliterateCyrillic(text: string): string {
  return text.replace(/[а-яёієїґ]/g, (ch) => CYRILLIC_TO_LATIN[ch] ?? '');
}

export function createSlug(text: string): string {
  return transliterateCyrillic(text.toLowerCase())
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugMatches(urlSlug: string, name: string): boolean {
  const normalizedUrl = createSlug(urlSlug.trim()).replace(/-/g, '');
  const normalizedName = createSlug(name).replace(/-/g, '');
  return normalizedUrl === normalizedName;
}

export function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const LISTING_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function extractListingIdFromRouteParam(param: string): string | null {
  const trimmed = param.trim();
  if (!trimmed) {
    return null;
  }
  if (LISTING_UUID_REGEX.test(trimmed)) {
    return trimmed;
  }
  const m = trimmed.match(/^(.+)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (!m || !m[1] || !m[2]) {
    return null;
  }
  return m[2];
}

export function getListingPublicPathSegment(listing: Pick<Listing, 'id' | 'slug'>): string {
  const part = listing.slug?.trim();
  if (!part) {
    return listing.id;
  }
  return `${part}-${listing.id}`;
}

export function getListingHref(listing: Pick<Listing, 'id' | 'slug'>, locale?: Locale): string {
  const base = `/listings/${getListingPublicPathSegment(listing)}`;
  if (!locale) {
    return base;
  }
  return localePrefixPath(base, locale);
}

export function horsepowerToKw(hp: number): number {
  return Math.round(hp * 0.73549875);
}

export function kwToHorsepower(kw: number): number {
  return Math.round(kw / 0.73549875);
}

export function isTireListing(listing: Listing): boolean {
  return listing.category === 'tire' || (!!listing.tire && !listing.vehicle);
}

export function formatTireSize(tire: NonNullable<Listing['tire']>): string {
  const d = Number(tire.diameter_inch);
  const dStr = Number.isInteger(d) ? String(d) : d.toFixed(1);
  return `${tire.width_mm}/${tire.aspect_ratio} R${dStr}`;
}

export function getTireModelDisplayLabel(tire: NonNullable<Listing['tire']>): string {
  if (tire.model?.is_other) {
    return '';
  }
  return tire.model?.name?.trim() ?? '';
}

export function getVehicleType(listing: Listing): 'car' | 'truck' | 'moto' {
  if (isTireListing(listing) && listing.tire) {
    return listing.tire.tire_vehicle_type;
  }
  const modelTypes = listing.vehicle?.model?.vehicle_types;
  if (modelTypes?.[0]) {
    return modelTypes[0];
  }
  if (listing.vehicle?.body_type) {
    return VEHICLE_TYPE_BY_BODY_TYPE[listing.vehicle.body_type] || 'car';
  }
  return 'car';
}

export function getListingDisplayTitle(listing: Listing, t: (_key: string) => string): string {
  if (isTireListing(listing)) {
    return listing.title?.trim() || '';
  }
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name;
  const modelName = vehicle?.model?.name;
  const year = vehicle?.year ? String(vehicle.year) : null;
  const baseTitle = [brandName, modelName, year].filter(Boolean).join(' ').trim();
  if (!baseTitle) return listing.title?.trim() || '';
  const vehicleType = getVehicleType(listing);
  if (vehicleType === 'moto') return baseTitle;
  if (vehicle?.transmission) {
    const transmissionStr = formatTransmission(vehicle.transmission, t);
    if (transmissionStr) return `${baseTitle} (${transmissionStr})`;
  }
  return baseTitle;
}

export function toSafeJsonLdHtml(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

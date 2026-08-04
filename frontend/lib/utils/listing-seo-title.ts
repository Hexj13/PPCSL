import type { Listing } from '@/lib/api';
import { getCurrencyDisplayCode } from '@/lib/constants';

import type { City } from './utils';
import {
  formatBodyType,
  formatEngineVolume,
  formatFuel,
  formatPrice,
  formatTransmission,
  getCityNamePlain,
  getListingDisplayTitle,
  isTireListing,
} from './utils';

export type HomePageCategory = 'car' | 'truck' | 'moto' | 'tire';

export function buildHomeCategoryTitle(
  t: (_key: string) => string,
  category: HomePageCategory,
): string {
  const categoryLabel = t(`metadata.site.categoryTitle.${category}`);
  return t('metadata.site.homeTitleTemplate').replaceAll('{category}', categoryLabel);
}

export function buildHomeBrandTitle(t: (_key: string) => string, value: string): string {
  return t('metadata.site.homeBrandTitleTemplate').replaceAll('{value}', value);
}

function buildListingSeoPricePart(listing: Listing, t: (_key: string) => string): string {
  if (listing.price == null) return '';
  return `${t('metadata.listing.pricePrefix')} ${formatPrice(listing.price, listing.currency)} ${getCurrencyDisplayCode(listing.currency) || ''}`.trim();
}

function buildListingSeoCityPart(
  listing: Listing,
  t: (_key: string) => string,
  locale: string,
  cities?: City[],
): string {
  const cityPlain = getCityNamePlain(listing.city, locale, cities);
  return cityPlain ? `${t('metadata.listing.inCity')} ${cityPlain}` : '';
}

function buildTireListingSeoTitle(
  listing: Listing,
  t: (_key: string) => string,
  locale: string,
  cities: City[] | undefined,
  appendSuffix: (_core: string) => string,
): string {
  const tireTitle = listing.title?.trim() || '';
  if (!tireTitle) {
    return appendSuffix(getListingDisplayTitle(listing, t));
  }
  const cityPart = buildListingSeoCityPart(listing, t, locale, cities);
  const pricePart = buildListingSeoPricePart(listing, t);
  const left = [t('metadata.listing.titlePrefix'), tireTitle, cityPart].filter(Boolean).join(' ');
  const core = pricePart ? `${left} | ${pricePart}` : left;
  return appendSuffix(core);
}

function buildVehicleListingSeoTitle(
  listing: Listing,
  t: (_key: string) => string,
  locale: string,
  cities: City[] | undefined,
  appendSuffix: (_core: string) => string,
): string {
  const vehicle = listing.vehicle;
  const brandName = vehicle?.brand?.name;
  const modelName = vehicle?.model?.name;
  if (!brandName && !modelName) {
    return appendSuffix(getListingDisplayTitle(listing, t));
  }

  const lower = (s: string) => (s ? s.toLocaleLowerCase(locale) : '');
  const engine = vehicle?.engine_displ_l ? formatEngineVolume(vehicle.engine_displ_l) : '';
  const hp = listing.horsepower ? `(${listing.horsepower} ${t('metadata.listing.powerUnit')})` : '';
  const cityPart = buildListingSeoCityPart(listing, t, locale, cities);
  const pricePart = buildListingSeoPricePart(listing, t);
  const yearPart = vehicle?.year
    ? t('metadata.listing.yearFormat').replaceAll('{year}', String(vehicle.year))
    : '';
  const fuelStr = vehicle?.fuel ? lower(formatFuel(vehicle.fuel, t)) : '';
  const transmissionStr = vehicle?.transmission
    ? lower(formatTransmission(vehicle.transmission, t))
    : '';
  const bodyStr = vehicle?.body_type ? lower(formatBodyType(vehicle.body_type, t)) : '';

  const left = [
    t('metadata.listing.titlePrefix'),
    brandName,
    modelName,
    engine,
    hp,
    fuelStr,
    transmissionStr,
    cityPart,
  ]
    .filter(Boolean)
    .join(' ');
  const right = [bodyStr, yearPart, pricePart].filter(Boolean).join(' ');
  const core = right ? `${left} | ${right}` : left;
  return appendSuffix(core);
}

export function buildListingSeoTitle(
  listing: Listing,
  t: (_key: string) => string,
  locale: string,
  cities?: City[],
): string {
  const siteSuffix = t('metadata.listing.siteSuffix');
  const appendSuffix = (core: string) => (core ? `${core} ${siteSuffix}` : '');

  if (isTireListing(listing)) {
    return buildTireListingSeoTitle(listing, t, locale, cities, appendSuffix);
  }

  return buildVehicleListingSeoTitle(listing, t, locale, cities, appendSuffix);
}

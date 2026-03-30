'use client';

import type { Listing } from '@/lib/api';

import { localStorageGetItem } from './browser-local-storage';
import { loadSiteConfigSync } from './site-config';
import { formatTireSize, getCountry, getTireModelDisplayLabel, isTireListing } from './utils';

let consentCache: boolean | null = null;

export function invalidateConsentCache(): void {
  consentCache = null;
}

function checkConsent(): boolean {
  if (typeof window === 'undefined') return false;
  if (consentCache !== null) return consentCache;

  const consentKey = 'cookie_consent';
  const stored = localStorageGetItem(consentKey);
  if (!stored) {
    consentCache = false;
    return false;
  }

  try {
    const parsed = JSON.parse(stored);
    consentCache = parsed.analytics === 'granted';
    return consentCache;
  } catch {
    consentCache = false;
    return false;
  }
}

let currencyCache: string | null = null;

function getCurrency(): string {
  if (currencyCache !== null) return currencyCache;
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  currencyCache = siteConfig.currency;
  return currencyCache;
}

function scheduleDeferred(fn: () => void): void {
  if (typeof window === 'undefined') return;
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(fn, { timeout: 300 });
  } else {
    setTimeout(fn, 0);
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  if (!checkConsent()) {
    return;
  }

  window.gtag('event', eventName, params);
}

export function trackEventDeferred(eventName: string, params?: Record<string, unknown>) {
  scheduleDeferred(() => trackEvent(eventName, params));
}

export type ViewItemListEntry = {
  id: string;
  title: string;
  price?: number;
  listing_category?: 'vehicle' | 'tire';
  item_category?: 'Vehicle' | 'Tire';
  tire_brand?: string;
  tire_model?: string;
  tire_size?: string;
  season?: string;
  condition?: string;
  quantity?: number;
};

export function listingToViewItemListEntry(listing: Listing): ViewItemListEntry {
  if (isTireListing(listing) && listing.tire) {
    const tr = listing.tire;
    return {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      listing_category: 'tire',
      item_category: 'Tire',
      tire_brand: tr.brand?.name,
      tire_model: getTireModelDisplayLabel(tr) || undefined,
      tire_size: formatTireSize(tr),
      season: tr.season,
      condition: tr.condition,
      quantity: tr.quantity,
    };
  }
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    listing_category: 'vehicle',
    item_category: 'Vehicle',
  };
}

export function buildListingViewItemParams(listing: Listing): Record<string, unknown> {
  if (isTireListing(listing) && listing.tire) {
    const tr = listing.tire;
    return {
      title: listing.title,
      price: listing.price,
      listing_category: 'tire',
      item_category: 'Tire',
      tire_brand: tr.brand?.name,
      tire_model: getTireModelDisplayLabel(tr) || undefined,
      tire_size: formatTireSize(tr),
      season: tr.season,
      condition: tr.condition,
      quantity: tr.quantity,
    };
  }
  return {
    title: listing.title,
    price: listing.price,
    listing_category: 'vehicle',
    item_category: 'Vehicle',
    brand: listing.vehicle?.brand?.name,
    model: listing.vehicle?.model?.name,
  };
}

export const analytics = {
  viewItem: (listingId: string, listing: Record<string, unknown>) => {
    const itemCategory = listing.item_category === 'Tire' ? 'Tire' : 'Vehicle';
    const listingCategory = listing.listing_category === 'tire' ? 'tire' : 'vehicle';
    const item: Record<string, unknown> = {
      item_id: listingId,
      item_name:
        listing.title ||
        (listingCategory === 'tire'
          ? [listing.tire_brand, listing.tire_model].filter(Boolean).join(' ')
          : `${listing.brand ?? ''} ${listing.model ?? ''}`.trim()),
      price: listing.price,
      item_category: itemCategory,
      listing_category: listingCategory,
    };
    if (listingCategory === 'tire') {
      if (listing.tire_brand) item.tire_brand = listing.tire_brand;
      if (listing.tire_model) item.tire_model = listing.tire_model;
      if (listing.tire_size) item.tire_size = listing.tire_size;
      if (listing.season) item.season = listing.season;
      if (listing.condition) item.condition = listing.condition;
      if (listing.quantity != null) item.quantity = listing.quantity;
    } else {
      if (listing.brand) item.item_brand = listing.brand;
      if (listing.model) item.item_model = listing.model;
    }
    trackEvent('view_item', {
      currency: getCurrency(),
      value: listing.price,
      items: [item],
    });
  },

  viewItemList: (items: ViewItemListEntry[]) => {
    trackEvent('view_item_list', {
      item_list_id: 'search_results',
      item_list_name: 'Search Results',
      items: items.map((item) => {
        const row: Record<string, unknown> = {
          item_id: item.id,
          item_name: item.title,
          price: item.price,
          item_category: item.item_category ?? 'Vehicle',
          listing_category: item.listing_category ?? 'vehicle',
        };
        if (item.listing_category === 'tire') {
          if (item.tire_brand) row.tire_brand = item.tire_brand;
          if (item.tire_model) row.tire_model = item.tire_model;
          if (item.tire_size) row.tire_size = item.tire_size;
          if (item.season) row.season = item.season;
          if (item.condition) row.condition = item.condition;
          if (item.quantity != null) row.quantity = item.quantity;
        }
        return row;
      }),
    });
  },

  search: (searchTerm?: string, filters?: Record<string, unknown>) => {
    trackEvent('search', {
      search_term: searchTerm,
      ...filters,
    });
  },

  searchDeferred: (searchTerm?: string, filters?: Record<string, unknown>) => {
    trackEventDeferred('search', {
      search_term: searchTerm,
      ...filters,
    });
  },

  addToWishlist: (listingId: string, listing: Record<string, unknown>) => {
    const itemCategory = listing.item_category === 'Tire' ? 'Tire' : 'Vehicle';
    const listingCategory = listing.listing_category === 'tire' ? 'tire' : 'vehicle';
    const item: Record<string, unknown> = {
      item_id: listingId,
      item_name: listing.title,
      price: listing.price,
      item_category: itemCategory,
      listing_category: listingCategory,
    };
    if (listingCategory === 'tire') {
      if (listing.tire_brand) item.tire_brand = listing.tire_brand;
      if (listing.tire_model) item.tire_model = listing.tire_model;
      if (listing.tire_size) item.tire_size = listing.tire_size;
      if (listing.season) item.season = listing.season;
      if (listing.condition) item.condition = listing.condition;
      if (listing.quantity != null) item.quantity = listing.quantity;
    }
    trackEvent('add_to_wishlist', {
      currency: getCurrency(),
      value: listing.price,
      items: [item],
    });
  },

  removeFromWishlist: (listingId: string, meta?: { listing_category?: 'vehicle' | 'tire' }) => {
    const listingCategory = meta?.listing_category ?? 'vehicle';
    trackEvent('remove_from_wishlist', {
      items: [
        {
          item_id: listingId,
          item_category: listingCategory === 'tire' ? 'Tire' : 'Vehicle',
          listing_category: listingCategory,
        },
      ],
    });
  },

  addToComparison: (listingId: string, listing: Record<string, unknown>) => {
    const itemCategory = listing.item_category === 'Tire' ? 'Tire' : 'Vehicle';
    const listingCategory = listing.listing_category === 'tire' ? 'tire' : 'vehicle';
    trackEvent('add_to_comparison', {
      currency: getCurrency(),
      value: listing.price,
      items: [
        {
          item_id: listingId,
          item_name: listing.title,
          price: listing.price,
          item_category: itemCategory,
          listing_category: listingCategory,
        },
      ],
    });
  },

  removeFromComparison: (listingId: string, meta?: { listing_category?: 'vehicle' | 'tire' }) => {
    const listingCategory = meta?.listing_category ?? 'vehicle';
    trackEvent('remove_from_comparison', {
      items: [
        {
          item_id: listingId,
          item_category: listingCategory === 'tire' ? 'Tire' : 'Vehicle',
          listing_category: listingCategory,
        },
      ],
    });
  },

  contactSeller: (
    listingId: string,
    method: 'phone' | 'viber' | 'whatsapp' | 'telegram',
    listing?: Record<string, unknown>,
  ) => {
    const itemCategory = listing?.item_category === 'Tire' ? 'Tire' : 'Vehicle';
    const listingCategory = listing?.listing_category === 'tire' ? 'tire' : 'vehicle';
    const item: Record<string, unknown> = {
      item_id: listingId,
      item_name: listing?.title,
      price: listing?.price,
      item_category: itemCategory,
      listing_category: listingCategory,
    };
    if (listingCategory === 'tire' && listing) {
      if (listing.tire_brand) item.tire_brand = listing.tire_brand;
      if (listing.tire_model) item.tire_model = listing.tire_model;
      if (listing.tire_size) item.tire_size = listing.tire_size;
      if (listing.season) item.season = listing.season;
      if (listing.condition) item.condition = listing.condition;
      if (listing.quantity != null) item.quantity = listing.quantity;
    }
    trackEvent('contact_seller', {
      currency: getCurrency(),
      value: listing?.price,
      contact_method: method,
      items: [item],
    });
  },

  createListing: (listingId: string, listing: Record<string, unknown>) => {
    const itemCategory = listing.item_category === 'Tire' ? 'Tire' : 'Vehicle';
    const listingCategory = listing.listing_category === 'tire' ? 'tire' : 'vehicle';
    const item: Record<string, unknown> = {
      item_id: listingId,
      item_name: listing.title,
      price: listing.price,
      item_category: itemCategory,
      listing_category: listingCategory,
    };
    if (listingCategory === 'tire') {
      if (listing.tire_brand) item.tire_brand = listing.tire_brand;
      if (listing.tire_model) item.tire_model = listing.tire_model;
      if (listing.tire_size) item.tire_size = listing.tire_size;
      if (listing.season) item.season = listing.season;
      if (listing.condition) item.condition = listing.condition;
      if (listing.quantity != null) item.quantity = listing.quantity;
    }
    trackEvent('create_listing', {
      currency: getCurrency(),
      value: listing.price,
      items: [item],
    });
  },

  saveFilter: (filterName: string, filters?: Record<string, unknown>) => {
    const listingCategory =
      (filters?.listing_category as string | undefined) ||
      (filters?.category as string | undefined) ||
      'vehicle';
    const tireBrandIds = filters?.tire_brand_ids as unknown;
    const tireModelIds = filters?.tire_model_ids as unknown;
    const countIds = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((id) => id && id !== 'all' && !String(id).startsWith('__')).length
        : 0;
    trackEvent('save_filter', {
      filter_name: filterName,
      category: listingCategory,
      listing_category: listingCategory,
      ...(listingCategory === 'tire' && {
        tire_vehicle_type: filters?.tire_vehicle_type,
        tire_brand_ids_count: countIds(tireBrandIds),
        tire_model_ids_count: countIds(tireModelIds),
        tire_studded: filters?.tire_studded,
        tire_run_flat: filters?.tire_run_flat,
        tire_reinforced_xl: filters?.tire_reinforced_xl,
        tire_spare_donut: filters?.tire_spare_donut,
        tire_tubeless: filters?.tire_tubeless,
        tire_acoustic: filters?.tire_acoustic,
      }),
      ...filters,
    });
  },

  login: (method?: 'email' | 'phone') => {
    trackEvent('login', {
      method: method || 'email',
    });
  },

  authTabSelect: (tab: 'login' | 'register') => {
    trackEvent('select_content', {
      content_type: 'auth_tab',
      content_id: tab,
    });
  },

  signUp: (method?: 'email' | 'phone') => {
    trackEvent('sign_up', {
      method: method || 'email',
    });
  },

  quickFilter: (brand: string, model?: string) => {
    trackEvent('quick_filter_click', {
      filter_type: model ? 'brand_model' : 'brand',
      brand: brand,
      model: model,
    });
  },

  similarBlockImpression: (listingId: string, similarCount: number) => {
    trackEvent('similar_block_impression', {
      listing_id: listingId,
      similar_count: similarCount,
    });
  },

  similarCardClick: (listingId: string, clickedListingId: string, position: number) => {
    trackEvent('similar_card_click', {
      listing_id: listingId,
      clicked_listing_id: clickedListingId,
      position,
    });
  },

  similarScroll: (listingId: string) => {
    trackEvent('similar_scroll', {
      listing_id: listingId,
    });
  },

  similarFavoriteToggle: (listingId: string, targetListingId: string, action: 'add' | 'remove') => {
    trackEvent('similar_favorite_toggle', {
      listing_id: listingId,
      target_listing_id: targetListingId,
      action,
    });
  },

  selectVehicleType: (vehicleType: 'car' | 'truck' | 'moto') => {
    trackEvent('select_content', {
      content_type: 'vehicle_type',
      content_id: vehicleType,
    });
  },

  pageScroll: (percent: number) => {
    trackEvent('scroll', {
      percent_scrolled: percent,
    });
  },

  pageScrollDeferred: (percent: number) => {
    trackEventDeferred('scroll', {
      percent_scrolled: percent,
    });
  },

  formStart: (formName: string) => {
    trackEvent('form_start', {
      form_name: formName,
    });
  },

  formSubmit: (
    formName: string,
    success: boolean,
    fields?: Record<string, boolean>,
    extra?: Record<string, unknown>,
  ) => {
    const filledFields = fields
      ? Object.keys(fields)
          .filter((key) => fields[key])
          .join(',')
      : undefined;

    trackEvent('form_submit', {
      form_name: formName,
      success: success,
      ...(filledFields && { filled_fields: filledFields }),
      ...(fields && { fields_count: Object.values(fields).filter(Boolean).length }),
      ...extra,
    });
  },

  completeProfileSkip: (filledFields?: Record<string, boolean>) => {
    const filledFieldsList = filledFields
      ? Object.keys(filledFields)
          .filter((key) => filledFields[key])
          .join(',')
      : undefined;

    trackEvent('complete_profile_skip', {
      ...(filledFieldsList && { filled_fields: filledFieldsList }),
      ...(filledFields && { fields_count: Object.values(filledFields).filter(Boolean).length }),
      ...(filledFields && { had_partial_data: Object.values(filledFields).some(Boolean) }),
    });
  },

  selectContent: (contentType: string, contentId: string, category?: string) => {
    trackEvent('select_content', {
      content_type: contentType,
      content_id: contentId,
      ...(category && { item_category: category }),
    });
  },

  selectContentDeferred: (contentType: string, contentId: string, category?: string) => {
    trackEventDeferred('select_content', {
      content_type: contentType,
      content_id: contentId,
      ...(category && { item_category: category }),
    });
  },

  click: (url: string, linkText?: string) => {
    trackEvent('click', {
      link_url: url,
      ...(linkText && { link_text: linkText }),
    });
  },

  infocarCheck: (
    listingId: string,
    hasVin: boolean,
    brand?: string,
    model?: string,
    year?: number,
  ) => {
    trackEvent('click_infocar_check', {
      listing_id: listingId,
      has_vin: hasVin,
      ...(brand && { brand }),
      ...(model && { model }),
      ...(year !== undefined && year !== null && { year }),
    });
  },

  infocarSampleClick: (listingId: string) => {
    trackEvent('click_infocar_sample', { listing_id: listingId });
  },

  vinRevealClick: (listingId: string) => {
    trackEvent('vin_reveal_click', { listing_id: listingId });
  },

  vinCopyClick: (listingId: string) => {
    trackEvent('vin_copy_click', { listing_id: listingId });
  },
};

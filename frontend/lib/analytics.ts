'use client';

import { loadSiteConfigSync } from './site-config';
import { getCountry } from './utils';

let consentCache: boolean | null = null;

export function invalidateConsentCache(): void {
  consentCache = null;
}

function checkConsent(): boolean {
  if (typeof window === 'undefined') return false;
  if (consentCache !== null) return consentCache;

  const consentKey = 'cookie_consent';
  const stored = localStorage.getItem(consentKey);
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

export const analytics = {
  viewItem: (
    listingId: string,
    listing: { title?: string; price?: number; brand?: string; model?: string },
  ) => {
    trackEvent('view_item', {
      currency: getCurrency(),
      value: listing.price,
      items: [
        {
          item_id: listingId,
          item_name: listing.title || `${listing.brand} ${listing.model}`,
          price: listing.price,
          item_brand: listing.brand,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  viewItemList: (items: Array<{ id: string; title: string; price?: number }>) => {
    trackEvent('view_item_list', {
      item_list_id: 'search_results',
      item_list_name: 'Search Results',
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.title,
        price: item.price,
        item_category: 'Vehicle',
      })),
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

  addToWishlist: (listingId: string, listing: { title?: string; price?: number }) => {
    trackEvent('add_to_wishlist', {
      currency: getCurrency(),
      value: listing.price,
      items: [
        {
          item_id: listingId,
          item_name: listing.title,
          price: listing.price,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  removeFromWishlist: (listingId: string) => {
    trackEvent('remove_from_wishlist', {
      items: [
        {
          item_id: listingId,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  addToComparison: (listingId: string, listing: { title?: string; price?: number }) => {
    trackEvent('add_to_comparison', {
      currency: getCurrency(),
      value: listing.price,
      items: [
        {
          item_id: listingId,
          item_name: listing.title,
          price: listing.price,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  removeFromComparison: (listingId: string) => {
    trackEvent('remove_from_comparison', {
      items: [
        {
          item_id: listingId,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  contactSeller: (
    listingId: string,
    method: 'phone' | 'viber' | 'whatsapp' | 'telegram',
    listing?: { title?: string; price?: number },
  ) => {
    trackEvent('contact_seller', {
      currency: getCurrency(),
      value: listing?.price,
      contact_method: method,
      items: [
        {
          item_id: listingId,
          item_name: listing?.title,
          price: listing?.price,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  createListing: (listingId: string, listing: { title?: string; price?: number }) => {
    trackEvent('create_listing', {
      currency: getCurrency(),
      value: listing.price,
      items: [
        {
          item_id: listingId,
          item_name: listing.title,
          price: listing.price,
          item_category: 'Vehicle',
        },
      ],
    });
  },

  saveFilter: (filterName: string, filters?: Record<string, unknown>) => {
    trackEvent('save_filter', {
      filter_name: filterName,
      ...filters,
    });
  },

  login: (method?: 'email' | 'phone') => {
    trackEvent('login', {
      method: method || 'email',
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

  formSubmit: (formName: string, success: boolean, fields?: Record<string, boolean>) => {
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

  vinRevealClick: (listingId: string) => {
    trackEvent('vin_reveal_click', { listing_id: listingId });
  },

  vinCopyClick: (listingId: string) => {
    trackEvent('vin_copy_click', { listing_id: listingId });
  },
};

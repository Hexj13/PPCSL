'use client';

import { loadSiteConfigSync } from './site-config';

function checkConsent(): boolean {
  if (typeof window === 'undefined') return false;

  const consentKey = 'cookie_consent';
  const stored = localStorage.getItem(consentKey);
  if (!stored) return false;

  try {
    const parsed = JSON.parse(stored);
    return parsed.analytics === 'granted';
  } catch {
    return false;
  }
}

function getCurrency(): string {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  return siteConfig.currency;
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

export const analytics = {
  viewItem: (
    listingId: string,
    listing: { title?: string; price?: number; brand?: string; model?: string }
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
    listing?: { title?: string; price?: number }
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
};

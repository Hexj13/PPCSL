import {
  localStorageGetItem,
  localStorageRemoveItem,
  localStorageSetItem,
} from '@/lib/browser-local-storage';

export const PARTNER_PROMO_DISMISS_STORAGE_KEY = 'ppcsl_hide_partner_promo';
const DISMISS_VALUE = '1';

export function readGuestPartnerPromoDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorageGetItem(PARTNER_PROMO_DISMISS_STORAGE_KEY) === DISMISS_VALUE;
}

export function setGuestPartnerPromoDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorageSetItem(PARTNER_PROMO_DISMISS_STORAGE_KEY, DISMISS_VALUE);
}

export function clearGuestPartnerPromoDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorageRemoveItem(PARTNER_PROMO_DISMISS_STORAGE_KEY);
}

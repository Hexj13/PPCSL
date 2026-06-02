import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';

const SESSION_KEY = 'verifyPhoneContext';

export const VERIFY_PHONE_MODE_COMPLETE_PROFILE = 'complete-profile';
export const VERIFY_PHONE_MODE_POST_REGISTER = 'post-register';

export type VerifyPhoneContext = {
  phone: string;
  mode?: string;
};

export function saveVerifyPhoneContext(context: VerifyPhoneContext): void {
  sessionStorageSetItem(SESSION_KEY, JSON.stringify(context));
}

export function loadVerifyPhoneContext(): VerifyPhoneContext | null {
  const raw = sessionStorageGetItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VerifyPhoneContext;
    if (!parsed?.phone || typeof parsed.phone !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearVerifyPhoneContext(): void {
  sessionStorageRemoveItem(SESSION_KEY);
}

export function buildVerifyPhoneSearchParams(options: {
  mode?: string;
  returnUrl?: string | null;
  source?: string | null;
  selectedType?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options.mode) {
    params.set('mode', options.mode);
  }
  const returnUrl = options.returnUrl?.trim();
  if (returnUrl) {
    params.set('returnUrl', returnUrl);
  }
  const source = options.source?.trim();
  if (source) {
    params.set('source', source);
  }
  const selectedType = options.selectedType?.trim();
  if (selectedType) {
    params.set('selectedType', selectedType);
  }
  return params.toString();
}

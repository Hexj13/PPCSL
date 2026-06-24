import { sanitizeReturnUrl } from '@/lib/return-url';

export type CompleteProfileMode = 'phone_required' | 'business_onboarding';

export function buildCompleteProfileHref(options?: {
  returnUrl?: string | null;
  mode?: CompleteProfileMode;
  extraParams?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  if (options?.mode) {
    params.set('mode', options.mode);
  }
  if (options?.extraParams) {
    for (const [key, value] of Object.entries(options.extraParams)) {
      params.set(key, value);
    }
  }
  const safeReturn = sanitizeReturnUrl(options?.returnUrl);
  if (safeReturn) {
    params.set('returnUrl', safeReturn);
  }
  const qs = params.toString();
  return qs ? `/complete-profile?${qs}` : '/complete-profile';
}

export function buildStandardCompleteProfileHref(returnUrl?: string | null): string {
  return buildCompleteProfileHref({ returnUrl });
}

export function buildBusinessOnboardingHref(returnUrl?: string | null): string {
  return buildCompleteProfileHref({ mode: 'business_onboarding', returnUrl });
}

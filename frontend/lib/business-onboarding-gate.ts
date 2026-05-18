import type { User } from '@/lib/api';

export function requiresBusinessCompanyOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.type === 'Business' && user.phoneVerified === true && !user.companyName?.trim();
}

const BUSINESS_ONBOARDING_GATE_EXEMPT_REST_PATH_RES: readonly RegExp[] = [
  /^\/sign(\/|$|\?)/,
  /^\/verify-phone/,
  /^\/cookie-settings/,
  /^\/terms(\/|$|\?)/,
  /^\/privacy(\/|$|\?)/,
  /^\/offline(\/|$|\?)/,
  /^\/legal/,
  /^\/reset-password/,
  /^\/verify-email/,
  /^\/login(\/|$|\?)/,
  /^\/register(\/|$|\?)/,
];

export function isBusinessOnboardingGateExemptRestPath(restPath: string): boolean {
  const path = restPath.startsWith('/') ? restPath : `/${restPath}`;
  return BUSINESS_ONBOARDING_GATE_EXEMPT_REST_PATH_RES.some((re) => re.test(path));
}

const PHONE_VERIFICATION_EXEMPT_REST_PATH_RES: readonly RegExp[] = [
  /^\/sign(\/|$|\?)/,
  /^\/complete-profile/,
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

export function isPhoneVerificationExemptRestPath(restPath: string): boolean {
  const path = restPath.startsWith('/') ? restPath : `/${restPath}`;
  return PHONE_VERIFICATION_EXEMPT_REST_PATH_RES.some((re) => re.test(path));
}

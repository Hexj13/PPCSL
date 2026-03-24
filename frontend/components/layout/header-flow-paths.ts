export const HIDE_FOOTER_PATHS = [
  '/sign',
  '/reset-password',
  '/verify-phone',
  '/profile/change-phone',
  '/profile/verify-phone-change',
] as const;

export const PROFILE_PHONE_FLOW_PATHS = [
  '/profile/change-phone',
  '/profile/verify-phone-change',
] as const;

export function isHideFooterPath(pathname: string): boolean {
  return (HIDE_FOOTER_PATHS as readonly string[]).includes(pathname);
}

export function isProfilePhoneFlowPath(pathname: string): boolean {
  return (PROFILE_PHONE_FLOW_PATHS as readonly string[]).includes(pathname);
}

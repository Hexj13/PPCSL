import { isPasswordValid, validatePassword } from '@/app/[locale]/reset-password/utils';
import type { User } from '@/lib/api';

export function userHasPassword(user: Pick<User, 'hasPassword'> | null | undefined): boolean {
  return user?.hasPassword === true;
}

export function isProfilePasswordChangeComplete(
  hasPassword: boolean,
  curPw: string,
  neuPw: string,
): boolean {
  if (!neuPw || neuPw.length > 100 || !isPasswordValid(neuPw)) {
    return false;
  }
  if (!hasPassword) {
    return true;
  }
  return Boolean(curPw);
}

export function getProfilePasswordChangeError(
  hasPassword: boolean,
  curPw: string,
  neuPw: string,
  t: (key: string) => string,
): string | null {
  const hasAny = Boolean(curPw || neuPw);
  if (!hasAny || isProfilePasswordChangeComplete(hasPassword, curPw, neuPw)) {
    return null;
  }
  if (hasPassword && (!curPw || !neuPw)) {
    return t('profile.passwordChangeFillAllFields');
  }
  if (!hasPassword && !neuPw) {
    return t('profile.passwordSetFillNew');
  }
  if (neuPw.length > 100) {
    return t('profile.passwordChangeMaxLength');
  }
  const ruleError = validatePassword(neuPw, t);
  return ruleError || null;
}

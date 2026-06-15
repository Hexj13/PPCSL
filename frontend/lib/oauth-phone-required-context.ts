import {
  isOAuthSignupSource,
  type OAuthPhoneRequiredSource,
} from '@/app/complete-profile/oauthPhoneRequiredCancel';
import type { User } from '@/lib/api';
import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';

const SESSION_KEY = 'oauthPhoneRequiredContext';

export type OAuthPhoneRequiredContext = {
  source: OAuthPhoneRequiredSource;
};

export function saveOAuthPhoneRequiredContext(context: OAuthPhoneRequiredContext): void {
  sessionStorageSetItem(SESSION_KEY, JSON.stringify(context));
}

export function loadOAuthPhoneRequiredContext(): OAuthPhoneRequiredContext | null {
  const raw = sessionStorageGetItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthPhoneRequiredContext;
    if (!isOAuthSignupSource(parsed?.source)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOAuthPhoneRequiredContext(): void {
  sessionStorageRemoveItem(SESSION_KEY);
}

export function shouldShowOAuthPhoneRequiredCancel(
  urlSource: string | null,
  user: Pick<User, 'hasPassword' | 'phoneVerified'> | null | undefined,
): boolean {
  if (isOAuthPhoneRequiredSignupFlow(urlSource)) {
    return true;
  }
  return user?.phoneVerified === false && user.hasPassword !== true;
}

export function isOAuthPhoneRequiredSignupFlow(urlSource: string | null): boolean {
  if (isOAuthSignupSource(urlSource)) {
    return true;
  }
  return isOAuthSignupSource(loadOAuthPhoneRequiredContext()?.source ?? null);
}

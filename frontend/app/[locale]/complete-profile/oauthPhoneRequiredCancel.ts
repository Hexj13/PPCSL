import { authApi } from '@/lib/api';

export type OAuthPhoneRequiredSource =
  | 'google_register'
  | 'telegram_register'
  | 'facebook_register';

export function isOAuthSignupSource(source: string | null): source is OAuthPhoneRequiredSource {
  return (
    source === 'google_register' || source === 'telegram_register' || source === 'facebook_register'
  );
}

export async function cancelOAuthPhoneRequiredSignup(): Promise<void> {
  try {
    await authApi.deleteAccount();
  } catch {
    // Session may still be cleared on the client even if delete fails.
  }
}

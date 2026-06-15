import {
  cancelOAuthPhoneRequiredSignup,
  isOAuthSignupSource,
} from '@/app/complete-profile/oauthPhoneRequiredCancel';
import { authApi } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  authApi: {
    deleteAccount: jest.fn(),
  },
}));

describe('oauthPhoneRequiredCancel', () => {
  it('detects OAuth signup sources', () => {
    expect(isOAuthSignupSource('google_register')).toBe(true);
    expect(isOAuthSignupSource('telegram_register')).toBe(true);
    expect(isOAuthSignupSource('other')).toBe(false);
    expect(isOAuthSignupSource(null)).toBe(false);
  });

  it('calls deleteAccount and ignores failures', async () => {
    jest.mocked(authApi.deleteAccount).mockResolvedValueOnce({ data: { success: true } });
    await expect(cancelOAuthPhoneRequiredSignup()).resolves.toBeUndefined();

    jest.mocked(authApi.deleteAccount).mockRejectedValueOnce(new Error('network'));
    await expect(cancelOAuthPhoneRequiredSignup()).resolves.toBeUndefined();
  });
});

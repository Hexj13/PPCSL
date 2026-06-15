import {
  isOAuthPhoneRequiredSignupFlow,
  saveOAuthPhoneRequiredContext,
  shouldShowOAuthPhoneRequiredCancel,
} from '@/lib/oauth-phone-required-context';

describe('oauth-phone-required-context', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('shows cancel for OAuth signup source in the URL', () => {
    expect(
      shouldShowOAuthPhoneRequiredCancel('google_register', {
        hasPassword: false,
        phoneVerified: false,
      }),
    ).toBe(true);
  });

  it('shows cancel for OAuth-only users when middleware stripped source from the URL', () => {
    expect(
      shouldShowOAuthPhoneRequiredCancel(null, {
        hasPassword: false,
        phoneVerified: false,
      }),
    ).toBe(true);
  });

  it('hides cancel for password-based signups on phone_required', () => {
    expect(
      shouldShowOAuthPhoneRequiredCancel(null, {
        hasPassword: true,
        phoneVerified: false,
      }),
    ).toBe(false);
  });

  describe('isOAuthPhoneRequiredSignupFlow', () => {
    it('detects an active signup flow from the URL source', () => {
      expect(isOAuthPhoneRequiredSignupFlow('telegram_register')).toBe(true);
    });

    it('detects an active signup flow from the stored session context', () => {
      saveOAuthPhoneRequiredContext({ source: 'google_register' });
      expect(isOAuthPhoneRequiredSignupFlow(null)).toBe(true);
    });

    it('returns false when there is no positive signup signal', () => {
      expect(isOAuthPhoneRequiredSignupFlow(null)).toBe(false);
    });
  });
});

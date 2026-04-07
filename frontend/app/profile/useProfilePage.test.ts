import { getProfileSubmitState } from './useProfilePage';

describe('getProfileSubmitState', () => {
  const baseUser = {
    id: 'user-1',
    email: null,
    type: 'Individual' as const,
    phone: '+37370123456',
    firstName: 'Test',
    lastName: 'User',
    companyName: null,
    companyWebsiteUrl: null,
    additionalPhone: null,
    emailNotifications: false,
    emailNotificationListingRefreshReminders: false,
    emailNotificationWeeklyViewsDigest: false,
    emailNotificationSecurityAlerts: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    emailVerified: null,
  };

  it('detects email change when input differs from current user email', () => {
    const result = getProfileSubmitState(
      baseUser,
      {
        firstName: 'Test',
        lastName: 'User',
        companyName: '',
        companyWebsiteUrl: '',
        additionalPhone: '',
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
        viber: false,
        whatsapp: false,
        telegram: false,
      },
      'new@example.com',
      '',
      '',
    );

    expect(result.hasEmailChange).toBe(true);
  });

  it('does not detect email change when input matches current unverified email', () => {
    const result = getProfileSubmitState(
      {
        ...baseUser,
        email: 'new@example.com',
        emailVerified: false,
      },
      {
        firstName: 'Test',
        lastName: 'User',
        companyName: '',
        companyWebsiteUrl: '',
        additionalPhone: '',
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
        viber: false,
        whatsapp: false,
        telegram: false,
      },
      'new@example.com',
      '',
      '',
    );

    expect(result.hasEmailChange).toBe(false);
  });
});

import { buildUpdateData } from './utils';

describe('complete profile update payload', () => {
  it('persists all email notification flags for individual users with email', () => {
    expect(
      buildUpdateData(
        {
          firstName: 'Ivan',
          lastName: 'Petrov',
          email: 'user@example.com',
          companyWebsiteUrl: '',
          additionalPhone: '',
          emailNotifications: true,
        },
        false,
      ),
    ).toEqual({
      firstName: 'Ivan',
      lastName: 'Petrov',
      email: 'user@example.com',
      emailNotifications: true,
      emailNotificationListingRefreshReminders: true,
      emailNotificationWeeklyViewsDigest: true,
      emailNotificationSecurityAlerts: true,
    });
  });

  it('does not persist email notification flags when email is missing', () => {
    expect(
      buildUpdateData(
        {
          firstName: 'Ivan',
          lastName: 'Petrov',
          email: '',
          companyWebsiteUrl: '',
          additionalPhone: '',
          emailNotifications: true,
        },
        false,
      ),
    ).toEqual({
      firstName: 'Ivan',
      lastName: 'Petrov',
    });
  });
});

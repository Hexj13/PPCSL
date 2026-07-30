import {
  canInteractWithEmailNotifications,
  enableAllEmailNotifications,
  shouldAutoEnableEmailNotifications,
} from './utils';

describe('profile email notification helpers', () => {
  it('enables all email notification flags together', () => {
    expect(
      enableAllEmailNotifications(
        {
          emailNotifications: false,
          emailNotificationListingRefreshReminders: false,
          emailNotificationWeeklyViewsDigest: false,
          emailNotificationSecurityAlerts: false,
        },
        false,
      ),
    ).toEqual({
      emailNotifications: true,
      emailNotificationListingRefreshReminders: true,
      emailNotificationWeeklyViewsDigest: false,
      emailNotificationSecurityAlerts: true,
    });

    expect(
      enableAllEmailNotifications(
        {
          emailNotifications: false,
          emailNotificationListingRefreshReminders: false,
          emailNotificationWeeklyViewsDigest: false,
          emailNotificationSecurityAlerts: false,
        },
        true,
      ),
    ).toEqual({
      emailNotifications: true,
      emailNotificationListingRefreshReminders: true,
      emailNotificationWeeklyViewsDigest: true,
      emailNotificationSecurityAlerts: true,
    });
  });

  it('allows interaction only when email is present and valid', () => {
    expect(canInteractWithEmailNotifications('')).toBe(false);
    expect(canInteractWithEmailNotifications('invalid-email')).toBe(false);
    expect(canInteractWithEmailNotifications('user@example.com')).toBe(true);
  });

  it('auto-enables notifications only on the first valid email transition', () => {
    expect(shouldAutoEnableEmailNotifications('', 'user@example.com', false)).toBe(true);
    expect(shouldAutoEnableEmailNotifications('', 'invalid-email', false)).toBe(false);
    expect(shouldAutoEnableEmailNotifications('', 'user@example.com', true)).toBe(false);
    expect(shouldAutoEnableEmailNotifications('user@example.com', 'other@example.com', false)).toBe(
      false,
    );
  });
});

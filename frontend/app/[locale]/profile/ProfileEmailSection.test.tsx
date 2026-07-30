import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ProfileEmailSection } from './ProfileEmailSection';

jest.mock('@/ui', () => ({
  HintTooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ProfileEmailSection', () => {
  const t = (key: string) =>
    ({
      'profile.email': 'Email',
      'profile.emailChangeHint': 'Email hint',
      'profile.emailChangeHintAria': 'Email hint aria',
      'profile.emailPlaceholder': 'Enter email address',
      'profile.invalidEmail': 'Invalid email',
      'profile.emailPendingVerification': 'Email is pending verification',
      'profile.receiveEmailNotifications': 'Receive email notifications',
      'profile.emailNotificationTypes': 'Email notification types',
      'profile.receiveListingRefreshReminders': 'Listing reminders',
      'profile.receiveWeeklyViewsDigest': 'Weekly digest',
      'profile.receiveSystemAndSecurityNotifications': 'System and security',
      'profile.emailAndNotifications': 'Email and Notifications',
    })[key] || key;

  it('shows pending verification hint when current email is not confirmed yet', () => {
    render(
      <ProfileEmailSection
        user={{
          id: 'user-1',
          email: 'new@example.com',
          emailVerified: false,
          type: 'Individual',
        }}
        formData={{
          emailNotifications: false,
          emailNotificationListingRefreshReminders: false,
          emailNotificationWeeklyViewsDigest: false,
          emailNotificationSecurityAlerts: false,
        }}
        emailForChange="new@example.com"
        weeklyViewsDigestAvailable={false}
        t={t}
        onChange={jest.fn()}
        onEmailChange={jest.fn()}
      />,
    );

    expect(screen.getByDisplayValue('new@example.com')).toBeInTheDocument();
    expect(screen.getByText('Email is pending verification')).toBeInTheDocument();
  });

  it('shows email notification checkboxes as checked but disabled without email', () => {
    render(
      <ProfileEmailSection
        user={{
          id: 'user-1',
          email: null,
          emailVerified: false,
          type: 'Individual',
        }}
        formData={{
          emailNotifications: false,
          emailNotificationListingRefreshReminders: false,
          emailNotificationWeeklyViewsDigest: false,
          emailNotificationSecurityAlerts: false,
        }}
        emailForChange=""
        weeklyViewsDigestAvailable={false}
        t={t}
        onChange={jest.fn()}
        onEmailChange={jest.fn()}
      />,
    );

    const [masterInput, listingRemindersInput, securityAlertsInput] = screen
      .getAllByRole('checkbox', { hidden: true })
      .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement);

    expect(masterInput).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Receive email notifications' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(listingRemindersInput).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Listing reminders' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(securityAlertsInput).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'System and security' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.queryByRole('checkbox', { name: 'Weekly digest' })).not.toBeInTheDocument();
  });
});

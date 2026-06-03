import { initializeFormData } from '@/app/profile/utils';
import type { User } from '@/lib/api';

import { isProfilePasswordChangeComplete, userHasPassword } from './profile-password';
import { getProfileSubmitState } from './useProfilePage';

function hasProfileFormChanges(
  formData: ReturnType<typeof initializeFormData>,
  initialData: ReturnType<typeof initializeFormData>,
): boolean {
  return (
    formData.firstName !== initialData.firstName ||
    formData.companyWebsiteUrl !== initialData.companyWebsiteUrl
  );
}

function canSaveProfile(params: {
  user: User;
  formData: ReturnType<typeof initializeFormData>;
  emailForChange: string;
  currentPassword: string;
  newPassword: string;
  companyWebsiteValid: boolean;
  additionalPhoneError: string | null;
  emailValid: boolean;
}): boolean {
  const {
    user,
    formData,
    emailForChange,
    currentPassword,
    newPassword,
    companyWebsiteValid,
    additionalPhoneError,
    emailValid,
  } = params;
  const initialData = initializeFormData(user);
  const hasProfileChanges = hasProfileFormChanges(formData, initialData);
  const normalizedCurrentEmail = (user.email || '').trim().toLowerCase();
  const normalizedNextEmail = emailForChange.trim().toLowerCase();
  const hasEmailChange = normalizedCurrentEmail !== normalizedNextEmail;
  const cur = currentPassword.trim();
  const neu = newPassword.trim();
  const passwordComplete = isProfilePasswordChangeComplete(userHasPassword(user), cur, neu);

  if (passwordComplete && !hasProfileChanges && !hasEmailChange) {
    return true;
  }

  if (emailForChange && !emailValid) return false;
  if (formData.companyWebsiteUrl?.trim() && !companyWebsiteValid) return false;
  if (additionalPhoneError) return false;

  return hasProfileChanges || hasEmailChange || passwordComplete;
}

describe('profile canSave (password-only)', () => {
  const businessUser = {
    id: '1',
    type: 'Business' as const,
    email: 'biz@example.com',
    companyWebsiteUrl: 'not-a-valid-url',
    hasPassword: false,
  } as User;

  it('enables save for valid new password even when company website is invalid', () => {
    const formData = initializeFormData(businessUser);
    const enabled = canSaveProfile({
      user: businessUser,
      formData,
      emailForChange: businessUser.email || '',
      currentPassword: '',
      newPassword: 'ValidPass1',
      companyWebsiteValid: false,
      additionalPhoneError: null,
      emailValid: true,
    });
    expect(enabled).toBe(true);
  });

  it('treats email notification auto-toggle as change only against live user, not loaded baseline', () => {
    const formData = initializeFormData(businessUser);
    const toggledForm = {
      ...formData,
      emailNotifications: true,
      emailNotificationListingRefreshReminders: true,
      emailNotificationWeeklyViewsDigest: true,
      emailNotificationSecurityAlerts: true,
    };
    const submitState = getProfileSubmitState(
      businessUser,
      toggledForm,
      businessUser.email || '',
      '',
      'ValidPass1',
      { profileFormBaseline: formData, emailBaseline: (businessUser.email || '').toLowerCase() },
    );
    expect(submitState.hasProfileChanges).toBe(true);
    expect(submitState.passwordComplete).toBe(true);
  });
});

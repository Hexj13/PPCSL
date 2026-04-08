import { render, screen } from '@testing-library/react';

import { ProfilePasswordSection } from './ProfilePasswordSection';

describe('ProfilePasswordSection', () => {
  const translations = {
    'profile.passwordChangeTitle': 'Change password',
    'profile.currentPasswordLabel': 'Current password',
    'profile.newPasswordLabel': 'New password',
    'auth.passwordRequirements.minLength': 'Minimum 8 characters',
    'auth.passwordRequirements.uppercase': 'At least one uppercase letter',
    'auth.passwordRequirements.lowercase': 'At least one lowercase letter',
  } as const;

  const t = (key: string) =>
    key in translations ? translations[key as keyof typeof translations] : key;

  it('sets password manager ignore attributes for both password fields', () => {
    render(
      <ProfilePasswordSection
        t={t}
        currentPassword=""
        newPassword=""
        onCurrentPasswordChange={jest.fn()}
        onNewPasswordChange={jest.fn()}
      />,
    );

    const currentPasswordInput = screen.getByLabelText('Current password');
    const newPasswordInput = screen.getByLabelText('New password');

    expect(currentPasswordInput).toHaveAttribute('data-1p-ignore');
    expect(currentPasswordInput).toHaveAttribute('data-lpignore', 'true');
    expect(newPasswordInput).toHaveAttribute('data-1p-ignore');
    expect(newPasswordInput).toHaveAttribute('data-lpignore', 'true');
  });
});

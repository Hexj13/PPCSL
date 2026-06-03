import {
  getProfilePasswordChangeError,
  isProfilePasswordChangeComplete,
  userHasPassword,
} from './profile-password';

describe('profile-password', () => {
  const t = (key: string) => key;

  it('detects password presence from hasPassword flag', () => {
    expect(userHasPassword({ hasPassword: true })).toBe(true);
    expect(userHasPassword({ hasPassword: false })).toBe(false);
    expect(userHasPassword(null)).toBe(false);
  });

  it('allows setting password without current password', () => {
    expect(isProfilePasswordChangeComplete(false, '', 'ValidPass1')).toBe(true);
    expect(getProfilePasswordChangeError(false, '', 'short', t)).toBeTruthy();
  });

  it('requires current password when account already has one', () => {
    expect(isProfilePasswordChangeComplete(true, '', 'ValidPass1')).toBe(false);
    expect(getProfilePasswordChangeError(true, '', 'ValidPass1', t)).toBe(
      'profile.passwordChangeFillAllFields',
    );
  });
});

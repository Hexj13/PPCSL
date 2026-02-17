export const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

export type PasswordValidationRule = { text: string; isValid: boolean };

export function validatePassword(passwordValue: string, t: (key: string) => string): string {
  if (passwordValue.length < 8) return t('register.passwordMinLength');
  if (!/[A-Z]/.test(passwordValue)) return t('register.passwordUppercase');
  if (!/[a-z]/.test(passwordValue)) return t('register.passwordLowercase');
  return '';
}

export function getPasswordValidationRules(
  passwordValue: string,
  t: (key: string) => string,
): PasswordValidationRule[] {
  return [
    { text: t('register.passwordRuleMinLength'), isValid: passwordValue.length >= 8 },
    { text: t('register.passwordRuleUppercase'), isValid: /[A-Z]/.test(passwordValue) },
    { text: t('register.passwordRuleLowercase'), isValid: /[a-z]/.test(passwordValue) },
  ];
}

export function isPasswordValid(passwordValue: string): boolean {
  if (!passwordValue) return false;
  const trimmed = passwordValue.trim();
  return (
    trimmed.length > 0 && trimmed.length >= 8 && /[A-Z]/.test(trimmed) && /[a-z]/.test(trimmed)
  );
}

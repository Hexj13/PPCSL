import type { UpdateProfileDto, User } from '@/lib/api';

export const convertToBoolean = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return false;
};

export const validateEmail = (email: string): boolean => {
  if (!email) {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const getSafeEmailValue = (email: string | null | undefined): string => {
  const trimmedEmail = email?.trim() || '';
  return validateEmail(trimmedEmail) ? trimmedEmail : '';
};

export const validateCompanyWebsiteUrl = (value: string): boolean => {
  if (!value.trim()) return true;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

export const initializeFormData = (user: User | null): UpdateProfileDto => {
  if (!user) {
    return {
      email: '',
      firstName: '',
      lastName: '',
      companyName: '',
      companyWebsiteUrl: '',
      emailNotifications: false,
      viber: false,
      whatsapp: false,
      telegram: false,
    };
  }

  return {
    email: getSafeEmailValue(user.email),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    companyName: user.companyName || '',
    companyWebsiteUrl: user.companyWebsiteUrl || '',
    emailNotifications: convertToBoolean(user.emailNotifications),
    viber: convertToBoolean(user.viber),
    whatsapp: convertToBoolean(user.whatsapp),
    telegram: convertToBoolean(user.telegram),
  };
};

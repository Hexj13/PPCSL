import { validateCompanyWebsiteUrl, validateEmail } from '@/app/profile/utils';
import { validatePhone } from '@/app/register/utils';

const NAME_CHARS_REGEX = /^[a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]+$/;

export type AdminEditUserFieldKey =
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'companyName'
  | 'companyWebsiteUrl'
  | 'additionalPhone'
  | 'freePromotionBalance';

export type AdminEditUserFormTouchedKey = AdminEditUserFieldKey | 'isPlatformPartner';

export type AdminEditUserFormState = {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companyWebsiteUrl: string;
  additionalPhone: string;
  isPlatformPartner: boolean;
  freePromotionBalance: string;
};

export type AdminEditUserValidationResult = {
  valid: boolean;
  fieldMessages: Partial<Record<AdminEditUserFieldKey, string>>;
  firstToastMessage: string | null;
};

function pushError(
  fieldMessages: Partial<Record<AdminEditUserFieldKey, string>>,
  key: AdminEditUserFieldKey,
  message: string,
  firstMessage: { current: string | null },
): void {
  fieldMessages[key] = message;
  if (firstMessage.current === null) {
    firstMessage.current = message;
  }
}

export function validateAdminEditUserForm(params: {
  business: boolean;
  primaryPhone: string | null | undefined;
  form: AdminEditUserFormState;
  t: (key: string, params?: Record<string, string | number>) => string;
}): AdminEditUserValidationResult {
  const { business, primaryPhone, form, t } = params;
  const fieldMessages: Partial<Record<AdminEditUserFieldKey, string>> = {};
  const firstMessage: { current: string | null } = { current: null };

  const emailTrim = form.email.trim();
  if (emailTrim && !validateEmail(emailTrim)) {
    pushError(fieldMessages, 'email', t('profile.invalidEmail'), firstMessage);
  }

  if (!business) {
    const fn = form.firstName.trim();
    if (fn) {
      if (fn.length < 2) {
        pushError(fieldMessages, 'firstName', t('register.firstNameMinLength'), firstMessage);
      } else if (fn.length > 50) {
        pushError(fieldMessages, 'firstName', t('register.firstNameMaxLength'), firstMessage);
      } else if (!NAME_CHARS_REGEX.test(fn)) {
        pushError(fieldMessages, 'firstName', t('register.firstNameInvalid'), firstMessage);
      }
    }

    const ln = form.lastName.trim();
    if (ln) {
      if (ln.length < 2) {
        pushError(fieldMessages, 'lastName', t('register.lastNameMinLength'), firstMessage);
      } else if (ln.length > 50) {
        pushError(fieldMessages, 'lastName', t('register.lastNameMaxLength'), firstMessage);
      } else if (!NAME_CHARS_REGEX.test(ln)) {
        pushError(fieldMessages, 'lastName', t('register.lastNameInvalid'), firstMessage);
      }
    }
  } else {
    const cn = form.companyName.trim();
    if (cn) {
      if (cn.length < 2) {
        pushError(fieldMessages, 'companyName', t('register.companyNameMinLength'), firstMessage);
      } else if (cn.length > 100) {
        pushError(fieldMessages, 'companyName', t('register.companyNameMaxLength'), firstMessage);
      }
    }

    const url = form.companyWebsiteUrl.trim();
    if (url && !validateCompanyWebsiteUrl(form.companyWebsiteUrl)) {
      pushError(
        fieldMessages,
        'companyWebsiteUrl',
        t('profile.invalidCompanyWebsiteUrl'),
        firstMessage,
      );
    }

    const ap = form.additionalPhone.trim();
    if (ap) {
      const phoneErr = validatePhone(ap, t);
      if (phoneErr) {
        pushError(fieldMessages, 'additionalPhone', phoneErr, firstMessage);
      } else if (ap === (primaryPhone ?? '').trim()) {
        pushError(
          fieldMessages,
          'additionalPhone',
          t('errors.additionalPhoneSameAsPrimary'),
          firstMessage,
        );
      }
    }
  }

  if (business && form.isPlatformPartner) {
    const bal = form.freePromotionBalance.trim();
    if (bal === '' || !/^\d+$/.test(bal)) {
      pushError(
        fieldMessages,
        'freePromotionBalance',
        t('admin.usersTab.freePromotionBalanceInvalid'),
        firstMessage,
      );
    }
  }

  const keys = Object.keys(fieldMessages);
  return {
    valid: keys.length === 0,
    fieldMessages,
    firstToastMessage: firstMessage.current,
  };
}

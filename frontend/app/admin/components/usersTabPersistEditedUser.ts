import type { User } from '@/lib/api';
import { adminApi } from '@/lib/api';

import type { AdminEditUserFieldKey, AdminEditUserFormState } from './adminEditUserFormValidation';
import { getUserSaveToastKey, isBusinessUser } from './adminUsersHelpers';

export type PersistEditedUserSuccess = {
  ok: true;
  merged: User;
  toastKey: string;
};

export type PersistEditedUserFailure = {
  ok: false;
  fieldMessages: Partial<Record<AdminEditUserFieldKey, string>>;
  toastMessage: string;
};

export type PersistEditedUserResult = PersistEditedUserSuccess | PersistEditedUserFailure;

function readAxiosErrorPayload(err: unknown): { message?: string; errorKey?: string } | null {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return null;
  }
  const ax = err as { response?: { data?: { message?: string; errorKey?: string } } };
  return ax.response?.data ?? null;
}

export async function persistEditedUser(params: {
  editingUser: User;
  editUserForm: AdminEditUserFormState;
  partnerBalanceValue: number;
  t: (key: string) => string;
}): Promise<PersistEditedUserResult> {
  const { editingUser, editUserForm, partnerBalanceValue, t } = params;
  const business = isBusinessUser(editingUser);
  const emailTrim = editUserForm.email.trim();
  const profilePayload = business
    ? {
        email: emailTrim,
        companyName: editUserForm.companyName.trim(),
        companyWebsiteUrl: editUserForm.companyWebsiteUrl.trim(),
        additionalPhone: editUserForm.additionalPhone.trim(),
      }
    : {
        email: emailTrim,
        firstName: editUserForm.firstName.trim(),
        lastName: editUserForm.lastName.trim(),
      };

  try {
    const profileResponse = await adminApi.updateUserProfile(editingUser.id, {
      ...profilePayload,
      ...(emailTrim !== '' ? { emailVerified: editUserForm.emailVerified } : {}),
    });
    let merged: User = { ...editingUser, ...profileResponse.data.user };

    if (business) {
      const partnerResponse = await adminApi.updateUserPartnerSettings(editingUser.id, {
        isPlatformPartner: editUserForm.isPlatformPartner,
        freePromotionBalance: editUserForm.isPlatformPartner ? partnerBalanceValue : 0,
      });
      merged = { ...merged, ...partnerResponse.data };
    }

    return {
      ok: true,
      merged,
      toastKey: getUserSaveToastKey(profileResponse.data.emailConfirmationSent),
    };
  } catch (err: unknown) {
    const data = readAxiosErrorPayload(err);
    const msg =
      typeof data?.message === 'string' ? data.message : t('admin.usersTab.userSaveError');
    const errorKey = typeof data?.errorKey === 'string' ? data.errorKey : undefined;
    const fieldMessages: Partial<Record<AdminEditUserFieldKey, string>> = {};
    if (errorKey === 'errors.emailAlreadyExists') {
      fieldMessages.email = msg;
    } else if (errorKey === 'errors.additionalPhoneSameAsPrimary') {
      fieldMessages.additionalPhone = msg;
    }
    return { ok: false, fieldMessages, toastMessage: msg };
  }
}

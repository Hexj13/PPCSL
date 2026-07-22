'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  getProfilePasswordChangeError,
  isProfilePasswordChangeComplete,
  userHasPassword,
} from '@/app/[locale]/profile/profile-password';
import {
  EMAIL_NOTIFICATION_FIELDS,
  enableAllEmailNotifications,
  shouldAutoEnableEmailNotifications,
  convertToBoolean,
  getSafeEmailValue,
  initializeFormData,
  validateCompanyWebsiteUrl,
  validateEmail,
} from '@/app/[locale]/profile/utils';
import { validatePhone } from '@/app/[locale]/register/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { UpdateProfileDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import { getClientLocale } from '@/lib/i18n';
import { compactE164Phone, formatPhoneForDisplay } from '@/lib/phone';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

function redirectToHomeAfterAuthExit(): void {
  if (typeof window === 'undefined') return;
  const target = buildPostAuthRedirect('/', getClientLocale());
  window.location.replace(target);
  window.setTimeout(() => {
    const targetUrl = new URL(target, window.location.origin);
    if (window.location.pathname !== targetUrl.pathname) {
      window.location.assign(target);
    }
  }, 0);
}

function hasProfileFormChanges(
  formData: UpdateProfileDto,
  initialData: ReturnType<typeof initializeFormData>,
): boolean {
  return (
    formData.firstName !== initialData.firstName ||
    formData.lastName !== initialData.lastName ||
    formData.companyName !== initialData.companyName ||
    formData.companyWebsiteUrl !== initialData.companyWebsiteUrl ||
    (formData.additionalPhone || '') !== (initialData.additionalPhone || '') ||
    formData.emailNotifications !== initialData.emailNotifications ||
    formData.emailNotificationListingRefreshReminders !==
      initialData.emailNotificationListingRefreshReminders ||
    formData.emailNotificationWeeklyViewsDigest !==
      initialData.emailNotificationWeeklyViewsDigest ||
    formData.emailNotificationSecurityAlerts !== initialData.emailNotificationSecurityAlerts ||
    formData.viber !== initialData.viber ||
    formData.whatsapp !== initialData.whatsapp ||
    formData.telegram !== initialData.telegram
  );
}

type ProfileSubmitState = {
  hasProfileChanges: boolean;
  hasEmailChange: boolean;
  normalizedNextEmail: string;
  curPw: string;
  neuPw: string;
  passwordComplete: boolean;
};

export type ProfileFormBaseline = ReturnType<typeof initializeFormData>;

export function getProfileSubmitState(
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>,
  formData: UpdateProfileDto,
  emailForChange: string,
  currentPassword: string,
  newPassword: string,
  options?: {
    profileFormBaseline?: ProfileFormBaseline | null;
    emailBaseline?: string | null;
  },
): ProfileSubmitState {
  const profileCompare = options?.profileFormBaseline ?? initializeFormData(user);
  const hasProfileChanges = hasProfileFormChanges(formData, profileCompare);
  const normalizedCurrentEmail = (
    options?.emailBaseline ?? getSafeEmailValue(user.email).toLowerCase()
  ).trim();
  const normalizedNextEmail = emailForChange.trim().toLowerCase();
  const hasEmailChange = normalizedCurrentEmail !== normalizedNextEmail;
  const curPw = currentPassword.trim();
  const neuPw = newPassword.trim();
  const passwordComplete = isProfilePasswordChangeComplete(userHasPassword(user), curPw, neuPw);
  return {
    hasProfileChanges,
    hasEmailChange,
    normalizedNextEmail,
    curPw,
    neuPw,
    passwordComplete,
  };
}

export function getAdditionalPhoneFieldError(
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>,
  additionalPhone: string | null | undefined,
  t: (key: string) => string,
): string | null {
  if (user.type !== 'Business') {
    return null;
  }
  const trimmed = additionalPhone?.trim();
  if (!trimmed) {
    return null;
  }
  const phoneErr = validatePhone(trimmed, t);
  if (phoneErr) {
    return phoneErr;
  }
  if (compactE164Phone(trimmed) === compactE164Phone(user.phone || '')) {
    return t('errors.additionalPhoneSameAsPrimary');
  }
  return null;
}

function getProfileFieldsValidationError(
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>,
  formData: UpdateProfileDto,
  emailForChange: string,
  t: (key: string) => string,
): string | null {
  if (emailForChange && !validateEmail(emailForChange)) {
    return t('profile.invalidEmail');
  }
  if (formData.companyWebsiteUrl && !validateCompanyWebsiteUrl(formData.companyWebsiteUrl)) {
    return t('profile.invalidCompanyWebsiteUrl');
  }
  const additionalPhoneErr = getAdditionalPhoneFieldError(user, formData.additionalPhone, t);
  if (additionalPhoneErr) {
    return additionalPhoneErr;
  }
  return null;
}

function handleProfileSubmitError(err: unknown, t: (key: string) => string): void {
  const axiosError =
    err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { message?: string; errorKey?: string } } })
      : null;
  const data = axiosError?.response?.data;
  const errorKey = typeof data?.errorKey === 'string' ? data.errorKey : undefined;

  if (errorKey) {
    const translatedError = t(errorKey);
    const resolvedErrorMessage =
      translatedError !== errorKey
        ? translatedError
        : typeof data?.message === 'string' && data.message.trim()
          ? data.message
          : errorKey;
    if (errorKey === 'errors.emailChangeTooManyAttempts') {
      toast.warning(resolvedErrorMessage);
      return;
    }
    if (translatedError !== errorKey) {
      toast.error(translatedError);
      return;
    }
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    toast.error(data.message);
  }
}

export function useProfilePage() {
  const { user, isInitialized, setAuth, logout } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
  const [emailForChange, setEmailForChange] = useState(() => getSafeEmailValue(user?.email));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileFormBaseline, setProfileFormBaseline] = useState<ProfileFormBaseline | null>(null);
  const [emailBaseline, setEmailBaseline] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const accountDeletedRef = useRef(false);
  const previousEmailForChangeRef = useRef(getSafeEmailValue(user?.email));
  const emailNotificationsInteractionLockedRef = useRef(Boolean(getSafeEmailValue(user?.email)));
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const canSave = useMemo(() => {
    if (!user) return false;
    const submitState = getProfileSubmitState(
      user,
      formData,
      emailForChange,
      currentPassword,
      newPassword,
      { profileFormBaseline, emailBaseline },
    );

    if (submitState.passwordComplete) {
      return true;
    }

    if (emailForChange && !validateEmail(emailForChange)) return false;
    if (
      formData.companyWebsiteUrl?.trim() &&
      !validateCompanyWebsiteUrl(formData.companyWebsiteUrl)
    ) {
      return false;
    }
    if (getAdditionalPhoneFieldError(user, formData.additionalPhone, t)) {
      return false;
    }

    return submitState.hasProfileChanges || submitState.hasEmailChange;
  }, [
    user,
    formData,
    emailForChange,
    currentPassword,
    newPassword,
    profileFormBaseline,
    emailBaseline,
    t,
  ]);

  const additionalPhoneError = useMemo(
    () => (user ? getAdditionalPhoneFieldError(user, formData.additionalPhone, t) : null),
    [user, formData.additionalPhone, t],
  );

  useLayoutEffect(() => {
    if (!accountDeletedRef.current || user || !isInitialized) return;
    redirectToHomeAfterAuthExit();
  }, [user, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      redirectToHomeAfterAuthExit();
      return;
    }
    if (hasLoadedRef.current) return;

    const loadProfile = async () => {
      try {
        if (!user) setLoadingProfile(true);
        const response = await authApi.me();
        if (accountDeletedRef.current) return;
        const profileUser = response.data;
        setAuth(profileUser);
        const formDataToSet = {
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          companyName: profileUser.companyName || '',
          companyWebsiteUrl: profileUser.companyWebsiteUrl || '',
          additionalPhone: formatPhoneForDisplay(profileUser.additionalPhone || ''),
          emailNotifications: convertToBoolean(profileUser.emailNotifications),
          emailNotificationListingRefreshReminders: convertToBoolean(
            profileUser.emailNotificationListingRefreshReminders,
          ),
          emailNotificationWeeklyViewsDigest: convertToBoolean(
            profileUser.emailNotificationWeeklyViewsDigest,
          ),
          emailNotificationSecurityAlerts: convertToBoolean(
            profileUser.emailNotificationSecurityAlerts,
          ),
          viber: convertToBoolean(profileUser.viber),
          whatsapp: convertToBoolean(profileUser.whatsapp),
          telegram: convertToBoolean(profileUser.telegram),
        };
        setFormData(formDataToSet);
        setProfileFormBaseline(formDataToSet);
        const nextEmailForChange = getSafeEmailValue(profileUser.email);
        setEmailBaseline(nextEmailForChange.toLowerCase());
        previousEmailForChangeRef.current = nextEmailForChange;
        emailNotificationsInteractionLockedRef.current = Boolean(nextEmailForChange);
        setEmailForChange(nextEmailForChange);
        hasLoadedRef.current = true;
      } catch {
        if (accountDeletedRef.current) return;
        hasLoadedRef.current = true;
        logoutRef.current();
        redirectToHomeAfterAuthExit();
      } finally {
        if (!accountDeletedRef.current) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();
  }, [isInitialized, setAuth, user]);

  useEffect(() => {
    if (!user || !hasLoadedRef.current) return;
    const newFormData = initializeFormData(user);
    setFormData((prev) => {
      const hasChanges = hasProfileFormChanges(prev, newFormData);
      return hasChanges ? newFormData : prev;
    });
    const nextEmailForChange = getSafeEmailValue(user.email);
    previousEmailForChangeRef.current = nextEmailForChange;
    emailNotificationsInteractionLockedRef.current = Boolean(nextEmailForChange);
    setEmailForChange(nextEmailForChange);
  }, [user]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      previousEmailForChangeRef.current = emailForChange;
      return;
    }

    if (
      shouldAutoEnableEmailNotifications(
        previousEmailForChangeRef.current,
        emailForChange,
        emailNotificationsInteractionLockedRef.current,
      )
    ) {
      emailNotificationsInteractionLockedRef.current = true;
      setFormData((prev) => enableAllEmailNotifications(prev));
    }

    previousEmailForChangeRef.current = emailForChange;
  }, [emailForChange]);

  const handleChange = useCallback((field: keyof UpdateProfileDto, value: string | boolean) => {
    if (
      field === 'emailNotifications' ||
      EMAIL_NOTIFICATION_FIELDS.includes(field as (typeof EMAIL_NOTIFICATION_FIELDS)[number])
    ) {
      emailNotificationsInteractionLockedRef.current = true;
    }
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      return newData;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const submitState = getProfileSubmitState(
        user,
        formData,
        emailForChange,
        currentPassword,
        newPassword,
        { profileFormBaseline, emailBaseline },
      );
      const passwordError = getProfilePasswordChangeError(
        userHasPassword(user),
        submitState.curPw,
        submitState.neuPw,
        t,
      );
      if (passwordError) {
        toast.error(passwordError);
        return;
      }

      if (submitState.hasProfileChanges || submitState.hasEmailChange) {
        const profileFieldsError = getProfileFieldsValidationError(
          user,
          formData,
          emailForChange,
          t,
        );
        if (profileFieldsError) {
          toast.error(profileFieldsError);
          return;
        }
      }

      if (
        !submitState.hasProfileChanges &&
        !submitState.hasEmailChange &&
        !submitState.passwordComplete
      ) {
        return;
      }

      setLoading(true);
      try {
        if (submitState.hasProfileChanges) {
          const profilePayload: UpdateProfileDto = {
            ...formData,
            additionalPhone: formData.additionalPhone?.trim()
              ? compactE164Phone(formData.additionalPhone)
              : formData.additionalPhone || '',
          };
          const response = await authApi.updateProfile(profilePayload);
          setAuth(response.data);
          const savedFormData = initializeFormData(response.data);
          setProfileFormBaseline(savedFormData);
          setFormData(savedFormData);
          toast.success(t('profile.updateSuccess'));
        }
        if (submitState.hasEmailChange) {
          await authApi.changeEmailRequest({ newEmail: submitState.normalizedNextEmail });
          const profileResponse = await authApi.me();
          setAuth(profileResponse.data);
          toast.success(t('profile.emailChangeLinkSent'));
        }
        if (submitState.passwordComplete) {
          const hadPassword = userHasPassword(user);
          await authApi.changePassword({
            ...(hadPassword ? { currentPassword: submitState.curPw } : {}),
            newPassword: submitState.neuPw,
          });
          const profileResponse = await authApi.me();
          setAuth(profileResponse.data);
          toast.success(
            t(hadPassword ? 'profile.passwordChangeSuccess' : 'profile.passwordSetSuccess'),
          );
          setCurrentPassword('');
          setNewPassword('');
        }
      } catch (err: unknown) {
        handleProfileSubmitError(err, t);
      } finally {
        setLoading(false);
      }
    },
    [
      formData,
      emailForChange,
      user,
      setAuth,
      t,
      currentPassword,
      newPassword,
      profileFormBaseline,
      emailBaseline,
    ],
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setDeleting(true);
    accountDeletedRef.current = true;
    hasLoadedRef.current = true;
    try {
      await authApi.deleteAccount();
    } catch {
      accountDeletedRef.current = false;
      hasLoadedRef.current = false;
      setDeleting(false);
      setShowDeleteModal(false);
      return;
    }

    localStorageSetItem('showProfileDeleteSuccess', 'true');
    try {
      logout();
    } finally {
      redirectToHomeAfterAuthExit();
    }
  }, [user, logout]);

  return {
    user,
    isInitialized,
    loading,
    loadingProfile,
    formData,
    emailForChange,
    setEmailForChange,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    handleChange,
    handleSubmit,
    canSave,
    additionalPhoneError,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    handleDeleteAccount,
  };
}

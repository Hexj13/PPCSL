'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  EMAIL_NOTIFICATION_FIELDS,
  enableAllEmailNotifications,
  shouldAutoEnableEmailNotifications,
  convertToBoolean,
  getSafeEmailValue,
  initializeFormData,
  validateCompanyWebsiteUrl,
  validateEmail,
} from '@/app/profile/utils';
import { validatePhone } from '@/app/register/utils';
import { isPasswordValid, validatePassword } from '@/app/reset-password/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { UpdateProfileDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageGetItem } from '@/lib/browser-local-storage';
import { compactE164Phone, formatPhoneForDisplay } from '@/lib/phone';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

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

function isProfilePasswordChangeComplete(curPw: string, neuPw: string): boolean {
  return Boolean(curPw && neuPw) && neuPw.length <= 100 && isPasswordValid(neuPw);
}

function getProfilePasswordChangeError(
  curPw: string,
  neuPw: string,
  t: (key: string) => string,
): string | null {
  const hasAny = Boolean(curPw || neuPw);
  if (!hasAny || isProfilePasswordChangeComplete(curPw, neuPw)) {
    return null;
  }
  if (!curPw || !neuPw) {
    return t('profile.passwordChangeFillAllFields');
  }
  if (neuPw.length > 100) {
    return t('profile.passwordChangeMaxLength');
  }
  const ruleError = validatePassword(neuPw, t);
  return ruleError || null;
}

type ProfileSubmitState = {
  hasProfileChanges: boolean;
  hasEmailChange: boolean;
  normalizedNextEmail: string;
  curPw: string;
  neuPw: string;
  passwordComplete: boolean;
};

export function getProfileSubmitState(
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>,
  formData: UpdateProfileDto,
  emailForChange: string,
  currentPassword: string,
  newPassword: string,
): ProfileSubmitState {
  const initialData = initializeFormData(user);
  const hasProfileChanges = hasProfileFormChanges(formData, initialData);
  const normalizedCurrentEmail = getSafeEmailValue(user.email).toLowerCase();
  const normalizedNextEmail = emailForChange.trim().toLowerCase();
  const hasEmailChange = normalizedCurrentEmail !== normalizedNextEmail;
  const curPw = currentPassword.trim();
  const neuPw = newPassword.trim();
  const passwordComplete = isProfilePasswordChangeComplete(curPw, neuPw);
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

function getProfileValidationError(
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>,
  formData: UpdateProfileDto,
  emailForChange: string,
  t: (key: string) => string,
  curPw: string,
  neuPw: string,
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
  return getProfilePasswordChangeError(curPw, neuPw, t);
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
  const router = useRouter();
  const { user, isInitialized, setAuth, token, logout } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
  const [emailForChange, setEmailForChange] = useState(() => getSafeEmailValue(user?.email));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const hasLoadedRef = useRef(false);
  const previousEmailForChangeRef = useRef(getSafeEmailValue(user?.email));
  const emailNotificationsInteractionLockedRef = useRef(Boolean(getSafeEmailValue(user?.email)));
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const canSave = useMemo(() => {
    if (!user) return false;
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
    const initialData = initializeFormData(user);
    const hasProfileChanges = hasProfileFormChanges(formData, initialData);
    const normalizedCurrentEmail = getSafeEmailValue(user.email).toLowerCase();
    const normalizedNextEmail = emailForChange.trim().toLowerCase();
    const hasEmailChange = normalizedCurrentEmail !== normalizedNextEmail;
    const cur = currentPassword.trim();
    const neu = newPassword.trim();
    const passwordComplete = isProfilePasswordChangeComplete(cur, neu);
    return hasProfileChanges || hasEmailChange || passwordComplete;
  }, [user, formData, emailForChange, currentPassword, newPassword, t]);

  const additionalPhoneError = useMemo(
    () => (user ? getAdditionalPhoneFieldError(user, formData.additionalPhone, t) : null),
    [user, formData.additionalPhone, t],
  );

  useEffect(() => {
    if (!isInitialized) return;
    if (!token) {
      router.push('/sign');
      return;
    }
    if (hasLoadedRef.current) return;

    const loadProfile = async () => {
      try {
        if (!user) setLoadingProfile(true);
        const response = await authApi.me();
        const profileUser = response.data;
        const currentToken = localStorageGetItem('token') || useAuthStore.getState().token;
        const currentRefreshToken =
          localStorageGetItem('refresh_token') || useAuthStore.getState().refreshToken;
        setAuth(profileUser, currentToken, currentRefreshToken);
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
        const nextEmailForChange = getSafeEmailValue(profileUser.email);
        previousEmailForChangeRef.current = nextEmailForChange;
        emailNotificationsInteractionLockedRef.current = Boolean(nextEmailForChange);
        setEmailForChange(nextEmailForChange);
        hasLoadedRef.current = true;
      } catch {
        hasLoadedRef.current = true;
        logoutRef.current();
        router.push('/sign');
      } finally {
        setLoadingProfile(false);
      }
    };

    void loadProfile();
  }, [isInitialized, router, setAuth, token, user]);

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
      );
      const validationError = getProfileValidationError(
        user,
        formData,
        emailForChange,
        t,
        submitState.curPw,
        submitState.neuPw,
      );

      if (validationError) {
        toast.error(validationError);
        return;
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
          setAuth(
            response.data,
            localStorageGetItem('token') || useAuthStore.getState().token,
            localStorageGetItem('refresh_token') || useAuthStore.getState().refreshToken,
          );
          toast.success(t('profile.updateSuccess'));
        }
        if (submitState.hasEmailChange) {
          await authApi.changeEmailRequest({ newEmail: submitState.normalizedNextEmail });
          const profileResponse = await authApi.me();
          setAuth(
            profileResponse.data,
            localStorageGetItem('token') || useAuthStore.getState().token,
            localStorageGetItem('refresh_token') || useAuthStore.getState().refreshToken,
          );
          toast.success(t('profile.emailChangeLinkSent'));
        }
        if (submitState.passwordComplete) {
          await authApi.changePassword({
            currentPassword: submitState.curPw,
            newPassword: submitState.neuPw,
          });
          toast.success(t('profile.passwordChangeSuccess'));
          setCurrentPassword('');
          setNewPassword('');
        }
      } catch (err: unknown) {
        handleProfileSubmitError(err, t);
      } finally {
        setLoading(false);
      }
    },
    [formData, emailForChange, user, setAuth, t, currentPassword, newPassword],
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success(t('profile.deleteSuccess'));
      logout();
      router.replace('/');
    } catch {
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }, [user, router, logout, t]);

  return {
    user,
    isInitialized,
    token,
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

'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
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
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

function hasProfileFormChanges(
  formData: UpdateProfileDto,
  initialData: ReturnType<typeof initializeFormData>,
): boolean {
  return (
    formData.email !== initialData.email ||
    formData.firstName !== initialData.firstName ||
    formData.lastName !== initialData.lastName ||
    formData.companyName !== initialData.companyName ||
    formData.companyWebsiteUrl !== initialData.companyWebsiteUrl ||
    (formData.additionalPhone || '') !== (initialData.additionalPhone || '') ||
    formData.emailNotifications !== initialData.emailNotifications ||
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

export function useProfilePage() {
  const router = useRouter();
  const { user, isInitialized, setAuth, token, logout } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const hasLoadedRef = useRef(false);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const canSave = useMemo(() => {
    if (!user) return false;
    if (formData.email && !validateEmail(formData.email)) return false;
    if (
      formData.companyWebsiteUrl?.trim() &&
      !validateCompanyWebsiteUrl(formData.companyWebsiteUrl)
    ) {
      return false;
    }
    if (
      user.type === 'Business' &&
      formData.additionalPhone?.trim() &&
      validatePhone(formData.additionalPhone.trim(), t)
    ) {
      return false;
    }
    const initialData = initializeFormData(user);
    const hasProfileChanges = hasProfileFormChanges(formData, initialData);
    const cur = currentPassword.trim();
    const neu = newPassword.trim();
    const passwordComplete = isProfilePasswordChangeComplete(cur, neu);
    return hasProfileChanges || passwordComplete;
  }, [user, formData, currentPassword, newPassword, t]);

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
        setAuth(profileUser, useAuthStore.getState().token);
        const formDataToSet = {
          email: getSafeEmailValue(profileUser.email),
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          companyName: profileUser.companyName || '',
          companyWebsiteUrl: profileUser.companyWebsiteUrl || '',
          additionalPhone: profileUser.additionalPhone || '',
          emailNotifications: convertToBoolean(profileUser.emailNotifications),
          viber: convertToBoolean(profileUser.viber),
          whatsapp: convertToBoolean(profileUser.whatsapp),
          telegram: convertToBoolean(profileUser.telegram),
        };
        setFormData(formDataToSet);
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
  }, [user]);

  const handleChange = useCallback((field: keyof UpdateProfileDto, value: string | boolean) => {
    setFormData((prev) => {
      const nextValue = field === 'email' ? (value as string) : value;
      const newData = { ...prev, [field]: nextValue };
      return newData;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (formData.email && !validateEmail(formData.email)) {
        toast.error(t('profile.invalidEmail'));
        return;
      }
      if (formData.companyWebsiteUrl && !validateCompanyWebsiteUrl(formData.companyWebsiteUrl)) {
        toast.error(t('profile.invalidCompanyWebsiteUrl'));
        return;
      }
      if (user.type === 'Business' && formData.additionalPhone?.trim()) {
        const phoneErr = validatePhone(formData.additionalPhone.trim(), t);
        if (phoneErr) {
          toast.error(phoneErr);
          return;
        }
        if (formData.additionalPhone.trim() === (user.phone || '').trim()) {
          toast.error(t('errors.additionalPhoneSameAsPrimary'));
          return;
        }
      }
      const initialData = initializeFormData(user);
      const hasProfileChanges = hasProfileFormChanges(formData, initialData);
      const curPw = currentPassword.trim();
      const neuPw = newPassword.trim();
      const passwordComplete = isProfilePasswordChangeComplete(curPw, neuPw);
      const passwordError = getProfilePasswordChangeError(curPw, neuPw, t);
      if (passwordError) {
        toast.error(passwordError);
        return;
      }

      if (!hasProfileChanges && !passwordComplete) {
        return;
      }

      setLoading(true);
      try {
        if (hasProfileChanges) {
          const response = await authApi.updateProfile(formData);
          setAuth(response.data, useAuthStore.getState().token);
          toast.success(t('profile.updateSuccess'));
        }
        if (passwordComplete) {
          await authApi.changePassword({ currentPassword: curPw, newPassword: neuPw });
          toast.success(t('profile.passwordChangeSuccess'));
          setCurrentPassword('');
          setNewPassword('');
        }
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [formData, user, setAuth, t, currentPassword, newPassword],
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
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    handleChange,
    handleSubmit,
    canSave,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    handleDeleteAccount,
  };
}

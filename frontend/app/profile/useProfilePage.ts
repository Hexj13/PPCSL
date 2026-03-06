'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  convertToBoolean,
  initializeFormData,
  validateCompanyWebsiteUrl,
  validateEmail,
} from '@/app/profile/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { UpdateProfileDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

export function useProfilePage() {
  const router = useRouter();
  const { user, isInitialized, setAuth, token, logout } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
  const [emailError, setEmailError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasLoadedRef = useRef(false);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!isInitialized) return;
    if (!token) {
      router.push('/login');
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
          email: profileUser.email || '',
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          companyName: profileUser.companyName || '',
          companyWebsiteUrl: profileUser.companyWebsiteUrl || '',
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
        router.push('/login');
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
      const hasChanges =
        prev.email !== newFormData.email ||
        prev.firstName !== newFormData.firstName ||
        prev.lastName !== newFormData.lastName ||
        prev.companyName !== newFormData.companyName ||
        prev.companyWebsiteUrl !== newFormData.companyWebsiteUrl ||
        prev.emailNotifications !== newFormData.emailNotifications ||
        prev.viber !== newFormData.viber ||
        prev.whatsapp !== newFormData.whatsapp ||
        prev.telegram !== newFormData.telegram;
      return hasChanges ? newFormData : prev;
    });
  }, [user]);

  const handleChange = useCallback(
    (field: keyof UpdateProfileDto, value: string | boolean) => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };
        if (field === 'email') {
          const emailValue = value as string;
          if (emailValue && !validateEmail(emailValue)) {
            setEmailError(t('profile.invalidEmail'));
          } else {
            setEmailError('');
          }
        }
        return newData;
      });
    },
    [t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (emailError) {
        toast.error(t('profile.fixEmail'));
        return;
      }
      if (formData.email && !validateEmail(formData.email)) {
        toast.error(t('profile.invalidEmail'));
        return;
      }
      if (formData.companyWebsiteUrl && !validateCompanyWebsiteUrl(formData.companyWebsiteUrl)) {
        toast.error(t('profile.invalidCompanyWebsiteUrl'));
        return;
      }
      const initialData = initializeFormData(user);
      const hasChanges =
        formData.email !== initialData.email ||
        formData.firstName !== initialData.firstName ||
        formData.lastName !== initialData.lastName ||
        formData.companyName !== initialData.companyName ||
        formData.companyWebsiteUrl !== initialData.companyWebsiteUrl ||
        formData.emailNotifications !== initialData.emailNotifications ||
        formData.viber !== initialData.viber ||
        formData.whatsapp !== initialData.whatsapp ||
        formData.telegram !== initialData.telegram;
      if (!hasChanges) {
        toast.success(t('profile.noChanges'));
        return;
      }
      setLoading(true);
      try {
        const response = await authApi.updateProfile(formData);
        setAuth(response.data, useAuthStore.getState().token);
        toast.success(t('profile.updateSuccess'));
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [formData, user, setAuth, emailError, t],
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
    emailError,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    handleChange,
    handleSubmit,
    handleDeleteAccount,
  };
}

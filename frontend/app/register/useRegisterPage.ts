'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { getPasswordValidationRules, validatePassword } from '@/app/reset-password/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { RegisterDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import { compactE164Phone, finalizePhoneFromRawInput, sanitizePhoneInput } from '@/lib/phone';
import { getReturnUrlFromSearchParams } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

import { getRegisterSubmitErrorMessage, validatePhone } from './utils';

export type RegisterFormState = {
  email: string;
  password: string;
  type: 'Individual' | 'Business';
  phone: string;
  firstName: string;
  lastName: string;
  companyName: string;
  emailNotifications: boolean;
  viber: boolean;
  whatsapp: boolean;
  telegram: boolean;
  termsAccepted: boolean;
};

const initialFormState: RegisterFormState = {
  email: '',
  password: '',
  type: 'Individual',
  phone: '',
  firstName: '',
  lastName: '',
  companyName: '',
  emailNotifications: false,
  viber: false,
  whatsapp: false,
  telegram: false,
  termsAccepted: false,
};

function buildSubmitData(formData: RegisterFormState): RegisterDto {
  if (formData.type === 'Individual') {
    return {
      ...formData,
      companyName: '',
      email: undefined,
      emailNotifications: false,
      firstName: undefined,
      lastName: undefined,
    };
  }
  return {
    ...formData,
    email: formData.email?.trim() || undefined,
    emailNotifications: formData.emailNotifications ?? false,
    firstName: '',
    lastName: '',
  };
}

function getFilledFields(formData: RegisterFormState): Record<string, boolean> {
  return {
    phone: !!formData.phone,
    password: !!formData.password,
    type: true,
    messengers: formData.viber || formData.whatsapp || formData.telegram,
    ...(formData.type === 'Business' && { companyName: !!formData.companyName }),
  };
}

export function useRegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const [formData, setFormData] = useState<RegisterFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const prevTypeRef = useRef<'Individual' | 'Business'>(formData.type);
  const formStartSentRef = useRef(false);

  useEffect(() => {
    if (isInitialized && user) {
      router.push('/');
    }
  }, [user, isInitialized, router]);

  useEffect(() => {
    if (formData.type === 'Individual' && prevTypeRef.current !== formData.type) {
      setFormData((prev) => ({
        ...prev,
        email: '',
        emailNotifications: false,
        firstName: '',
        lastName: '',
      }));
      setPhoneTouched(false);
      setPhoneError('');
    }
    prevTypeRef.current = formData.type;
  }, [formData.type]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setFormData((prev) => ({ ...prev, phone: '' }));
      if (phoneTouched) setPhoneError('');
      return;
    }
    const value = sanitizePhoneInput(raw);
    setFormData((prev) => ({ ...prev, phone: value }));
    if (phoneTouched) {
      setPhoneError(value ? validatePhone(value, t) : '');
    }
  };

  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setPhoneTouched(true);
    const { phone, error } = finalizePhoneFromRawInput(e.target.value, t);
    setFormData((prev) => ({ ...prev, phone }));
    setPhoneError(error);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData((prev) => ({ ...prev, password }));
    if (password) {
      setPasswordError(validatePassword(password, t));
    } else {
      setPasswordError('');
    }
  };

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart('register');
      formStartSentRef.current = true;
    }
  };

  const validateForm = (): boolean => {
    if (!formData.termsAccepted) {
      analytics.formSubmit('register', false);
      toast.error(t('register.termsRequired'));
      return false;
    }
    if (!formData.password.trim()) {
      analytics.formSubmit('register', false);
      toast.error(t('register.passwordRequired'));
      return false;
    }
    const pwdErr = validatePassword(formData.password, t);
    if (pwdErr) {
      analytics.formSubmit('register', false);
      toast.error(pwdErr);
      setPasswordError(pwdErr);
      return false;
    }
    if (formData.type === 'Individual') {
      if (!formData.phone.trim()) {
        setPhoneTouched(true);
        toast.error(t('register.phoneRequired'));
        setPhoneError(t('register.phoneRequired'));
        return false;
      }
      setPhoneTouched(true);
      const phoneErr = validatePhone(formData.phone, t);
      if (phoneErr) {
        toast.error(phoneErr);
        setPhoneError(phoneErr);
        return false;
      }
      return true;
    }
    if (!formData.companyName.trim()) {
      toast.error(t('register.companyNameRequired'));
      return false;
    }
    const trimmed = formData.companyName.trim();
    if (trimmed.length < 2) {
      toast.error(t('register.companyNameMinLength'));
      return false;
    }
    if (trimmed.length > 100) {
      toast.error(t('register.companyNameMaxLength'));
      return false;
    }
    if (!formData.phone.trim()) {
      setPhoneTouched(true);
      toast.error(t('register.phoneRequired'));
      setPhoneError(t('register.phoneRequired'));
      return false;
    }
    setPhoneTouched(true);
    const phoneErr = validatePhone(formData.phone, t);
    if (phoneErr) {
      toast.error(phoneErr);
      setPhoneError(phoneErr);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = buildSubmitData(formData);
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }
      try {
        const phoneE164 = compactE164Phone(formData.phone);
        await authApi.sendSms({ phone: phoneE164 });
        analytics.formSubmit('register', true, getFilledFields(formData));
        localStorageSetItem(
          'pendingRegistration',
          JSON.stringify({ ...submitData, phone: phoneE164 }),
        );
        const query = new URLSearchParams({ phone: phoneE164 });
        if (returnUrl) {
          query.set('returnUrl', returnUrl);
        }
        router.push(`/verify-phone?${query.toString()}`);
      } catch (checkError: unknown) {
        const axiosError = checkError as Parameters<typeof getRegisterSubmitErrorMessage>[0];
        const errorMessage = getRegisterSubmitErrorMessage(axiosError, t);
        analytics.formSubmit('register', false, getFilledFields(formData));
        toast.error(errorMessage);
        setPhoneError(errorMessage);
      }
    } catch {
      analytics.formSubmit('register', false, getFilledFields(formData));
      toast.error(t('register.dataPreparationError'));
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    formData,
    setFormData,
    loading,
    passwordError,
    phoneError,
    phoneTouched,
    showPassword,
    setShowPassword,
    getPasswordValidationRules: (password: string) => getPasswordValidationRules(password, t),
    handlePhoneChange,
    handlePhoneBlur,
    handlePasswordChange,
    handleFormFieldFocus,
    handleSubmit,
  };
}

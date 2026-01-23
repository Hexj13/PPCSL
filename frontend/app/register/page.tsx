'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, RegisterDto } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LoadingButton } from '@/ui';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    type: 'Individual' as 'Individual' | 'Business',
    phone: '',
    firstName: '',
    lastName: '',
    companyName: '',
    emailNotifications: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    termsAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
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
      setEmailError('');
      setPhoneTouched(false);
      setPhoneError('');
    }
    prevTypeRef.current = formData.type;
  }, [formData.type]);

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return t('register.passwordMinLength');
    }
    if (!/[A-Z]/.test(password)) {
      return t('register.passwordUppercase');
    }
    if (!/[a-z]/.test(password)) {
      return t('register.passwordLowercase');
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return t('register.passwordSpecial');
    }
    return '';
  };

  const getPasswordValidationRules = (password: string) => {
    return [
      {
        text: t('register.passwordRuleMinLength'),
        isValid: password.length >= 8,
      },
      {
        text: t('register.passwordRuleUppercase'),
        isValid: /[A-Z]/.test(password),
      },
      {
        text: t('register.passwordRuleLowercase'),
        isValid: /[a-z]/.test(password),
      },
      {
        text: t('register.passwordRuleSpecial'),
        isValid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      },
    ];
  };

  const validatePhone = (phone: string): string => {
    if (!phone) {
      return '';
    }
    if (!phone.startsWith('+')) {
      return t('register.phoneMustStartWithPlus');
    }
    const phoneWithoutPlus = phone.substring(1);
    if (phoneWithoutPlus.length < 7 || phoneWithoutPlus.length > 19) {
      return t('register.phoneLength');
    }
    if (!/^\d+$/.test(phoneWithoutPlus)) {
      return t('register.phoneDigitsOnly');
    }
    const countryCodeMatch = phoneWithoutPlus.match(/^(\d{1,4})(\d{6,15})$/);
    if (!countryCodeMatch) {
      return t('register.phoneFormat');
    }
    const [, countryCode, number] = countryCodeMatch;
    if (countryCode.length < 1 || countryCode.length > 4) {
      return t('register.countryCodeLength');
    }
    if (number.length < 6 || number.length > 15) {
      return t('register.numberLength');
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email) {
      return '';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t('register.emailInvalid');
    }
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (value === '') {
      setFormData({ ...formData, phone: '' });
      if (phoneTouched) {
        setPhoneError('');
      }
      return;
    }

    value = value.replace(/[^\d+]/g, '');

    const plusCount = (value.match(/\+/g) || []).length;
    if (plusCount > 1) {
      value = '+' + value.replace(/\+/g, '');
    }

    if (value.length > 0 && value[0] !== '+') {
      if (value.startsWith('0')) {
        value = '+389' + value.substring(1);
      } else {
        value = '+' + value.replace(/\+/g, '');
      }
    } else if (value.startsWith('+0')) {
      value = '+389' + value.substring(2);
    }

    if (value.length > 20) {
      value = value.slice(0, 20);
    }

    setFormData({ ...formData, phone: value });
    if (phoneTouched && value) {
      setPhoneError(validatePhone(value));
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (formData.phone) {
      setPhoneError(validatePhone(formData.phone));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    if (password) {
      setPasswordError(validatePassword(password));
    } else {
      setPasswordError('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setFormData({
      ...formData,
      email,
      emailNotifications: email ? formData.emailNotifications : false,
    });
    if (email) {
      setEmailError(validateEmail(email));
    } else {
      setEmailError('');
    }
  };

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart('register');
      formStartSentRef.current = true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      analytics.formSubmit('register', false);
      toast.error(t('register.termsRequired'));
      return;
    }

    if (!formData.password.trim()) {
      analytics.formSubmit('register', false);
      toast.error(t('register.passwordRequired'));
      return;
    }

    const passwordValidationError = validatePassword(formData.password);
    if (passwordValidationError) {
      analytics.formSubmit('register', false);
      toast.error(passwordValidationError);
      setPasswordError(passwordValidationError);
      return;
    }

    if (formData.type === 'Individual') {
      if (!formData.phone.trim()) {
        setPhoneTouched(true);
        toast.error(t('register.phoneRequired'));
        setPhoneError(t('register.phoneRequired'));
        return;
      }
      setPhoneTouched(true);
      const phoneValidationError = validatePhone(formData.phone);
      if (phoneValidationError) {
        toast.error(phoneValidationError);
        setPhoneError(phoneValidationError);
        return;
      }
    } else {
      if (!formData.companyName.trim()) {
        toast.error(t('register.companyNameRequired'));
        return;
      }
      if (formData.companyName.trim().length < 2) {
        toast.error(t('register.companyNameMinLength'));
        return;
      }
      if (formData.companyName.trim().length > 100) {
        toast.error(t('register.companyNameMaxLength'));
        return;
      }
      if (!formData.phone.trim()) {
        setPhoneTouched(true);
        toast.error(t('register.phoneRequired'));
        setPhoneError(t('register.phoneRequired'));
        return;
      }
      setPhoneTouched(true);
      const phoneValidationError = validatePhone(formData.phone);
      if (phoneValidationError) {
        toast.error(phoneValidationError);
        setPhoneError(phoneValidationError);
        return;
      }
      if (!formData.email || !formData.email.trim()) {
        toast.error(t('register.emailRequired'));
        return;
      }
      const emailValidationError = validateEmail(formData.email);
      if (emailValidationError) {
        toast.error(emailValidationError);
        setEmailError(emailValidationError);
        return;
      }
    }

    setLoading(true);

    try {
      let submitData: RegisterDto;

      if (formData.type === 'Individual') {
        submitData = {
          ...formData,
          companyName: '',
          email: undefined,
          emailNotifications: false,
          firstName: undefined,
          lastName: undefined,
        };
      } else {
        submitData = {
          ...formData,
          firstName: '',
          lastName: '',
        };
      }

      if (typeof window !== 'undefined') {
        try {
          await authApi.sendSms({ phone: formData.phone });
          const filledFields: Record<string, boolean> = {
            phone: !!formData.phone,
            password: !!formData.password,
            type: true,
            messengers: formData.viber || formData.whatsapp || formData.telegram,
            ...(formData.type === 'Business' && {
              companyName: !!formData.companyName,
              email: !!formData.email,
              emailNotifications: formData.emailNotifications,
            }),
          };
          analytics.formSubmit('register', true, filledFields);
          localStorage.setItem('pendingRegistration', JSON.stringify(submitData));
          router.push(`/verify-phone?phone=${encodeURIComponent(formData.phone)}`);
        } catch (checkError: unknown) {
          const axiosError = checkError as {
            response?: {
              status?: number;
              data?: { message?: string | string[] };
              statusText?: string;
            };
            message?: string;
            code?: string;
          };

          let errorMessage = t('register.phoneExists');

          if (axiosError.response) {
            const status = axiosError.response.status;
            const data = axiosError.response.data;

            if (status === 400) {
              if (data?.message) {
                if (Array.isArray(data.message)) {
                  errorMessage = data.message[0] || t('register.phoneExists');
                } else {
                  errorMessage = data.message;
                }
              } else {
                errorMessage = t('register.phoneExists');
              }
            } else if (status === 404) {
              errorMessage = t('register.serviceUnavailable');
            } else if (status === 422) {
              if (data?.message) {
                if (Array.isArray(data.message)) {
                  errorMessage = data.message[0] || t('register.invalidPhoneFormat');
                } else {
                  errorMessage = data.message;
                }
              } else {
                errorMessage = t('register.invalidPhoneFormat');
              }
            } else if (status && status >= 500) {
              errorMessage = t('register.serverError');
            } else {
              errorMessage =
                (data?.message && (Array.isArray(data.message) ? data.message[0] : data.message)) ||
                t('register.phoneCheckError');
            }
          } else if (
            axiosError.message?.includes('Network') ||
            axiosError.message?.includes('timeout') ||
            axiosError.code === 'ERR_NETWORK'
          ) {
            errorMessage = t('register.networkError');
          } else if (
            axiosError.message?.includes('Cannot POST') ||
            axiosError.message?.includes('404')
          ) {
            errorMessage = t('register.phoneServiceUnavailable');
          }

          const filledFields: Record<string, boolean> = {
            phone: !!formData.phone,
            password: !!formData.password,
            type: true,
            messengers: formData.viber || formData.whatsapp || formData.telegram,
            ...(formData.type === 'Business' && {
              companyName: !!formData.companyName,
              email: !!formData.email,
              emailNotifications: formData.emailNotifications,
            }),
          };
          analytics.formSubmit('register', false, filledFields);
          toast.error(errorMessage);
          setPhoneError(errorMessage);
          setLoading(false);
          return;
        }
      }
    } catch {
      const filledFields: Record<string, boolean> = {
        phone: !!formData.phone,
        password: !!formData.password,
        type: true,
        messengers: formData.viber || formData.whatsapp || formData.telegram,
        ...(formData.type === 'Business' && {
          companyName: !!formData.companyName,
          email: !!formData.email,
          emailNotifications: formData.emailNotifications,
        }),
      };
      analytics.formSubmit('register', false, filledFields);
      toast.error(t('register.dataPreparationError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {t('register.title')}
      </h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8" autoComplete="off">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-500">
            {t('register.userType')}
          </label>
          <div className="flex bg-bg-base rounded-lg p-1 border-2 border-primary-500/30">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Individual' })}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
                formData.type === 'Individual'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-text-secondary'
              }`}
            >
              {t('register.individual')}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Business' })}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
                formData.type === 'Business'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400 hover:text-text-secondary'
              }`}
            >
              {t('register.business')}
            </button>
          </div>
        </div>

        {formData.type === 'Individual' ? (
          <>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.phone')} <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                onFocus={handleFormFieldFocus}
                className={`input-field ${phoneTouched && phoneError ? 'border-red-500' : ''}`}
                placeholder="+38970123456"
                autoComplete="off"
              />
              {phoneTouched && phoneError && (
                <p className="mt-1 text-sm text-red-400">{phoneError}</p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.messengers')}{' '}
                <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
              </label>
              {/* eslint-disable no-hardcoded-text/no-hardcoded-text */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.viber}
                      onChange={(e) => setFormData({ ...formData, viber: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, viber: !formData.viber });
                      }}
                      className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        formData.viber
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500 text-text-secondary'
                      }`}
                    >
                      <span className="text-sm font-semibold">Viber</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, whatsapp: !formData.whatsapp });
                      }}
                      className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        formData.whatsapp
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500 text-text-secondary'
                      }`}
                    >
                      <span className="text-sm font-semibold">WhatsApp</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.telegram}
                      onChange={(e) => setFormData({ ...formData, telegram: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, telegram: !formData.telegram });
                      }}
                      className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        formData.telegram
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500 text-text-secondary'
                      }`}
                    >
                      <span className="text-sm font-semibold">Telegram</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* eslint-enable no-hardcoded-text/no-hardcoded-text */}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.password')} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className={`input-field pr-10 ${passwordError ? 'border-red-500' : ''}`}
                  placeholder={t('register.passwordPlaceholder')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {getPasswordValidationRules(formData.password).map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {rule.isValid ? (
                      <svg
                        className="w-3 h-3 text-primary-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <p
                      className={`text-[10px] leading-tight ${
                        rule.isValid ? 'text-primary-500' : 'text-gray-400'
                      } transition-colors`}
                    >
                      {rule.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.companyName')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.companyName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    setFormData({ ...formData, companyName: value });
                  }
                }}
                className="input-field"
                placeholder={t('register.companyName')}
                autoComplete="off"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.email')} <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={handleEmailChange}
                className={`input-field ${emailError ? 'border-red-500' : ''}`}
                // eslint-disable-next-line no-hardcoded-text/no-hardcoded-text
                placeholder="example@company.com"
                autoComplete="off"
              />
              {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.phone')} <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                onFocus={handleFormFieldFocus}
                className={`input-field ${phoneTouched && phoneError ? 'border-red-500' : ''}`}
                placeholder="+38970123456"
                autoComplete="off"
              />
              {phoneTouched && phoneError && (
                <p className="mt-1 text-sm text-red-400">{phoneError}</p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.messengers')}{' '}
                <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
              </label>
              {/* eslint-disable no-hardcoded-text/no-hardcoded-text */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.viber}
                      onChange={(e) => setFormData({ ...formData, viber: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, viber: !formData.viber });
                      }}
                      className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        formData.viber
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500 text-text-secondary'
                      }`}
                    >
                      <span className="text-sm font-semibold">Viber</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, whatsapp: !formData.whatsapp });
                      }}
                      className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        formData.whatsapp
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500 text-text-secondary'
                      }`}
                    >
                      <span className="text-sm font-semibold">WhatsApp</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={formData.telegram}
                      onChange={(e) => setFormData({ ...formData, telegram: e.target.checked })}
                      className="sr-only"
                    />
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, telegram: !formData.telegram });
                      }}
                      className={`px-4 py-3 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                        formData.telegram
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500 text-text-secondary'
                      }`}
                    >
                      <span className="text-sm font-semibold">Telegram</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* eslint-enable no-hardcoded-text/no-hardcoded-text */}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.password')} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className={`input-field pr-10 ${passwordError ? 'border-red-500' : ''}`}
                  placeholder={t('register.passwordPlaceholder')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {getPasswordValidationRules(formData.password).map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {rule.isValid ? (
                      <svg
                        className="w-3 h-3 text-primary-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                    <p
                      className={`text-[10px] leading-tight ${
                        rule.isValid ? 'text-primary-500' : 'text-gray-400'
                      } transition-colors`}
                    >
                      {rule.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.emailNotifications}
                    onChange={(e) =>
                      setFormData({ ...formData, emailNotifications: e.target.checked })
                    }
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      setFormData({
                        ...formData,
                        emailNotifications: !formData.emailNotifications,
                      });
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.emailNotifications
                        ? 'bg-primary-500 border-primary-700'
                        : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
                    }`}
                  >
                    {formData.emailNotifications && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span
                  onClick={() =>
                    setFormData({ ...formData, emailNotifications: !formData.emailNotifications })
                  }
                  className={`text-sm cursor-pointer ${
                    formData.emailNotifications ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  {t('register.emailNotifications')}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="mb-5">
          <div className="flex items-start gap-3 group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className="sr-only"
                required
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData({ ...formData, termsAccepted: !formData.termsAccepted });
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer flex-shrink-0 ${
                  formData.termsAccepted
                    ? 'bg-primary-500 border-primary-700'
                    : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
                }`}
              >
                {formData.termsAccepted && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              onClick={() => setFormData({ ...formData, termsAccepted: !formData.termsAccepted })}
              className={`text-sm cursor-pointer leading-relaxed ${
                formData.termsAccepted ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {t('register.termsAccept')}{' '}
              <Link
                href="/terms"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="text-primary-400 hover:text-primary-300 underline font-semibold"
              >
                {t('register.termsLink')}
              </Link>
              <span className="text-red-400"> *</span>
            </span>
          </div>
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          loadingText={t('register.registering')}
          className="w-full text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('register.registerButton')}
        </LoadingButton>

        <p className="mt-5 text-center text-sm text-hint">
          {t('register.alreadyHaveAccount')}{' '}
          <a
            href="/login"
            className="text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors"
          >
            {t('header.login')}
          </a>
        </p>
      </form>
    </div>
  );
}

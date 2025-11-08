'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { authApi, RegisterDto } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function RegisterPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
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
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isInitialized && user) {
      router.push('/');
    }
  }, [user, isInitialized, router]);

  if (isInitialized && user) {
    return null;
  }

  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return 'Лозинката мора да содржи минимум 8 карактери';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Лозинката мора да содржи барем една голема буква';
    }
    if (!/[a-z]/.test(password)) {
      return 'Лозинката мора да содржи барем една мала буква';
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return 'Лозинката мора да содржи барем еден специјален карактер';
    }
    return '';
  };

  const getPasswordValidationRules = (password: string) => {
    return [
      {
        text: 'Минимум 8 карактери',
        isValid: password.length >= 8,
      },
      {
        text: 'Барем една голема буква',
        isValid: /[A-Z]/.test(password),
      },
      {
        text: 'Барем една мала буква',
        isValid: /[a-z]/.test(password),
      },
      {
        text: 'Барем еден специјален карактер',
        isValid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      },
    ];
  };

  const validatePhone = (phone: string): string => {
    if (!phone) {
      return '';
    }
    if (!phone.startsWith('+')) {
      return 'Телефонот мора да започнува со +';
    }
    const phoneWithoutPlus = phone.substring(1);
    if (phoneWithoutPlus.length < 7 || phoneWithoutPlus.length > 19) {
      return 'Телефонот мора да содржи 7-19 цифри (вклучувајќи го кодот на државата)';
    }
    if (!/^\d+$/.test(phoneWithoutPlus)) {
      return 'Телефонот мора да содржи само цифри после +';
    }
    const countryCodeMatch = phoneWithoutPlus.match(/^(\d{1,4})(\d{6,15})$/);
    if (!countryCodeMatch) {
      return 'Телефонот мора да биде во формат +код држава (1-4 цифри) + број (6-15 цифри)';
    }
    const [, countryCode, number] = countryCodeMatch;
    if (countryCode.length < 1 || countryCode.length > 4) {
      return 'Кодот на државата мора да биде 1-4 цифри';
    }
    if (number.length < 6 || number.length > 15) {
      return 'Бројот мора да биде 6-15 цифри';
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email) {
      return '';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Невалидна email адреса';
    }
    return '';
  };

  const validateName = (name: string): string => {
    if (!name) {
      return '';
    }
    const nameRegex = /^[a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]+$/;
    if (!nameRegex.test(name)) {
      return 'Името може да содржи само букви, пробели, тире и дефис';
    }
    return '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (value === '') {
      setFormData({ ...formData, phone: '' });
      setPhoneError('');
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
    if (value) {
      setPhoneError(validatePhone(value));
    } else {
      setPhoneError('');
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

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
    setFormData({ ...formData, firstName: value });
    if (value) {
      setFirstNameError(validateName(value));
    } else {
      setFirstNameError('');
    }
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
    setFormData({ ...formData, lastName: value });
    if (value) {
      setLastNameError(validateName(value));
    } else {
      setLastNameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      toast.error('Мора да ги прифатите условите за користење');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Лозинката е задолжителна');
      return;
    }

    const passwordValidationError = validatePassword(formData.password);
    if (passwordValidationError) {
      toast.error(passwordValidationError);
      setPasswordError(passwordValidationError);
      return;
    }

    if (formData.type === 'Individual') {
      if (!formData.phone.trim()) {
        toast.error('Телефонот е задолжителен');
        return;
      }
      const phoneValidationError = validatePhone(formData.phone);
      if (phoneValidationError) {
        toast.error(phoneValidationError);
        setPhoneError(phoneValidationError);
        return;
      }
      if (!formData.firstName.trim()) {
        toast.error('Името е задолжително');
        return;
      }
      const firstNameValidationError = validateName(formData.firstName.trim());
      if (firstNameValidationError) {
        toast.error(firstNameValidationError);
        setFirstNameError(firstNameValidationError);
        return;
      }
      if (formData.firstName.trim().length < 2) {
        toast.error('Името мора да содржи минимум 2 карактери');
        return;
      }
      if (formData.firstName.trim().length > 50) {
        toast.error('Името не може да биде подолго од 50 карактери');
        return;
      }
      if (formData.lastName && formData.lastName.trim()) {
        const lastNameValidationError = validateName(formData.lastName.trim());
        if (lastNameValidationError) {
          toast.error(lastNameValidationError);
          setLastNameError(lastNameValidationError);
          return;
        }
        if (formData.lastName.trim().length < 2) {
          toast.error('Презимето мора да содржи минимум 2 карактери');
          return;
        }
        if (formData.lastName.trim().length > 50) {
          toast.error('Презимето не може да биде подолго од 50 карактери');
          return;
        }
      }
      if (formData.email) {
        const emailValidationError = validateEmail(formData.email);
        if (emailValidationError) {
          toast.error(emailValidationError);
          setEmailError(emailValidationError);
          return;
        }
      }
    } else {
      if (!formData.companyName.trim()) {
        toast.error('Името на компанијата е задолжително');
        return;
      }
      if (formData.companyName.trim().length < 2) {
        toast.error('Името на компанијата мора да содржи минимум 2 карактери');
        return;
      }
      if (formData.companyName.trim().length > 100) {
        toast.error('Името на компанијата не може да биде подолго од 100 карактери');
        return;
      }
      if (!formData.phone.trim()) {
        toast.error('Телефонот е задолжителен');
        return;
      }
      const phoneValidationError = validatePhone(formData.phone);
      if (phoneValidationError) {
        toast.error(phoneValidationError);
        setPhoneError(phoneValidationError);
        return;
      }
      if (!formData.email || !formData.email.trim()) {
        toast.error('Email е задолжителен');
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
          emailNotifications:
            formData.email && formData.email.trim() ? formData.emailNotifications : false,
        };
        if (!formData.email || !formData.email.trim()) {
          delete submitData.email;
        }
        if (!formData.lastName || !formData.lastName.trim()) {
          delete submitData.lastName;
        }
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

          let errorMessage = 'Корисник со овој телефон веќе постои';

          if (axiosError.response) {
            const status = axiosError.response.status;
            const data = axiosError.response.data;

            if (status === 400) {
              if (data?.message) {
                if (Array.isArray(data.message)) {
                  errorMessage = data.message[0] || 'Корисник со овој телефон веќе постои';
                } else {
                  errorMessage = data.message;
                }
              } else {
                errorMessage = 'Корисник со овој телефон веќе постои';
              }
            } else if (status === 404) {
              errorMessage =
                'Сервисот не е достапен. Проверете дали backend серверот работи и е презапуштен.';
            } else if (status === 422) {
              if (data?.message) {
                if (Array.isArray(data.message)) {
                  errorMessage = data.message[0] || 'Невалиден формат на телефон';
                } else {
                  errorMessage = data.message;
                }
              } else {
                errorMessage = 'Невалиден формат на телефон';
              }
            } else if (status && status >= 500) {
              errorMessage = 'Грешка на серверот. Обидете се повторно подоцна.';
            } else {
              errorMessage =
                (data?.message && (Array.isArray(data.message) ? data.message[0] : data.message)) ||
                'Грешка при проверка на телефон. Обидете се повторно.';
            }
          } else if (
            axiosError.message?.includes('Network') ||
            axiosError.message?.includes('timeout') ||
            axiosError.code === 'ERR_NETWORK'
          ) {
            errorMessage = 'Грешка во мрежата. Проверете ја вашата интернет врска.';
          } else if (
            axiosError.message?.includes('Cannot POST') ||
            axiosError.message?.includes('404')
          ) {
            errorMessage =
              'Сервисот за проверка на телефон не е достапен. Проверете дали серверот работи.';
          }

          toast.error(errorMessage);
          setPhoneError(errorMessage);
          setLoading(false);
          return;
        }
      }
    } catch {
      toast.error('Грешка при подготовка на податоците');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Регистрација
      </h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8" autoComplete="off">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-3 text-primary-400">
            Тип на корисник
          </label>
          <div className="flex bg-bg-dark rounded-lg p-1 border-2 border-primary-500/30">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Individual' })}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
                formData.type === 'Individual'
                  ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Физичко лице
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Business' })}
              className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
                formData.type === 'Business'
                  ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Правно лице
            </button>
          </div>
        </div>

        {formData.type === 'Individual' ? (
          <>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Телефон <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`input-field ${phoneError ? 'border-red-500' : ''}`}
                placeholder="+38970123456"
                autoComplete="off"
              />
              {phoneError && <p className="mt-1 text-sm text-red-400">{phoneError}</p>}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-3 text-primary-400">
                Достапни месенџери{' '}
                <span className="text-gray-300 text-xs font-normal">(опционално)</span>
              </label>
              <div className="flex gap-3">
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 text-gray-400'
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 text-gray-400'
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 text-gray-400'
                      }`}
                    >
                      <span className="text-sm font-semibold">Telegram</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Лозинка <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className={`input-field pr-10 ${passwordError ? 'border-red-500' : ''}`}
                  placeholder="Внесете лозинка"
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
                        className="w-3 h-3 text-green-400 flex-shrink-0"
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
                        rule.isValid ? 'text-green-400' : 'text-gray-400'
                      } transition-colors`}
                    >
                      {rule.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Име <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={handleFirstNameChange}
                className={`input-field ${firstNameError ? 'border-red-500' : ''}`}
                placeholder="Вашето име"
                autoComplete="off"
              />
              {firstNameError && <p className="mt-1 text-sm text-red-400">{firstNameError}</p>}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Презиме <span className="text-gray-300 text-xs">(опционално)</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={handleLastNameChange}
                className={`input-field ${lastNameError ? 'border-red-500' : ''}`}
                placeholder="Вашето презиме"
                autoComplete="off"
              />
              {lastNameError && <p className="mt-1 text-sm text-red-400">{lastNameError}</p>}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center justify-between">
                <span>
                  Email <span className="text-gray-300 text-xs">(опционално)</span>
                </span>
                <span className="group relative inline-block">
                  <svg
                    className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-help transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="absolute bottom-full right-0 mb-2 w-64 px-3 py-2 text-xs text-gray-300 bg-bg-darker border border-primary-500/30 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                    Ако е наведена и пошта, најавата може да се изврши и по број на телефон и по
                    пошта
                  </span>
                </span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                className={`input-field ${emailError ? 'border-red-500' : ''}`}
                placeholder="example@email.com"
                autoComplete="off"
              />
              {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
            </div>

            {formData.email && (
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
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
                    className="text-sm text-white cursor-pointer"
                  >
                    Примам рассулка на вести и известувања на пошта
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Име на компанија <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="input-field"
                placeholder="Име на компанијата"
                autoComplete="off"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={handleEmailChange}
                className={`input-field ${emailError ? 'border-red-500' : ''}`}
                placeholder="example@company.com"
                autoComplete="off"
              />
              {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
              <p className="mt-1 text-xs text-gray-300">
                Корпоративна пошта на која примате работни писма
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Телефон <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`input-field ${phoneError ? 'border-red-500' : ''}`}
                placeholder="+38970123456"
                autoComplete="off"
              />
              {phoneError && <p className="mt-1 text-sm text-red-400">{phoneError}</p>}
              <p className="mt-1 text-xs text-gray-300">Работен телефон на кој работите</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-3 text-primary-400">
                Достапни месенџери{' '}
                <span className="text-gray-300 text-xs font-normal">(опционално)</span>
              </label>
              <div className="flex gap-3">
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 text-gray-400'
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 text-gray-400'
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
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 text-white'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 text-gray-400'
                      }`}
                    >
                      <span className="text-sm font-semibold">Telegram</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Лозинка <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handlePasswordChange}
                  className={`input-field pr-10 ${passwordError ? 'border-red-500' : ''}`}
                  placeholder="Внесете лозинка"
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
                        className="w-3 h-3 text-green-400 flex-shrink-0"
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
                        rule.isValid ? 'text-green-400' : 'text-gray-400'
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
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
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
                  className="text-sm text-white cursor-pointer"
                >
                  Примам рассулка на вести и известувања на пошта
                </span>
              </div>
            </div>
          </>
        )}

        <div className="mb-6">
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
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                    : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
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
              className="text-sm text-white cursor-pointer leading-relaxed"
            >
              Се согласувам со{' '}
              <Link
                href="/terms"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
                className="text-primary-400 hover:text-primary-300 underline font-semibold"
              >
                условите за користење
              </Link>
              <span className="text-red-400"> *</span>
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Регистрација...' : 'Регистрирај се'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-300">
          Веќе имате сметка?{' '}
          <a
            href="/login"
            className="text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors"
          >
            Најави се
          </a>
        </p>
      </form>
    </div>
  );
}

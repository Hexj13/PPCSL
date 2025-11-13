'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Modal } from '@/components/Modal';
import { authApi, UpdateProfileDto, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const convertToBoolean = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return false;
};

const validateEmail = (email: string): boolean => {
  if (!email) {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const initializeFormData = (user: User | null): UpdateProfileDto => {
  if (!user) {
    return {
      email: '',
      firstName: '',
      lastName: '',
      companyName: '',
      emailNotifications: false,
      viber: false,
      whatsapp: false,
      telegram: false,
    };
  }

  return {
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    companyName: user.companyName || '',
    emailNotifications: convertToBoolean(user.emailNotifications),
    viber: convertToBoolean(user.viber),
    whatsapp: convertToBoolean(user.whatsapp),
    telegram: convertToBoolean(user.telegram),
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isInitialized, setAuth, token, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
  const [emailError, setEmailError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    if (hasLoadedRef.current) return;

    const loadProfile = async () => {
      try {
        if (!user) {
          setLoadingProfile(true);
        }
        const response = await authApi.me();
        const profileUser = response.data;

        setAuth(profileUser, useAuthStore.getState().token);

        const formDataToSet = {
          email: profileUser.email || '',
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          companyName: profileUser.companyName || '',
          emailNotifications: convertToBoolean(profileUser.emailNotifications),
          viber: convertToBoolean(profileUser.viber),
          whatsapp: convertToBoolean(profileUser.whatsapp),
          telegram: convertToBoolean(profileUser.telegram),
        };

        setFormData(formDataToSet);
        hasLoadedRef.current = true;
      } catch {
        router.push('/login');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isInitialized, router, setAuth, user, token]);

  useEffect(() => {
    if (!isInitialized) return;
    if (hasLoadedRef.current) return;

    const loadProfile = async () => {
      try {
        if (!user) {
          setLoadingProfile(true);
        }
        const response = await authApi.me();
        const profileUser = response.data;

        setAuth(profileUser, useAuthStore.getState().token);

        const formDataToSet = {
          email: profileUser.email || '',
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          companyName: profileUser.companyName || '',
          emailNotifications: convertToBoolean(profileUser.emailNotifications),
          viber: convertToBoolean(profileUser.viber),
          whatsapp: convertToBoolean(profileUser.whatsapp),
          telegram: convertToBoolean(profileUser.telegram),
        };

        setFormData(formDataToSet);
        hasLoadedRef.current = true;
      } catch {
        router.push('/login');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isInitialized, router, setAuth, user]);

  useEffect(() => {
    if (user && hasLoadedRef.current) {
      const newFormData = initializeFormData(user);
      setFormData((prev) => {
        const hasChanges =
          prev.email !== newFormData.email ||
          prev.firstName !== newFormData.firstName ||
          prev.lastName !== newFormData.lastName ||
          prev.companyName !== newFormData.companyName ||
          prev.emailNotifications !== newFormData.emailNotifications ||
          prev.viber !== newFormData.viber ||
          prev.whatsapp !== newFormData.whatsapp ||
          prev.telegram !== newFormData.telegram;

        return hasChanges ? newFormData : prev;
      });
    }
  }, [user]);

  const handleChange = useCallback((field: keyof UpdateProfileDto, value: string | boolean) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === 'email') {
        const emailValue = value as string;
        if (emailValue && !validateEmail(emailValue)) {
          setEmailError('Невалидна email адреса');
        } else {
          setEmailError('');
        }
      }
      return newData;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!user) return;

      if (emailError) {
        toast.error('Ве молиме, поправете ја email адресата');
        return;
      }

      if (formData.email && !validateEmail(formData.email)) {
        toast.error('Невалидна email адреса');
        return;
      }

      const initialData = initializeFormData(user);
      const hasChanges =
        formData.email !== initialData.email ||
        formData.firstName !== initialData.firstName ||
        formData.lastName !== initialData.lastName ||
        formData.companyName !== initialData.companyName ||
        formData.emailNotifications !== initialData.emailNotifications ||
        formData.viber !== initialData.viber ||
        formData.whatsapp !== initialData.whatsapp ||
        formData.telegram !== initialData.telegram;

      if (!hasChanges) {
        toast.success('Нема промени за зачувување');
        return;
      }

      setLoading(true);

      try {
        const response = await authApi.updateProfile(formData);
        setAuth(response.data, useAuthStore.getState().token);
        toast.success('Профилот е успешно ажуриран');
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [formData, user, setAuth, emailError]
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    setDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success('Аккаунтот е успешно избришан');
      logout();
      router.push('/');
    } catch {
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }, [user, router, logout]);

  if (!isInitialized && !user) {
    return null;
  }

  if (loadingProfile || (!user && isInitialized)) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Профил
      </h1>
      <form onSubmit={handleSubmit} className="card p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
            Контакт информација
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Телефон</label>
            <div className="relative">
              <input
                type="tel"
                value={user.phone || ''}
                disabled
                className="input-field bg-bg-light/50 cursor-not-allowed opacity-70 pr-12"
              />
              <Link
                href="/profile/change-phone"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-300 transition-colors duration-200 p-1"
                title="Промени телефон"
              >
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.viber === true}
                    onChange={(e) => handleChange('viber', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange('viber', !formData.viber);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.viber === true
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                    }`}
                  >
                    {formData.viber === true && (
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
                  onClick={() => handleChange('viber', !formData.viber)}
                  className="text-sm text-white cursor-pointer"
                >
                  Viber
                </span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.whatsapp === true}
                    onChange={(e) => handleChange('whatsapp', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange('whatsapp', !formData.whatsapp);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.whatsapp === true
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                    }`}
                  >
                    {formData.whatsapp === true && (
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
                  onClick={() => handleChange('whatsapp', !formData.whatsapp)}
                  className="text-sm text-white cursor-pointer"
                >
                  WhatsApp
                </span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.telegram === true}
                    onChange={(e) => handleChange('telegram', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange('telegram', !formData.telegram);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.telegram === true
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                    }`}
                  >
                    {formData.telegram === true && (
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
                  onClick={() => handleChange('telegram', !formData.telegram)}
                  className="text-sm text-white cursor-pointer"
                >
                  Telegram
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
            Email и известувања
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!!user.email}
              className={`input-field ${emailError ? 'border-red-500' : ''} ${
                user.email ? 'bg-bg-light/50 cursor-not-allowed opacity-70' : ''
              }`}
              placeholder="Внесете email адреса"
            />
            {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
            {user.email && (
              <p className="mt-1 text-xs text-gray-400">Email адресата не може да се промени</p>
            )}
            <div className="mt-4">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={
                      formData.emailNotifications === true && (!!formData.email || !!user.email)
                    }
                    onChange={(e) => {
                      if (!formData.email && !user.email) return;
                      if (formData.email && !validateEmail(formData.email)) return;
                      handleChange('emailNotifications', e.target.checked);
                    }}
                    disabled={
                      (!formData.email && !user.email) ||
                      (!!formData.email && !validateEmail(formData.email))
                    }
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      if (!formData.email && !user.email) return;
                      if (formData.email && !validateEmail(formData.email)) return;
                      handleChange('emailNotifications', !formData.emailNotifications);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      (!formData.email && !user.email) ||
                      (formData.email && !validateEmail(formData.email))
                        ? 'border-primary-500/30 bg-bg-darker opacity-50 cursor-not-allowed'
                        : formData.emailNotifications === true
                          ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 cursor-pointer'
                          : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 cursor-pointer'
                    }`}
                  >
                    {formData.emailNotifications === true && (formData.email || user.email) && (
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
                  onClick={() => {
                    if (!formData.email && !user.email) return;
                    if (formData.email && !validateEmail(formData.email)) return;
                    handleChange('emailNotifications', !formData.emailNotifications);
                  }}
                  className={`text-sm ${
                    (!formData.email && !user.email) ||
                    (formData.email && !validateEmail(formData.email))
                      ? 'text-gray-500 cursor-not-allowed'
                      : 'text-white cursor-pointer'
                  }`}
                >
                  Примај рассилка на е-пошта
                </span>
              </div>
              {!formData.email && !user.email && (
                <p className="mt-2 text-xs text-gray-400">
                  За да примате известувања, внесете email адреса
                </p>
              )}
            </div>
          </div>
        </div>

        {user.type === 'Business' && (
          <div className="border-t border-primary-500/20 pt-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
              Информација за компанија
            </h2>
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Име на компанија
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.companyName || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    handleChange('companyName', value);
                  }
                }}
                className="input-field"
                placeholder="Внесете го името на компанијата"
              />
            </div>
          </div>
        )}

        {user.type === 'Individual' && (
          <div className="border-t border-primary-500/20 pt-6 mb-6">
            <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">Лични податоци</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Име</label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.firstName || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
                    if (value.length <= 50) {
                      handleChange('firstName', value);
                    }
                  }}
                  className="input-field"
                  placeholder="Внесете го вашето име"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Презиме</label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.lastName || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
                    if (value.length <= 50) {
                      handleChange('lastName', value);
                    }
                  }}
                  className="input-field"
                  placeholder="Внесете го вашето презиме"
                />
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Зачувување...' : 'Зачувај промени'}
          </button>
        </div>

        <div className="border-t border-red-500/30 pt-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-red-400">Опасна зона</h2>
          <p className="text-sm text-gray-400 mb-4">
            Неповратни акции кои влијаат на вашиот аккаунт
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full btn-secondary text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
          >
            Избриши аккаунт
          </button>
        </div>
      </form>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Избриши аккаунт"
        size="medium"
      >
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-lg text-red-400 font-semibold mb-2">⚠️ Внимание!</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              Оваа акција е неповратна. Со бришење на вашиот аккаунт:
            </p>
            <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1 ml-2">
              <li>Сите ваши лични податоци (име, е-пошта, телефон) ќе бидат трајно избришани</li>
              <li>Сите ваши огласи ќе бидат затворени</li>
              <li>На вашите огласи повеќе нема да се прикажуваат вашите лични податоци</li>
              <li>Огласите ќе останат на платформата, но без контакт информации</li>
            </ul>
          </div>

          <p className="text-gray-300 text-sm">
            Дали сте сигурни дека сакате да го избришете вашиот аккаунт?
          </p>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 btn-secondary"
              disabled={deleting}
            >
              Откажи
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-4 py-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Бришење...' : 'Избриши аккаунт'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

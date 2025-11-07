'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { authApi, UpdateProfileDto, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const convertToBoolean = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return false;
};

const initializeFormData = (user: User | null): UpdateProfileDto => {
  if (!user) {
    return {
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
  const { user, isInitialized, setAuth, token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
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
      } catch (error) {
        console.error('Error loading profile:', error);
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
      } catch (error) {
        console.error('Error loading profile:', error);
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
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!user) return;

      const initialData = initializeFormData(user);
      const hasChanges =
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
    [formData, user, setAuth],
  );

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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Профил
      </h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="space-y-6">
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
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">Email</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="input-field bg-bg-light/50 cursor-not-allowed opacity-70"
            />
            <p className="mt-1 text-xs text-gray-400">Email адресата не може да се промени</p>
          </div>

          {user.type === 'Business' && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                Име на компанија
              </label>
              <input
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="input-field"
                placeholder="Внесете го името на компанијата"
              />
            </div>
          )}

          {user.type === 'Individual' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Име</label>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="input-field"
                  placeholder="Внесете го вашето име"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Презиме</label>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="input-field"
                  placeholder="Внесете го вашето презиме"
                />
              </div>
            </>
          )}

          <div className="border-t border-primary-500/20 pt-6">
            <h2 className="text-lg font-semibold mb-4 text-primary-400">Контакт опции</h2>
            <div className="space-y-3">
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
                  className="text-white cursor-pointer"
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
                  className="text-white cursor-pointer"
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
                  className="text-white cursor-pointer"
                >
                  Telegram
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-primary-500/20 pt-6">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.emailNotifications === true && !!user.email}
                  onChange={(e) => {
                    if (!user.email) return;
                    handleChange('emailNotifications', e.target.checked);
                  }}
                  disabled={!user.email}
                  className="sr-only"
                />
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    if (!user.email) return;
                    handleChange('emailNotifications', !formData.emailNotifications);
                  }}
                  className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    !user.email
                      ? 'border-primary-500/30 bg-bg-darker opacity-50 cursor-not-allowed'
                      : formData.emailNotifications === true
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500 cursor-pointer'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500 cursor-pointer'
                  }`}
                >
                  {formData.emailNotifications === true && user.email && (
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
                  if (!user.email) return;
                  handleChange('emailNotifications', !formData.emailNotifications);
                }}
                className={`text-sm ${
                  !user.email ? 'text-gray-500 cursor-not-allowed' : 'text-white cursor-pointer'
                }`}
              >
                Email известувања
              </span>
            </div>
            {!user.email && (
              <p className="mt-2 text-xs text-gray-400">
                За да примате известувања, внесете email адреса
              </p>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? 'Зачувување...' : 'Зачувај промени'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


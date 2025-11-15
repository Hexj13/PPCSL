'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { authApi, favoritesApi, listingsApi, savedFiltersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.push('/');
    }
  }, [user, isInitialized, router]);

  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  if (isInitialized && user) {
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: { login?: string; password?: string } = {};

    if (!formData.login.trim()) {
      newErrors.login = 'Email или телефон е задолжителен';
    } else if (!isValidEmail(formData.login) && !isValidPhone(formData.login)) {
      newErrors.login = 'Внесете валиден email или телефон (формат: +код држава број)';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Лозинката е задолжителна';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(formData);
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);

      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        if (pendingFavorites.length > 0) {
          const validFavorites: string[] = [];
          for (const listingId of pendingFavorites) {
            try {
              const listingRes = await listingsApi.getOne(listingId);
              const listing = listingRes.data;
              if (listing.user && listing.user.id !== res.data.user.id) {
                validFavorites.push(listingId);
              }
            } catch {
              // Skip if listing not found or error occurred
            }
          }
          if (validFavorites.length > 0) {
            const addPromises = validFavorites.map((listingId: string) =>
              favoritesApi.add(listingId).catch(() => {})
            );
            await Promise.all(addPromises);
          }
          localStorage.removeItem('pendingFavorites');
        }

        const pendingComparisons = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
        console.log('[LOGIN] pendingComparisons:', pendingComparisons);
        if (pendingComparisons.length > 0) {
          const { useComparisonStore } = await import('@/lib/store');
          const comparisonStore = useComparisonStore.getState();
          console.log('[LOGIN] Initial store comparisons:', comparisonStore.comparisons);

          for (const listingId of pendingComparisons) {
            try {
              const listingRes = await listingsApi.getOne(listingId);
              const listing = listingRes.data;
              console.log(
                '[LOGIN] Processing listing:',
                listingId,
                'owner:',
                listing.user?.id,
                'current user:',
                res.data.user.id
              );
              const added = comparisonStore.add(listingId);
              console.log('[LOGIN] Added to comparison:', listingId, 'result:', added);
            } catch (error) {
              console.error('[LOGIN] Error processing listing:', listingId, error);
            }
          }

          console.log('[LOGIN] Final store comparisons:', comparisonStore.comparisons);
          if (typeof window !== 'undefined' && comparisonStore.comparisons.length > 0) {
            const storageData = {
              state: { comparisons: comparisonStore.comparisons },
              version: 0,
            };
            console.log('[LOGIN] Saving to localStorage:', storageData);
            localStorage.setItem('comparison-storage', JSON.stringify(storageData));
            const verify = localStorage.getItem('comparison-storage');
            console.log('[LOGIN] Verification read:', verify);
            if (!verify || verify !== JSON.stringify(storageData)) {
              console.warn('[LOGIN] Verification failed, saving again');
              localStorage.setItem('comparison-storage', JSON.stringify(storageData));
            }
            await new Promise((resolve) => {
              requestAnimationFrame(() => {
                localStorage.setItem('comparison-storage', JSON.stringify(storageData));
                requestAnimationFrame(() => {
                  localStorage.setItem('comparison-storage', JSON.stringify(storageData));
                  const finalCheck = localStorage.getItem('comparison-storage');
                  console.log('[LOGIN] Final localStorage check:', finalCheck);
                  setTimeout(resolve, 100);
                });
              });
            });
          } else {
            console.log('[LOGIN] No comparisons to save or window undefined');
          }

          localStorage.removeItem('pendingComparisons');
          console.log('[LOGIN] Removed pendingComparisons from localStorage');
        }

        const pendingSavedFilter = localStorage.getItem('pendingSavedFilter');
        if (pendingSavedFilter) {
          try {
            const filters = JSON.parse(pendingSavedFilter);
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const filterName = `Филтер ${day}.${month}.${year} ${hours}:${minutes}`;
            await savedFiltersApi.create(filterName, filters);
            localStorage.removeItem('pendingSavedFilter');
            localStorage.removeItem('returnUrl');
            toast.success('Филтерот е успешно зачуван');
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = '/favorites?tab=filters';
            }
            return;
          } catch (error: unknown) {
            const errorMessage =
              (error && typeof error === 'object' && 'response' in error
                ? (error.response as { data?: { message?: string } })?.data?.message
                : null) || 'Грешка при зачувување на филтерот';
            toast.error(errorMessage);
            localStorage.removeItem('pendingSavedFilter');
            const isLimitError =
              errorMessage ===
                'Можете да зачувате максимум 20 филтри. Ве молиме избришете некој од постоечките филтри.' ||
              (errorMessage.startsWith('Можете да зачувате максимум') &&
                errorMessage.includes('филтри. Ве молиме избришете некој од постоечките филтри.'));
            if (isLimitError) {
              localStorage.removeItem('returnUrl');
              if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/favorites?tab=filters';
              }
              return;
            } else {
              const returnUrl = localStorage.getItem('returnUrl');
              if (returnUrl) {
                localStorage.removeItem('returnUrl');
                if (typeof window !== 'undefined' && window.location) {
                  window.location.href = returnUrl;
                }
                return;
              } else {
                if (typeof window !== 'undefined' && window.location) {
                  window.location.href = '/';
                }
                return;
              }
            }
          }
        } else {
          const returnUrl = localStorage.getItem('returnUrl');
          console.log('[LOGIN] No pendingSavedFilter, returnUrl:', returnUrl);
          const finalStorageCheck = localStorage.getItem('comparison-storage');
          console.log(
            '[LOGIN] Before redirect, localStorage comparison-storage:',
            finalStorageCheck
          );
          if (returnUrl) {
            localStorage.removeItem('returnUrl');
            console.log('[LOGIN] Redirecting to returnUrl:', returnUrl);
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = returnUrl;
            }
            return;
          } else {
            console.log('[LOGIN] Redirecting to home');
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = '/';
            }
            return;
          }
        }
      } else {
        const finalStorageCheck = localStorage.getItem('comparison-storage');
        console.log(
          '[LOGIN] No pendingComparisons, before redirect, localStorage comparison-storage:',
          finalStorageCheck
        );
        if (typeof window !== 'undefined') {
          const win = window as unknown as Window;
          if (win.location) {
            console.log('[LOGIN] Redirecting to home (no pendingComparisons)');
            win.location.href = '/';
          }
        }
        return;
      }
    } catch {
      // Error is already handled by API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Најава
      </h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            Email или телефон
          </label>
          <input
            type="text"
            value={formData.login}
            onChange={(e) => {
              setFormData({ ...formData, login: e.target.value });
              if (errors.login) {
                setErrors({ ...errors, login: undefined });
              }
            }}
            className={`input-field ${errors.login ? 'border-red-500' : ''}`}
            placeholder="Email или телефон"
            autoComplete="username"
          />
          {errors.login && <p className="mt-1 text-sm text-red-400">{errors.login}</p>}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-primary-400">Лозинка</label>
            <a
              href="/reset-password"
              className="text-sm text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors"
            >
              Заборавена лозинка?
            </a>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
              placeholder="Внесете ја вашата лозинка"
              autoComplete="current-password"
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
          {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Најава...' : 'Најави се'}
        </button>

        <p className="mt-6 text-center text-sm text-hint">
          Немате сметка?{' '}
          <a
            href="/register"
            className="text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors"
          >
            Регистрирај се
          </a>
        </p>
      </form>
    </div>
  );
}

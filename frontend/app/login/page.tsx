'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, favoritesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

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
      setAuth(res.data.user, res.data.access_token);
      
      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        if (pendingFavorites.length > 0) {
          const addPromises = pendingFavorites.map((listingId: string) =>
            favoritesApi.add(listingId).catch(() => {})
          );
          await Promise.all(addPromises);
          localStorage.removeItem('pendingFavorites');
        }
        
        const returnUrl = localStorage.getItem('returnUrl');
        if (returnUrl) {
          localStorage.removeItem('returnUrl');
          router.push(returnUrl);
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
      
      toast.success('Успешна најава');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Погрешни најавни податоци');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">Најава</h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-400">Email или телефон</label>
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
            placeholder="example@email.com или +38970123456"
            autoComplete="username"
          />
          {errors.login && (
            <p className="mt-1 text-sm text-red-400">{errors.login}</p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-primary-400">Лозинка</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => {
              setFormData({ ...formData, password: e.target.value });
              if (errors.password) {
                setErrors({ ...errors, password: undefined });
              }
            }}
            className={`input-field ${errors.password ? 'border-red-500' : ''}`}
            placeholder="Внесете ја вашата лозинка"
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-400">{errors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Најава...' : 'Најави се'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-300">
          Немате сметка?{' '}
          <a href="/register" className="text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors">
            Регистрирај се
          </a>
        </p>
      </form>
    </div>
  );
}


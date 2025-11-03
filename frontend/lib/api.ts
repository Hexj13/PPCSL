import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error: AxiosError): string => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Истече време за поврзување. Обидете се повторно.';
    }
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return 'Грешка во мрежата. Проверете ја вашата интернет врска.';
    }
    return 'Грешка при поврзување со серверот. Обидете се повторно.';
  }

  const status = error.response.status;
  const data = error.response.data as any;
  let message = '';

  if (data?.message) {
    if (Array.isArray(data.message)) {
      message = data.message.join(', ');
    } else {
      message = data.message;
    }
  }

  switch (status) {
    case 400:
      return message || 'Невалидна барање. Проверете ги внесените податоци.';
    case 401:
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
      return message || 'Неавторизиран пристап. Најавете се повторно.';
    case 403:
      return message || 'Немате дозвола за оваа акција.';
    case 404:
      return message || 'Ресурсот не е пронајден.';
    case 409:
      return message || 'Конфликт. Ресурсот веќе постои.';
    case 422:
      return message || 'Грешка во валидација. Проверете ги внесените податоци.';
    case 429:
      return 'Премногу барања. Обидете се подоцна.';
    case 500:
      return message || 'Грешка на серверот. Обидете се подоцна.';
    case 502:
    case 503:
    case 504:
      return 'Серверот е привремено недостапен. Обидете се подоцна.';
    default:
      return message || `Грешка ${status}. Обидете се повторно.`;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.config && !error.config.headers['X-Skip-Error-Handling']) {
      const errorMessage = getErrorMessage(error);
      if (typeof window !== 'undefined') {
        const { toast } = await import('react-hot-toast');
        toast.error(errorMessage);
      }
    }
    return Promise.reject(error);
  }
);

export interface Listing {
  id: string;
  title: string;
  price: number;
  currency?: 'MKD' | 'EUR';
  city: string;
  status: 'Active' | 'Paused' | 'Closed';
  description?: string;
  images?: string[];
  urgent?: boolean;
  vin?: string;
  vehicle?: Vehicle;
  user?: User;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
  order: number;
}

export interface VehicleModel {
  id: string;
  name: string;
  brand_id: string;
  order: number;
  brand?: Brand;
}

export interface Vehicle {
  id: string;
  brand_id: string;
  model_id: string;
  brand?: Brand;
  model?: VehicleModel;
  year: number;
  engine_displ_l?: number;
  mileage_km?: number;
  fuel?: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'LPG';
  transmission?: 'Manual' | 'Automatic' | 'CVT';
  body_type: 'Sedan' | 'Hatchback' | 'Wagon' | 'SUV' | 'Coupe' | 'Convertible' | 'Van' | 'Pickup' | 'Minivan';
  color?: string;
  doors?: number;
}

export interface User {
  id: string;
  email: string;
  type: 'Individual' | 'Business' | 'Admin';
  phone?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  active?: boolean;
  listings?: Listing[];
  created_at?: string;
  viber?: boolean;
  whatsapp?: boolean;
  telegram?: boolean;
}

export interface SearchParams {
  brand_id?: string;
  model_id?: string;
  year_gte?: number;
  year_lte?: number;
  price_gte?: number;
  price_lte?: number;
  mileage_gte?: number;
  mileage_lte?: number;
  city?: string;
  fuel?: string;
  transmission?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export const listingsApi = {
  getAll: (params?: SearchParams) =>
    api.get<{ data: Listing[]; meta: any }>('/api/listings', { params }),
  getOne: (id: string) => api.get<Listing>(`/api/listings/${id}`),
  getUserActiveListings: (userId: string) => api.get<Listing[]>(`/api/listings/user/${userId}/active`),
  getByVin: (vin: string, excludeId?: string) =>
    api.get<Listing[]>(`/api/listings/vin/${vin}`, { params: excludeId ? { excludeId } : {} }),
  create: (data: any) => api.post<Listing>('/api/listings', data),
  update: (id: string, data: any) => api.patch<Listing>(`/api/listings/${id}`, data),
  publish: (id: string) => api.post(`/api/listings/${id}/publish`),
  pause: (id: string) => api.post(`/api/listings/${id}/pause`),
  close: (id: string) => api.post(`/api/listings/${id}/close`),
  getMy: () => api.get<Listing[]>('/api/listings/my'),
  refreshDates: () => api.post<{ updated: number }>('/api/listings/refresh-dates'),
};

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ url: string; path: string }>('/api/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const authApi = {
  register: (data: any) => api.post('/api/auth/register', data),
  login: (data: any) => api.post<{ access_token: string; user: User }>('/api/auth/login', data),
  me: () => api.get<User>('/api/auth/me'),
};

export const favoritesApi = {
  getAll: () => api.get('/api/favorites'),
  add: (listingId: string) => api.post(`/api/favorites/${listingId}`),
  remove: (listingId: string) => api.delete(`/api/favorites/${listingId}`),
  check: (listingId: string) => api.get<{ isFavorite: boolean }>(`/api/favorites/check/${listingId}`),
};

export const brandsApi = {
  getAll: () => api.get<Brand[]>('/api/brands'),
  getModels: (brandId: string) => api.get<VehicleModel[]>(`/api/brands/${brandId}/models`),
  getModelsByName: (brandName: string) => api.get<VehicleModel[]>(`/api/brands/name/${brandName}/models`),
  seed: () => api.post('/api/brands/seed'),
};

export interface City {
  name: string;
  nameEn: string;
}

export const citiesApi = {
  getAll: () => api.get<City[]>('/api/cities'),
};

export const adminApi = {
  getAllListings: () => api.get<Listing[]>('/api/admin/listings'),
  updateListingStatus: (id: string, status: 'Active' | 'Paused' | 'Closed') =>
    api.patch(`/api/admin/listings/${id}/status`, { status }),
  getStats: () => api.get<{ users: any; listings: any }>('/api/admin/stats'),
  getAllUsers: () => api.get<User[]>('/api/admin/users'),
  getUserListings: (userId: string) => api.get<Listing[]>(`/api/admin/users/${userId}/listings`),
  toggleUserStatus: (userId: string) => api.patch(`/api/admin/users/${userId}/toggle-status`),
};


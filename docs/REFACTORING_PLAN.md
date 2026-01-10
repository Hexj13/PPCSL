# План рефакторинга и оптимизации

Анализ страниц: Создание объявления, Мои объявления, Админка, Избранное, Страница сравнения.

---

## Чек-лист

### P0 (Критично — высокий приоритет)

- [ ] [P0-1] Вынести логику проверки авторизации в кастомный хук `useRequireAuth`
- [ ] [P0-2] Создать кастомный хук `usePaginatedData` для работы с пагинированными данными
- [ ] [P0-3] Вынести дублирующиеся фильтры статусов в компонент `StatusFilterButtons`
- [ ] [P0-4] Разбить `AdminPage` на отдельные файлы для каждой вкладки
- [ ] [P0-5] Создать компонент `Pagination` для переиспользования

### P1 (Важно — средний приоритет)

- [ ] [P1-1] Вынести checkbox в отдельный компонент `Checkbox` в ui/
- [ ] [P1-2] Создать утилиту для нормализации ответов API `normalizeListingResponse`
- [ ] [P1-3] Заменить inline стили `rgb(243, 243, 243)` на CSS-переменную
- [ ] [P1-4] Вынести SVG-иконки в отдельные компоненты или использовать иконочную библиотеку
- [ ] [P1-5] Создать компонент `EmptyState` для пустых состояний
- [ ] [P1-6] Унифицировать логику форматирования статусов

### P2 (Желательно — низкий приоритет)

- [ ] [P2-1] Вынести секции ListingForm в отдельные компоненты
- [ ] [P2-2] Создать хук `useDebounceSearch` для поиска с debounce
- [ ] [P2-3] Создать компонент `CopyButton` для копирования в буфер
- [ ] [P2-4] Создать компонент `LoadingSpinner` для индикаторов загрузки
- [ ] [P2-5] Оптимизировать ComparePage — вынести строки таблицы в конфиг

---

## P0-1: Хук useRequireAuth

**Проблема:**  
Одинаковая логика проверки авторизации дублируется на 5+ страницах:
- `MyListingsPage`
- `FavoritesPage`
- `ComparePage`
- `AdminPage`
- `NewListingPage`
- `EditListingPage`

**Текущий код (дублируется):**
```tsx
const { user, isInitialized } = useAuthStore();

useEffect(() => {
  if (!isInitialized && !user) {
    return;
  }
  if (isInitialized && !user) {
    router.push('/login');
    return;
  }
}, [user, isInitialized, router]);

if (!isInitialized || !user) {
  return null;
}
```

**Решение:**  
Создать файл `hooks/useRequireAuth.ts`:

```tsx
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRole?: 'Admin' | 'Business' | 'Individual';
}

export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const { redirectTo = '/login', requiredRole } = options;
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  
  useEffect(() => {
    if (isInitialized && !user) {
      router.push(redirectTo);
      return;
    }
    
    if (requiredRole && user && user.type !== requiredRole) {
      router.push('/');
    }
  }, [user, isInitialized, router, redirectTo, requiredRole]);
  
  const isLoading = !isInitialized;
  const isAuthorized = isInitialized && !!user && 
    (!requiredRole || user.type === requiredRole);
  
  return { user, isLoading, isAuthorized };
}
```

**Использование:**
```tsx
export default function MyListingsPage() {
  const { user, isLoading, isAuthorized } = useRequireAuth();
  
  if (isLoading || !isAuthorized) {
    return null;
  }
  
  // ... остальной код
}
```

**Затрагиваемые файлы:**
- `hooks/useRequireAuth.ts` (создать)
- `app/my-listings/page.tsx`
- `app/favorites/page.tsx`
- `app/compare/page.tsx`
- `app/admin/page.tsx`
- `app/listings/new/page.tsx`
- `app/listings/[id]/edit/page.tsx`

**Выигрыш:**  
Убирает ~15-20 строк дублирующегося кода с каждой страницы, централизует логику авторизации.

---

## P0-2: Хук usePaginatedData

**Проблема:**  
Логика работы с пагинированными данными дублируется в:
- `MyListingsPage` — загрузка объявлений
- `AdminPage/ListingsTab` — загрузка объявлений
- `AdminPage/UsersTab` — загрузка пользователей
- `AdminPage/PromotionsTab` — загрузка промо

Повторяющиеся паттерны:
- `loadingRef`, `hasInitializedRef`, `hasDataRef`
- `showLoadingTimeoutRef` с setTimeout 200-300ms
- Обработка страницы и мета-данных пагинации
- Сброс страницы при изменении фильтров

**Решение:**  
Создать файл `hooks/usePaginatedData.ts`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsePaginatedDataOptions<T, F> {
  fetchFn: (page: number, limit: number, filters: F) => Promise<{
    data: T[];
    meta: PaginationMeta;
  }>;
  limit?: number;
  initialFilters: F;
  showLoadingDelay?: number;
}

interface UsePaginatedDataReturn<T, F> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  meta: PaginationMeta | null;
  page: number;
  filters: F;
  setFilters: (filters: F | ((prev: F) => F)) => void;
  setPage: (page: number) => void;
  loadMore: () => void;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function usePaginatedData<T, F>(
  options: UsePaginatedDataOptions<T, F>
): UsePaginatedDataReturn<T, F> {
  const { fetchFn, limit = 20, initialFilters, showLoadingDelay = 200 } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<F>(initialFilters);
  
  const loadingRef = useRef(false);
  const hasDataRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const load = useCallback(async (targetPage: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    if (append) {
      setLoadingMore(true);
    } else if (!hasDataRef.current) {
      setLoading(true);
    } else {
      showLoadingTimeoutRef.current = setTimeout(() => {
        setLoading(true);
      }, showLoadingDelay);
    }
    
    try {
      const result = await fetchFn(targetPage, limit, filters);
      
      if (append) {
        setData(prev => [...prev, ...result.data]);
      } else {
        setData(result.data);
      }
      setMeta(result.meta);
      setPage(targetPage);
      hasDataRef.current = true;
    } finally {
      if (showLoadingTimeoutRef.current) {
        clearTimeout(showLoadingTimeoutRef.current);
        showLoadingTimeoutRef.current = null;
      }
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [fetchFn, limit, filters, showLoadingDelay]);
  
  useEffect(() => {
    load(1);
  }, [filters]);
  
  const loadMore = useCallback(() => {
    if (meta && page < meta.totalPages && !loadingMore) {
      load(page + 1, true);
    }
  }, [meta, page, loadingMore, load]);
  
  const reload = useCallback(() => {
    hasDataRef.current = false;
    load(1);
  }, [load]);
  
  return {
    data,
    loading,
    loadingMore,
    meta,
    page,
    filters,
    setFilters,
    setPage: (p) => load(p),
    loadMore,
    reload,
    setData,
  };
}
```

**Затрагиваемые файлы:**
- `hooks/usePaginatedData.ts` (создать)
- `app/my-listings/page.tsx`
- `app/admin/page.tsx` (все вкладки)

**Выигрыш:**  
Убирает ~50-80 строк дублирующегося кода с каждой страницы, стандартизирует работу с пагинацией.

---

## P0-3: Компонент StatusFilterButtons

**Проблема:**  
Идентичные кнопки фильтров по статусу дублируются в:
- `MyListingsPage` (строки 641-700)
- `AdminPage/ListingsTab` (строки 401-452)

**Текущий код (дублируется):**
```tsx
{(['All', 'Active', 'Paused', 'Closed'] as const).map((status) => (
  <button
    key={status}
    onClick={() => setStatusFilter(status)}
    className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg...`}
  >
    {status === 'All' ? t('myListings.all') : ...}
    {status !== 'All' && (
      <span className="ml-2 px-2 py-0.5 rounded-full...">{statusCounts[status]}</span>
    )}
  </button>
))}
```

**Решение:**  
Создать файл `components/StatusFilterButtons.tsx`:

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';

type ListingStatus = 'All' | 'Active' | 'Paused' | 'Closed';

interface StatusFilterButtonsProps {
  currentFilter: ListingStatus;
  onFilterChange: (status: ListingStatus) => void;
  counts: {
    Active: number;
    Paused: number;
    Closed: number;
  };
  showPromoted?: boolean;
  promotedCount?: number;
  promotedActive?: boolean;
  onPromotedClick?: () => void;
  translationPrefix?: 'myListings' | 'admin.listingsTab';
}

export function StatusFilterButtons({
  currentFilter,
  onFilterChange,
  counts,
  showPromoted = false,
  promotedCount = 0,
  promotedActive = false,
  onPromotedClick,
  translationPrefix = 'myListings',
}: StatusFilterButtonsProps) {
  const { t } = useTranslation();
  
  const statuses: ListingStatus[] = ['All', 'Active', 'Paused', 'Closed'];
  
  const getLabel = (status: ListingStatus) => {
    const key = `${translationPrefix}.${status.toLowerCase()}`;
    return t(key);
  };
  
  return (
    <div className="flex flex-wrap gap-2 md:gap-3">
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => onFilterChange(status)}
          className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-medium text-xs md:text-sm lg:text-base transition-colors bg-bg-light hover:bg-bg-dark border ${
            currentFilter === status
              ? 'border-primary-500 text-white'
              : 'border-primary-500/20'
          }`}
          style={currentFilter !== status ? { color: 'rgb(243, 243, 243)' } : undefined}
        >
          {getLabel(status)}
          {status !== 'All' && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
              {counts[status]}
            </span>
          )}
        </button>
      ))}
      
      {showPromoted && onPromotedClick && (
        <button
          onClick={onPromotedClick}
          className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg font-medium text-xs md:text-sm lg:text-base transition-colors bg-bg-light hover:bg-bg-dark border ${
            promotedActive ? 'border-primary-500 text-white' : 'border-primary-500/20'
          }`}
          style={!promotedActive ? { color: 'rgb(243, 243, 243)' } : undefined}
        >
          {t('myListings.promoted')}
          <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
            {promotedCount}
          </span>
        </button>
      )}
    </div>
  );
}
```

**Затрагиваемые файлы:**
- `components/StatusFilterButtons.tsx` (создать)
- `app/my-listings/page.tsx`
- `app/admin/page.tsx`

**Выигрыш:**  
Убирает ~60 строк дублирующегося кода, упрощает поддержку фильтров.

---

## P0-4: Разбить AdminPage на отдельные файлы

**Проблема:**  
Файл `admin/page.tsx` содержит 1272 строки с тремя вкладками в одном файле. Это усложняет навигацию и поддержку.

**Решение:**  
Разбить на структуру:

```
app/admin/
├── page.tsx                    # Главная страница с табами (~130 строк)
├── components/
│   ├── ListingsTab.tsx         # Вкладка объявлений (~200 строк)
│   ├── UsersTab.tsx            # Вкладка пользователей (~270 строк)
│   └── PromotionsTab.tsx       # Вкладка промо (~210 строк)
└── layout.tsx                  # Существующий layout
```

**Главный файл `page.tsx`:**
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { ListingsTab } from './components/ListingsTab';
import { UsersTab } from './components/UsersTab';
import { PromotionsTab } from './components/PromotionsTab';

type AdminTab = 'listings' | 'users' | 'promotions';

export default function AdminPage() {
  const { t } = useTranslation();
  const { isLoading, isAuthorized } = useRequireAuth({ requiredRole: 'Admin' });
  
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('adminActiveTab') as AdminTab | null;
      if (savedTab && ['listings', 'users', 'promotions'].includes(savedTab)) {
        return savedTab;
      }
    }
    return 'listings';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab]);

  if (isLoading || !isAuthorized) {
    return null;
  }

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {t('admin.title')}
      </h1>

      <div className="mb-4 md:mb-6">
        <div className="flex gap-2 md:gap-3 border-b border-primary-500/20 overflow-x-auto">
          {(['listings', 'users', 'promotions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-2 md:py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-500'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {t(`admin.${tab}TabLabel`)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'listings' && <ListingsTab />}
      {activeTab === 'users' && <UsersTab onViewUserListings={(userId) => {
        localStorage.setItem('adminListingsSearchQuery', userId);
        setActiveTab('listings');
      }} />}
      {activeTab === 'promotions' && <PromotionsTab />}
    </div>
  );
}
```

**Затрагиваемые файлы:**
- `app/admin/page.tsx` (рефакторинг)
- `app/admin/components/ListingsTab.tsx` (создать)
- `app/admin/components/UsersTab.tsx` (создать)
- `app/admin/components/PromotionsTab.tsx` (создать)

**Выигрыш:**  
Разбивает 1272-строчный файл на 4 файла по ~130-270 строк каждый. Улучшает навигацию и поддержку.

---

## P0-5: Компонент Pagination

**Проблема:**  
Пагинация дублируется в AdminPage:
- `ListingsTab` (строки 484-504)
- `UsersTab` (строки 1244-1265)
- `PromotionsTab` (строки 808-828)

**Решение:**  
Создать файл `ui/Pagination.tsx`:

```tsx
'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center items-center gap-4 mt-6 md:mt-8">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1 || disabled}
        className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
      >
        {t('common.previous')}
      </button>
      <span className="text-sm md:text-base" style={{ color: 'rgb(243, 243, 243)' }}>
        {t('common.pageOf', { page: currentPage, totalPages })}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || disabled}
        className="px-4 py-2 rounded-lg bg-bg-light border border-primary-500/30 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-dark transition-colors"
      >
        {t('common.next')}
      </button>
    </div>
  );
}
```

**Затрагиваемые файлы:**
- `ui/Pagination.tsx` (создать)
- `ui/index.ts` (добавить экспорт)
- `app/admin/page.tsx` (все вкладки)

**Выигрыш:**  
Убирает ~60 строк дублирующегося кода, унифицирует пагинацию.

---

## P1-1: Компонент Checkbox

**Проблема:**  
В `ListingForm.tsx` чекбоксы с кастомным стилем дублируются ~15 раз (строки 976-1043, 1048-1120, 1134-1189, и др.).

**Текущий код (повторяется):**
```tsx
<div className="flex items-center gap-3 group">
  <div className="relative">
    <input type="checkbox" checked={...} onChange={...} className="sr-only" />
    <div
      onClick={(e) => {...}}
      className={`w-5 h-5 rounded border-2 transition-all...`}
    >
      {isChecked && <svg>...</svg>}
    </div>
  </div>
  <span className={`text-sm transition-colors...`}>
    {label}
  </span>
</div>
```

**Решение:**  
Создать файл `ui/Checkbox.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}

export function Checkbox({ checked, onChange, label, disabled = false }: CheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center gap-3 group ${disabled ? 'opacity-50' : ''}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          onClick={handleClick}
          className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${
            checked
              ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
              : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
          }`}
        >
          {checked && (
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
      {label && (
        <span
          className={`text-sm transition-colors duration-200 ${
            checked ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
```

**Затрагиваемые файлы:**
- `ui/Checkbox.tsx` (создать)
- `ui/index.ts` (добавить экспорт)
- `components/ListingForm.tsx`

**Выигрыш:**  
Убирает ~300 строк дублирующегося кода из ListingForm.

---

## P1-2: Утилита normalizeListingResponse

**Проблема:**  
Одинаковая логика нормализации ответов API в:
- `MyListingsPage` (строки 86-99)
- `FavoritesPage` (строки 52-54)

**Текущий код (дублируется):**
```tsx
let newListings: Listing[] = [];
let responseMeta: PaginationMeta | null = null;

if (Array.isArray(responseData)) {
  newListings = responseData.slice((page - 1) * limit, page * limit);
  const total = responseData.length;
  const totalPages = Math.ceil(total / limit);
  responseMeta = { total, page, limit, totalPages };
} else if (responseData && typeof responseData === 'object') {
  newListings = responseData.data || [];
  responseMeta = responseData.meta || null;
}
```

**Решение:**  
Добавить в `lib/utils.ts`:

```tsx
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NormalizedResponse<T> {
  data: T[];
  meta: PaginationMeta | null;
}

export function normalizeApiResponse<T>(
  response: T[] | { data: T[]; meta?: PaginationMeta },
  page = 1,
  limit = 20
): NormalizedResponse<T> {
  if (Array.isArray(response)) {
    const data = response.slice((page - 1) * limit, page * limit);
    const total = response.length;
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }
  
  if (response && typeof response === 'object') {
    return {
      data: response.data || [],
      meta: response.meta || null,
    };
  }
  
  return { data: [], meta: null };
}
```

**Затрагиваемые файлы:**
- `lib/utils.ts`
- `app/my-listings/page.tsx`
- `app/favorites/page.tsx`

**Выигрыш:**  
Убирает ~15 строк дублирующегося кода, унифицирует обработку ответов.

---

## P1-3: CSS-переменная для цвета текста

**Проблема:**  
Inline стиль `style={{ color: 'rgb(243, 243, 243)' }}` встречается ~30+ раз в проекте.

**Решение:**  
Добавить в `globals.css`:

```css
:root {
  --color-text-secondary: rgb(243, 243, 243);
}

.text-secondary {
  color: var(--color-text-secondary);
}
```

Заменить все вхождения:
```tsx
// Было:
<p style={{ color: 'rgb(243, 243, 243)' }}>...</p>

// Стало:
<p className="text-secondary">...</p>
```

**Затрагиваемые файлы:**
- `app/globals.css`
- Все файлы с inline стилями (~10 файлов)

**Выигрыш:**  
Убирает повторяющиеся inline стили, упрощает изменение цветовой схемы.

---

## P1-4: Вынести SVG-иконки

**Проблема:**  
SVG-иконки копируются по всему коду. Например, иконка копирования встречается 8+ раз:

```tsx
<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
  />
</svg>
```

**Решение:**  
Создать файл `ui/icons.tsx`:

```tsx
interface IconProps {
  className?: string;
}

export function CopyIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

export function TrashIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export function EditIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

export function StarIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

export function RefreshIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
```

**Затрагиваемые файлы:**
- `ui/icons.tsx` (создать)
- `ui/index.ts` (добавить экспорт)
- Компоненты с повторяющимися иконками

**Выигрыш:**  
Централизация иконок, упрощение поддержки, уменьшение размера бандла.

---

## P1-5: Компонент EmptyState

**Проблема:**  
Пустые состояния дублируются:
- `MyListingsPage` (строки 704-709)
- `FavoritesPage` (строки 219-222)
- `ComparePage` (строки 137-175)
- `SavedFiltersList` (строки 258-263)

**Решение:**  
Создать файл `components/EmptyState.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {icon && <div className="mb-4">{icon}</div>}
      <h2 className="text-2xl font-bold text-primary-400 mb-2">{title}</h2>
      {description && (
        <p className="mb-6 text-secondary">{description}</p>
      )}
      {action && (
        <div className="flex justify-center">
          {action.href ? (
            <Link
              href={action.href}
              className="text-primary-400 font-medium text-sm hover:text-primary-500 transition-colors px-4 py-2.5 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="text-primary-400 font-medium text-sm hover:text-primary-500 transition-colors px-4 py-2.5 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Затрагиваемые файлы:**
- `components/EmptyState.tsx` (создать)
- Страницы с пустыми состояниями

**Выигрыш:**  
Унификация пустых состояний, улучшение UX consistency.

---

## P1-6: Унификация форматирования статусов

**Проблема:**  
Логика форматирования статусов дублируется:
- `ListingManagementCard` (строки 258-270)
- `AdminPage/PromotionsTab` (строки 714-727)

**Текущий код:**
```tsx
{listing.status === 'Active'
  ? t('userListings.active')
  : listing.status === 'Paused'
    ? t('userListings.paused')
    : t('userListings.closed')}
```

**Решение:**  
Добавить в `lib/utils.ts`:

```tsx
export function formatListingStatus(
  status: 'Active' | 'Paused' | 'Closed',
  t: (key: string) => string
): string {
  const statusMap = {
    Active: t('userListings.active'),
    Paused: t('userListings.paused'),
    Closed: t('userListings.closed'),
  };
  return statusMap[status] || status;
}

export function getStatusColorClass(status: 'Active' | 'Paused' | 'Closed'): string {
  const colorMap = {
    Active: 'text-primary-400',
    Paused: 'text-blue-400',
    Closed: 'text-gray-200',
  };
  return colorMap[status] || 'text-gray-200';
}
```

**Затрагиваемые файлы:**
- `lib/utils.ts`
- `components/ListingManagementCard.tsx`
- `app/admin/page.tsx`

**Выигрыш:**  
Единообразное форматирование статусов, упрощение изменений.

---

## P2-1: Секции ListingForm в отдельные компоненты

**Проблема:**  
`ListingForm.tsx` содержит 1841 строку. Форма разбита на секции, которые можно вынести.

**Решение:**  
Структура:

```
components/
├── ListingForm/
│   ├── index.tsx               # Основная форма
│   ├── BasicInfoSection.tsx    # Марка, модель, год, VIN
│   ├── TechnicalSection.tsx    # Двигатель, КПП, привод
│   ├── EquipmentSection.tsx    # Чекбоксы оборудования
│   ├── ConditionSection.tsx    # Состояние, регистрация
│   ├── ExteriorSection.tsx     # Кузов, цвет, двери
│   ├── PriceSection.tsx        # Цена, город
│   ├── AdditionalSection.tsx   # Срочно, новое, описание
│   └── PhotosSection.tsx       # Загрузка фото
```

**Выигрыш:**  
Разбивает 1841-строчный файл на 9 файлов по ~200 строк каждый.

---

## P2-2: Хук useDebounceSearch

**Проблема:**  
Debounce для поиска реализован inline в нескольких местах:
- `AdminPage/ListingsTab` (строки 262-272)
- `AdminPage/UsersTab` (строки 941-951)

**Решение:**  
Создать файл `hooks/useDebounceSearch.ts`:

```tsx
import { useEffect, useState } from 'react';

export function useDebounceSearch(
  value: string,
  delay = 500
): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**Выигрыш:**  
Убирает дублирующуюся логику debounce.

---

## P2-3: Компонент CopyButton

**Проблема:**  
Кнопка копирования с toast уведомлением дублируется в:
- `AdminPage/ListingsTab`
- `AdminPage/UsersTab`
- `AdminPage/PromotionsTab`
- `ListingManagementCard`

**Решение:**  
Создать файл `ui/CopyButton.tsx`:

```tsx
'use client';

import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { CopyIcon } from './icons';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'ID', className }: CopyButtonProps) {
  const { t } = useTranslation();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('admin.listingsTab.copySuccess', { label }));
    } catch {
      toast.error(t('admin.listingsTab.copyError'));
    }
  }, [text, label, t]);

  return (
    <button
      onClick={handleCopy}
      className={`p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors ${className || ''}`}
      title={t('common.copyId')}
    >
      <CopyIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
    </button>
  );
}
```

**Выигрыш:**  
Убирает дублирующуюся логику копирования.

---

## P2-4: Компонент LoadingSpinner

**Проблема:**  
Спиннеры загрузки дублируются с разными размерами:
```tsx
<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
```

**Решение:**  
Создать файл `ui/LoadingSpinner.tsx`:

```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]} ${className || ''}`}
    />
  );
}
```

**Выигрыш:**  
Унификация индикаторов загрузки.

---

## P2-5: Оптимизация ComparePage

**Проблема:**  
В `ComparePage` таблица сравнения содержит ~400 строк повторяющегося JSX для каждого параметра (марка, модель, год и т.д.).

**Решение:**  
Вынести конфигурацию параметров:

```tsx
const comparisonFields = [
  { key: 'brand', label: 'compare.brand', getValue: (l: Listing) => l.vehicle?.brand?.name },
  { key: 'model', label: 'compare.model', getValue: (l: Listing) => l.vehicle?.model?.name },
  { key: 'year', label: 'compare.year', getValue: (l: Listing) => l.vehicle?.year },
  { key: 'mileage', label: 'compare.mileage', getValue: (l: Listing) => 
    l.vehicle?.mileage_km ? `${formatMileage(l.vehicle.mileage_km)} ${t('listings.km')}` : null
  },
  // ... другие поля
];

// В JSX:
{comparisonFields.map(field => (
  <tr key={field.key} className="border-b border-primary-500/10">
    <td className="py-4 px-4 text-primary-400 font-semibold">{t(field.label)}</td>
    {listings.map(listing => (
      <td key={listing.id} className="py-4 px-4 text-center text-secondary">
        {field.getValue(listing) || t('compare.notAvailable')}
      </td>
    ))}
  </tr>
))}
```

**Выигрыш:**  
Сокращает ~300 строк JSX до ~50 строк конфигурации.

---

## Порядок выполнения

### Фаза 1 (P0) — 1-2 дня
1. P0-1: useRequireAuth
2. P0-5: Pagination
3. P0-3: StatusFilterButtons
4. P0-4: Разбить AdminPage
5. P0-2: usePaginatedData

### Фаза 2 (P1) — 1-2 дня
1. P1-1: Checkbox
2. P1-3: CSS-переменная
3. P1-4: SVG-иконки
4. P1-2: normalizeApiResponse
5. P1-5: EmptyState
6. P1-6: Форматирование статусов

### Фаза 3 (P2) — по необходимости
1. P2-4: LoadingSpinner
2. P2-3: CopyButton
3. P2-2: useDebounceSearch
4. P2-5: ComparePage оптимизация
5. P2-1: ListingForm секции

---

## Метрики успеха

| Метрика | До | После (ожидание) |
|---------|-----|------------------|
| Строк в AdminPage | 1272 | ~130 (основной) + 3×200 (вкладки) |
| Строк в ListingForm | 1841 | ~300 (основной) + 8×150 (секции) |
| Дублирование авторизации | 6 файлов | 1 хук |
| Дублирование пагинации | 4 места | 1 компонент |
| Inline стилей rgb(243,243,243) | ~30 | 0 |

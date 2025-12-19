# Pre-Migration Checklist

Список задач, которые нужно выполнить в монолите перед разделением на PPCSL и kupito.club.

## ✅ Выполнено

- [x] Создана система переводов (`frontend/lib/i18n.ts`)
- [x] Создана система тем (`frontend/lib/theme.ts`)
- [x] Создана система конфигурации сайта (`frontend/lib/site-config.ts`)
- [x] Обновлены все компоненты для использования переводов
- [x] Обновлен Tailwind config для динамической загрузки тем
- [x] Обновлены все layout файлы для использования `site-config`
- [x] Обновлены все компоненты для использования `site-config` вместо хардкодных URL
- [x] Создан документ CI/CD (`docs/CI_CD.md`)
- [x] Конфигурируемый вотермарк (использует `WATERMARK_DOMAIN`)

## 🔄 Осталось сделать

### 1. Система переводов (i18n)

**Проблема:** Система переводов хардкодит импорт `mkTranslations` и всегда возвращает македонские переводы.

**Файлы:**
- `frontend/lib/i18n.ts` - хардкодит `import mkTranslations from '@/messages/mk.json'`
- `frontend/app/not-found.tsx` - хардкодит `loadTranslations('mk')`

**Что нужно:**
- [x] Сделать динамическую загрузку переводов на основе `NEXT_PUBLIC_COUNTRY`
- [x] Обновить `loadTranslations` для использования `site-config` для определения локали
- [x] Обновить `getServerTranslations` для использования `site-config`
- [x] Обновить `app/not-found.tsx` для использования динамической локали

**Пример решения:**
```typescript
// В i18n.ts
import { loadSiteConfigSync } from './site-config';

export function loadTranslations(locale?: Locale): Translations {
  if (!locale) {
    const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
    const siteConfig = loadSiteConfigSync(country);
    locale = siteConfig.locale.split('_')[0] as Locale;
  }
  
  // Динамическая загрузка на основе локали
  if (locale === 'mk') {
    return mkTranslations as Translations;
  }
  // Для будущих локалей
  return mkTranslations as Translations;
}
```

### 2. PWA Manifest

**Проблема:** `frontend/app/manifest.ts` хардкодит текст на македонском и локаль 'mk'.

**Файлы:**
- `frontend/app/manifest.ts`

**Что нужно:**
- [x] Использовать `site-config` для динамической генерации manifest
- [x] Использовать переводы для текстов в manifest
- [x] Использовать `siteConfig.locale` вместо хардкодного 'mk'

**Пример решения:**
```typescript
import { loadSiteConfigSync } from '@/lib/site-config';
import { getServerTranslations } from '@/lib/i18n';

export default function manifest(): MetadataRoute.Manifest {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  const t = getServerTranslations();
  
  return {
    name: `${siteConfig.name} - ${t.home.title}`,
    short_name: siteConfig.name,
    description: t.home.subtitle,
    lang: siteConfig.locale.split('_')[0],
    // ...
  };
}
```

### 3. Валюты и локализация

**Проблема:** Хардкодные значения валюты 'MKD' и локали 'mk' в нескольких местах.

**Файлы:**
- `frontend/lib/utils.ts` - дефолтная валюта 'MKD'
- `frontend/lib/constants.ts` - список валют
- `frontend/lib/analytics.ts` - хардкодная валюта 'MKD'
- `frontend/components/ListingForm.tsx` - хардкодная локаль 'mk' в `localeCompare`

**Что нужно:**
- [x] Использовать `siteConfig.currency` вместо хардкодной 'MKD'
- [x] Использовать `siteConfig.locale` для `localeCompare`
- [x] Обновить `formatPrice` для использования `siteConfig.currency`
- [x] Обновить analytics для использования `siteConfig.currency`

**Пример решения:**
```typescript
// В utils.ts
import { loadSiteConfigSync } from './site-config';

export function formatPrice(price: number | undefined, currency?: string): string {
  if (!currency) {
    const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
    const siteConfig = loadSiteConfigSync(country);
    currency = siteConfig.currency;
  }
  // ...
}
```

### 4. Компоненты с хардкодными значениями

**Файлы:**
- `frontend/components/ListingForm.tsx` - `localeCompare(b.label, 'mk')`
- `frontend/components/PriceDisplay.tsx` - может использовать дефолтную валюту
- `frontend/components/SearchFilters.tsx` - может использовать дефолтную валюту

**Что нужно:**
- [x] Заменить все `localeCompare(..., 'mk')` на использование `siteConfig.locale`
- [x] Убедиться, что все компоненты используют `siteConfig.currency` вместо хардкода

### 5. Тесты

**Проблема:** Тесты могут содержать хардкодные значения 'MKD' и 'mk'.

**Файлы:**
- `frontend/lib/api.test.ts`
- `frontend/components/ListingCard.test.tsx`
- `frontend/components/ListingForm.test.tsx`
- `frontend/components/ListingGrid.test.tsx`

**Что нужно:**
- [ ] Обновить тесты для использования `site-config` или моков
- [ ] Убедиться, что тесты не зависят от хардкодных значений

### 6. Документация

**Что нужно:**
- [ ] Обновить документацию о том, как работает динамическая загрузка переводов
- [ ] Обновить документацию о том, как работает динамическая загрузка валют
- [ ] Добавить примеры использования `site-config` в компонентах

## 📋 Приоритет выполнения

1. **Высокий приоритет:**
   - Система переводов (i18n) - критично для разделения
   - PWA Manifest - влияет на SEO и PWA функциональность

2. **Средний приоритет:**
   - Валюты и локализация - важно для мультиплатформенности
   - Компоненты с хардкодными значениями

3. **Низкий приоритет:**
   - Тесты - можно обновить после разделения
   - Документация - можно обновить параллельно

## 🎯 Критерии готовности к разделению

Монолит готов к разделению, когда:

- [x] Все системы (переводы, темы, конфигурация) загружаются динамически
- [x] Нет хардкодных значений локали, валюты, доменов (кроме тестов и констант)
- [x] Все компоненты используют `site-config`, `theme`, `i18n` системы
- [x] PWA manifest генерируется динамически
- [x] Все тесты проходят (188 frontend тестов, 266 backend тестов - все успешно)
- [x] Сборка проходит успешно (frontend и backend)
- [x] Линтер проходит без ошибок
- [x] Форматирование соответствует стандартам

## 📝 Примечания

- После выполнения всех задач, монолит будет полностью готов к разделению
- Разделение можно делать порционно (сначала структура, потом файлы)
- Все изменения должны быть протестированы перед разделением

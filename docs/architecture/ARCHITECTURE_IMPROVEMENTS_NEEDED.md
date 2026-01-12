# Архитектура multi-platform: Статус реализации

Документ описывает, что реализовано и что осталось для полной поддержки multi-platform архитектуры.

## ✅ Полностью реализовано

### 1. Configuration (`config/site.ts`)
Platform-specific конфигурация сайта: название, домен, валюта, locale.

### 2. Translations (`locales/*.json`)
Переводы интерфейса и метаданных на языке платформы.

### 3. Theme (`theme/colors.ts`)
Цветовая схема, включая PWA цвета (`pwa.backgroundColor`, `pwa.themeColor`).

### 4. Assets (`assets/`)
Логотипы, favicon, OG-изображения, watermark для фотографий.

### 5. SEO Keywords
Вынесены в `locales/*.json` → `metadata.site.keywords`.

### 6. Default Metadata
Вынесены в `locales/*.json` → `metadata.site.defaultTitle/defaultDescription`.

### 7. OpenGraph
`app/opengraph-image.tsx` и `app/page.tsx` используют config и locales.

### 8. PWA Manifest
`app/manifest.ts` использует `theme.pwa` для цветов.

### 9. Platform-specific скрипты
Все скрипты в core с системой `checkPlatform()` и `getPlatformConfig()`.
Конфиги платформ: `core/backend/src/scripts/platforms/{mk,al}/config.ts`.

---

## 📋 Опционально (можно улучшить)

### 1. Popular Brands (`lib/popular-brands.ts`)

**Статус:** ✅ Реализована platform-override архитектура

- По умолчанию используются универсальные бренды (BMW, Mercedes, Audi и т.д.)
- При необходимости платформа может переопределить список через `config/popular-brands.ts`

### 2. FAQ (`app/faq/page.tsx`)

**Статус:** ✅ Вынесено в platform-level config

- Контент FAQ хранится в `config/faq.ts`
- `app/faq/page.tsx` читает конфиг через `loadFaqSync()` с fallback
- Email и домен подставляются из `config/site.ts` (через `loadSiteConfigSync`)

### 3. Legal Documents (`app/terms/`, `app/privacy/`)

**Статус:** ✅ Подготовлено для multi-platform без правок core

- Добавлен loader `loadLegalConfigSync()` (поддержка `config/legal.ts` как platform override)
- В Terms/Privacy добавлена безопасная замена домена/email на значения из `config/site.ts`
- Переключение языка теперь работает по доступным языкам в конфиге (не захардкожено `mk/en`)

**Важно:** тексты Terms/Privacy должны жить в platform repo в `config/legal.ts` (source of truth)

**Для Албании:** добавить `config/legal.ts` и включить `sq` (и/или `en`) без изменений в core

---

## 📁 Структура platform-specific файлов

```
{platform-repo}/
├── locales/
│   └── {lang}.json          # Переводы и metadata.site
├── theme/
│   └── colors.ts            # Цвета и pwa
├── config/
│   └── site.ts              # Конфигурация сайта
├── assets/
│   ├── frontend/public/     # Логотипы, favicon, OG
│   └── backend/watermark/   # Watermark для фото
└── package.json             # COUNTRY=xx для скриптов

{core}/
└── backend/src/scripts/
    └── platforms/
        ├── mk/config.ts     # Македонские города, описания
        └── al/config.ts     # Албанские города, описания
```

---

## 🔗 Связанные документы

- [SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md) - Архитектура скриптов
- [MULTI_REPOSITORY_ARCHITECTURE.md](./MULTI_REPOSITORY_ARCHITECTURE.md) - Multi-repo архитектура
- [../guides/PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md) - Чеклист создания платформы

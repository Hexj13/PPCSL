# План создания платформы для Албании

> **📊 Статус:** ✅ Готово к началу | **📅 Последнее обновление:** 2026-01-23 | **🔖 Версия:** 1.3

---

## 📑 Table of Contents

1. [Executive Summary](#-executive-summary)
2. [Progress Dashboard](#-progress-dashboard)
3. [Quick Reference](#-quick-reference)
4. [Приоритизированные Action Items](#-приоритизированные-action-items)
5. [Changelog](#-changelog)
6. [Dependencies Graph](#-dependencies-graph)
7. [Time Estimates](#️-time-estimates)
8. [Success Criteria](#-success-criteria)
9. [Этапы выполнения](#этап-1-подготовка-репозитория)
   - [Этап 1: Подготовка репозитория](#этап-1-подготовка-репозитория)
   - [Этап 2: Конфигурация платформы](#этап-2-конфигурация-платформы)
   - [Этап 3: Настройка CI/CD](#этап-3-настройка-cicd)
   - [Этап 4: Локальное тестирование](#этап-4-локальное-тестирование)
   - [Этап 5: Google аккаунт и аналитика](#этап-5-настройка-google-аккаунта-и-аналитики)
   - [Этап 6: Настройка домена](#этап-6-настройка-домена-namecheap)
   - [Этап 7: Деплой на Render.com](#этап-7-деплой-на-rendercom)
   - [Этап 8: Настройка Twilio](#этап-8-настройка-twilio-для-sms)
   - [Этап 9: Перевод скриптов](#этап-9-перевод-скриптов-генерации-данных)
   - [Этап 10: Обновление валют](#этап-10-обновление-валют-в-core-репозитории)
   - [Этап 11: Перевод FAQ](#этап-11-перевод-faq-и-обновление-популярных-брендов)
   - [Этап 12: Графические ресурсы](#этап-12-обновление-графических-ресурсов)
   - [Этап 13: Юридические документы](#этап-13-перевод-юридических-документов)
   - [Этап 14: Инфраструктура](#этап-14-дополнительные-настройки-инфраструктуры)
   - [Этап 15: Финальная проверка](#этап-15-финальная-проверка)
10. [Чеклист выполнения](#-чеклист-выполнения)
11. [Важные замечания](#️-важные-замечания)
12. [Контакты и поддержка](#-контакты-и-поддержка)

---

## 🎯 Executive Summary

**Цель:** Создать полнофункциональную платформу для продажи автомобилей в Албании на базе PPCSL.

**Ключевые метрики:**
- **Язык:** Албанский (sq-AL)
- **Валюты:** EUR (основная), ALL (дополнительная)
- **Страна:** Албания (AL)
- **Архитектура:** Multi-repository с Git submodule

**Текущий прогресс:** 🟢 **Архитектурные блокеры решены** — все хардкодные platform-specific данные вынесены в конфигурацию.

---

## 📊 Progress Dashboard

### Общий прогресс: ~15% (архитектура готова, контент в процессе)

| Категория | Статус | Прогресс | Приоритет |
|-----------|--------|----------|-----------|
| 🏗️ **Архитектура** | ✅ Готово | 100% | - |
| 📝 **Конфигурация** | ⏳ В процессе | 0% | 🔴 Высокий |
| 🎨 **Дизайн/Ресурсы** | ⏳ В процессе | 0% | 🟡 Средний |
| 🌐 **Инфраструктура** | ⏳ Не начато | 0% | 🔴 Высокий |
| 📚 **Контент/Переводы** | ⏳ В процессе | 0% | 🔴 Высокий |
| ⚖️ **Юридические документы** | ⏳ Не начато | 0% | 🟡 Средний |
| 🧪 **Тестирование** | ⏳ Не начато | 0% | 🟢 Низкий |

**Легенда:**
- ✅ Готово / 🟢 Низкий приоритет
- ⏳ В процессе / 🟡 Средний приоритет  
- ❌ Блокер / 🔴 Высокий приоритет

---

## 🚀 Quick Reference

### Быстрый старт
```bash
# 1. Клонировать репозиторий
git clone git@github.com:your-username/albania-platform.git
cd albania-platform

# 2. Добавить core submodule
git submodule add git@github.com:Hexj13/PPCSL.git core
git submodule update --init --recursive

# 3. Создать структуру
mkdir -p locales theme config assets/frontend/public assets/backend/watermark

# 4. Скопировать файлы и запустить
npm run prepare:build
cd core && npm run dev
```

### Ключевые файлы
- `config/site.ts` - конфигурация платформы
- `locales/sq.json` - переводы на албанский
- `theme/colors.ts` - цветовая схема
- `assets/` - графические ресурсы

### Критические переменные окружения
```env
NEXT_PUBLIC_COUNTRY=al
NEXT_PUBLIC_SITE_URL=https://autoshqip.al
NEXT_PUBLIC_API_URL=https://api.autoshqip.al
COUNTRY=al  # для скриптов
```

### Полезные ссылки
- 📋 [PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md) - Универсальный чеклист
- 🏗️ [SCRIPTS_ARCHITECTURE.md](../architecture/SCRIPTS_ARCHITECTURE.md) - Архитектура скриптов
- 📖 [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md) - Детальное руководство

---

## 🎯 Приоритизированные Action Items

### 🔴 Критичные (блокируют запуск)
1. **Создать GitHub репозиторий** - без этого нельзя начать
2. **Создать `locales/sq.json`** - без переводов приложение не запустится
3. **Создать `config/site.ts`** - обязательная конфигурация
4. **Настроить CI/CD** - для автоматизации деплоя

### 🟡 Важные (нужны для продакшена)
5. **Создать графические ресурсы** (логотипы, favicon, OG images)
6. **Настроить домен и DNS**
7. **Настроить Google Analytics и Search Console**
8. **Настроить Sentry для мониторинга**

### 🟢 Опциональные (можно сделать позже)
9. **Перевести юридические документы** (Terms, Privacy)
10. **Настроить Redis и S3**
11. **Оценить популярные бренды для Албании**

---

## 📝 Changelog

### [1.3] - 2026-01-23
**✅ Исправлено:**
- Вынесены хардкодные описания страниц в `locales/ro.json` и `locales/ru.json`
- Обновлены `app/page.tsx`, `SearchStructuredData.tsx`, `OrganizationSchema.tsx`
- Добавлены новые поля в TypeScript интерфейс переводов
- Актуализирован план с отметкой исправленных проблем

**📊 Статус:** Frontend/SEO проблемы решены. Core универсален.

### [1.2] - 2026-01-16
**✅ Реализовано:**
- Архитектура скриптов с `checkPlatform()` и `getPlatformConfig()`
- Platform-specific конфигурации в `core/backend/src/scripts/platforms/{mk,al}/config.ts`
- Вынесены SEO keywords, metadata, OpenGraph, PWA цвета в конфигурацию

### [1.1] - 2025-01-27
**📝 Создано:**
- Первоначальный план создания платформы
- Структура этапов и чеклистов
- Документация архитектурных проблем

---

## 🔗 Dependencies Graph

### Критические зависимости (блокируют другие этапы)

```
┌─────────────────┐
│  GitHub Repo    │ ──┐
└─────────────────┘   │
                      ├──> ┌──────────────────┐
┌─────────────────┐   │    │  Core Submodule   │
│  Core Ready     │ ──┘    └──────────────────┘
└─────────────────┘              │
                                 ├──> ┌──────────────────┐
                                 │    │  Config Files   │
                                 │    └──────────────────┘
                                 │              │
                                 │              ├──> ┌──────────────────┐
                                 │              │    │  Translations    │
                                 │              │    └──────────────────┘
                                 │              │              │
                                 │              │              ├──> ┌──────────────────┐
                                 │              │              │    │  Local Testing   │
                                 │              │              │    └──────────────────┘
                                 │              │              │              │
                                 │              │              │              ├──> ┌──────────────────┐
                                 │              │              │              │    │  CI/CD Setup     │
                                 │              │              │              │    └──────────────────┘
                                 │              │              │              │              │
                                 │              │              │              │              ├──> ┌──────────────────┐
                                 │              │              │              │              │    │  Deployment      │
                                 │              │              │              │              │    └──────────────────┘
                                 │              │              │              │              │
                                 │              └──────────────┴──────────────┴──────────────┘
                                 │
                                 └──> ┌──────────────────┐
                                      │  Assets/Design   │ (параллельно)
                                      └──────────────────┘
```

**Ключевые зависимости:**
- ⚠️ **Без GitHub репозитория** → нельзя начать работу
- ⚠️ **Без переводов** → приложение не запустится
- ⚠️ **Без конфигурации** → платформа не определит страну
- ⚠️ **Без CI/CD** → нельзя автоматизировать деплой

---

## ⏱️ Time Estimates

| Этап | Оценка времени | Сложность | Зависимости |
|------|----------------|-----------|-------------|
| Подготовка репозитория | 30 мин | 🟢 Низкая | - |
| Конфигурация платформы | 1-2 часа | 🟢 Низкая | Репозиторий |
| Переводы (`locales/sq.json`) | 4-8 часов | 🟡 Средняя | - |
| CI/CD настройка | 1-2 часа | 🟡 Средняя | Репозиторий |
| Графические ресурсы | 2-4 часа | 🟡 Средняя | - |
| Google аккаунт и аналитика | 1-2 часа | 🟢 Низкая | - |
| Sentry настройка | 30 мин | 🟢 Низкая | - |
| Домен и DNS | 1 час | 🟢 Низкая | Домен куплен |
| Деплой на Render.com | 2-3 часа | 🟡 Средняя | Все конфиги |
| Twilio настройка | 1 час | 🟢 Низкая | - |
| Юридические документы | 4-6 часов | 🔴 Высокая | Переводчик |
| Инфраструктура (Redis, S3) | 1-2 часа | 🟡 Средняя | AWS аккаунт |
| Тестирование | 2-4 часа | 🟡 Средняя | Все готово |

**Общая оценка:** 20-35 часов работы (2.5-4.5 рабочих дня)

---

## 🎯 Success Criteria

Платформа считается успешно созданной, когда выполнены все критерии:

### ✅ Функциональные критерии
- [ ] Пользователи могут регистрироваться и входить
- [ ] Пользователи могут создавать, редактировать, приостанавливать и закрывать объявления
- [ ] Поиск и фильтры работают корректно
- [ ] Все тексты отображаются на албанском языке
- [ ] Валюты EUR и ALL работают корректно

### ✅ Технические критерии
- [ ] CI/CD pipeline работает без ошибок
- [ ] Деплой на Render.com успешен
- [ ] SSL сертификат настроен
- [ ] База данных мигрирована
- [ ] Мониторинг (Sentry) работает

### ✅ SEO и аналитика
- [ ] Google Analytics отслеживает события
- [ ] Google Search Console верифицирован
- [ ] Sitemap генерируется корректно
- [ ] Мета-теги настроены правильно

### ✅ Контент
- [ ] Все переводы завершены
- [ ] Графические ресурсы созданы
- [ ] Юридические документы переведены (опционально)

---

## Общая информация

**Цель:** Создать новую платформу для продажи автомобилей в Албании на базе PPCSL (Platform for Posting Car Sale Listings).

**Архитектура:** Мультирепозиторная архитектура с использованием Git submodule для подключения core-репозитория PPCSL.

**Язык:** Албанский (sq-AL)

**Валюты:** EUR (евро) - основная, ALL (албанский лек) - дополнительная

**Страна:** Албания (AL)

---

## Этап 1: Подготовка репозитория

### 1.1. Создание GitHub репозитория

1. Создать новый репозиторий на GitHub
   - Название: `albania-platform` или `autoshqip.al` (или другое подходящее название)
   - Описание: "Platform for posting car sale listings in Albania"
   - Видимость: Private или Public (по выбору)
   - НЕ инициализировать с README, .gitignore или лицензией

### 1.2. Клонирование и настройка репозитория локально

```bash
# Клонировать новый репозиторий
git clone git@github.com:your-username/albania-platform.git
cd albania-platform

# Добавить PPCSL core как submodule
git submodule add git@github.com:Hexj13/PPCSL.git core

# Инициализировать submodule
git submodule update --init --recursive
```

### 1.3. Создание структуры директорий

```bash
# Создать директории для платформо-специфичных файлов
mkdir -p locales theme config .github/workflows
```

---

## Этап 2: Конфигурация платформы

### 2.1. Создание файла конфигурации сайта

**Файл:** `config/site.ts`

```typescript
import { SiteConfig } from "../site-config";

const config: SiteConfig = {
  country: "al",
  name: "AutoShqip", // или другое название
  domain: "autoshqip.al", // или другой домен
  locale: "sq-AL",
  currency: "EUR", // Основная валюта - евро (первая в списке при создании объявления)
  countryCode: "AL",
  supportEmail: "support@autoshqip.al",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://autoshqip.al",
};

export default config;
```

**Действия:**
- Заменить `name` на выбранное название платформы
- Заменить `domain` на реальный домен (если уже есть)
- Заменить `supportEmail` на реальный email поддержки
- Убедиться, что `country`, `locale`, `currency`, `countryCode` соответствуют Албании
- **Важно:** Валюты для Албании - EUR (евро) - основная, ALL (албанский лек) - дополнительная. Основная валюта в конфиге - EUR (будет первой в списке при создании объявления)

**Примечание:** Константы валют в core репозитории (`core/backend/src/common/constants.ts` и `core/frontend/lib/constants.ts`) нужно будет обновить с `['EUR', 'MDL']` на `['EUR', 'ALL']` для поддержки валют Албании. Порядок важен - EUR должна быть первой (основная валюта). Это изменение нужно делать в PPCSL core репозитории.

### 2.2. Создание файла темы (цвета)

**Файл:** `theme/colors.ts`

**Примечание:** На первом этапе используется та же цветовая схема, что и у kupito.club. В будущем можно будет изменить под брендинг Албании.

```typescript
import { ThemeColors } from "../theme";

const colors: ThemeColors = {
  primary: {
    50: "#f0fdf7",
    100: "#d4fae8",
    200: "#aaf5d1",
    300: "#7ef0ba",
    400: "#6eeb9c",
    500: "#6eeb9c",
    600: "#3bc973",
    700: "#2da55f",
    800: "#1f814b",
    900: "#115d37",
  },
  dark: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#0d1117",
  },
  bg: {
    dark: "#1a2e2a",
    darker: "#152520",
    light: "#233d37",
  },
  semantic: {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  },
};

export default colors;
```

**Действия:**
- Использовать ту же цветовую схему, что и у kupito.club (временно)
- В будущем можно настроить цвета под брендинг платформы для Албании
- Сохранить структуру объекта `ThemeColors`

### 2.3. Создание файла переводов

**Файл:** `locales/sq.json`

**Важно:** Необходимо перевести ВСЕ ключи из существующего файла `locales/ro.json` или `locales/ru.json` на албанский язык.

**Структура файла должна полностью повторять структуру `ro.json` или `ru.json`:**

```json
{
  "footer": {
    "copyright": "© 2025 AutoShqip. Të gjitha të drejtat e rezervuara.",
    "tagline": "Platformë për publikimin e njoftimeve për shitjen e automjeteve në Shqipëri",
    "faq": "Pyetje të shpeshta",
    "terms": "Kushtet e përdorimit",
    "privacy": "Politika e privatësisë",
    "cookieSettings": "Cilësimet e cookies"
  },
  "header": {
    "addListing": "Shto njoftim",
    "addListingShort": "Shto",
    "myListings": "Njoftimet e mia",
    "myListingsShort": "Të miat",
    "favorites": "Të preferuarat",
    "compare": "Krahaso",
    "profile": "Profili",
    "admin": "Admin",
    "logout": "Dil",
    "logoutShort": "Dil",
    "createListing": "Krijo njoftim",
    "createListingShort": "Krijo",
    "login": "Hyr",
    "loginShort": "Hyr",
    "register": "Regjistrohu",
    "brandName": "AutoShqip",
    "toggleMenu": "Ndrysho menunë"
  },
  "home": {
    "title": "Automjete në Shqipëri",
    "subtitle": "Bli ose shiti makinë në",
    "subtitleBold": "AutoShqip!",
    "subtitle2": "Publiko njoftim",
    "subtitle3": "falas.",
    "popularSearches": "Kërkimet popullore"
  },
  // ... остальные ключи должны быть переведены полностью
}
```

**Действия:**
1. Скопировать полную структуру из `locales/ro.json` или `locales/ru.json`
2. Перевести ВСЕ значения на албанский язык
3. Убедиться, что все ключи присутствуют (не должно быть пропущенных ключей)
4. Сохранить структуру вложенности объектов
5. Для плейсхолдеров типа `{name}`, `{count}` и т.д. - оставить как есть

**Критически важно:**
- Каждый ключ из `ro.json` или `ru.json` должен присутствовать в `sq.json`
- Если ключ отсутствует, приложение может упасть с ошибкой
- Использовать профессиональный перевод, подходящий для автомобильной тематики

---

## Этап 3: Настройка CI/CD

### 3.1. Создание package.json

**Файл:** `package.json`

```json
{
  "name": "albania-platform",
  "version": "1.0.0",
  "description": "Platform for posting car sale listings in Albania",
  "private": true,
  "scripts": {
    "prepare:build": "mkdir -p core/frontend/lib/locales && rm -rf core/frontend/lib/locales/backend && cp locales/ro.json locales/ru.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/ && cp -r theme core/frontend/lib/ && cp -r config core/frontend/lib/",
    "build": "npm run prepare:build && cd core/frontend && npm run build",
    "build:backend": "cd core/backend && npm run build",
    "dev": "npm run prepare:build && cd core && npm run dev"
  }
}
```

### 3.2. Создание CI/CD workflow

**Файл:** `.github/workflows/ci.yml`

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    name: Build and Deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout with submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive
          token: ${{ secrets.PAT_TOKEN }}

      - name: Copy platform files
        run: npm run prepare:build

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install frontend dependencies
        working-directory: ./core/frontend
        run: npm ci

      - name: Install backend dependencies
        working-directory: ./core/backend
        run: npm ci

      - name: Run linters
        working-directory: ./core/frontend
        run: npm run lint

      - name: Build frontend
        working-directory: ./core/frontend
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.API_URL }}
          NEXT_PUBLIC_SITE_URL: ${{ secrets.SITE_URL }}
        run: npm run build

      - name: Build backend
        working-directory: ./core/backend
        run: npm run build

      # Добавить шаги деплоя здесь (Render.com, VPS, etc.)
      # См. DEPLOYMENT.md для деталей
```

**Необходимые секреты в GitHub:**
- `PAT_TOKEN` - Personal Access Token с правами `repo` для доступа к PPCSL submodule
- `API_URL` - URL бэкенд API
- `SITE_URL` - URL фронтенда

### 3.3. Добавление обновления submodule в PPCSL CI/CD

**Файл:** В репозитории PPCSL (`.github/workflows/ci.yml`)

Добавить новый шаг в job `sync-to-locales`:

```yaml
- name: Update albania-platform submodule
  env:
    PAT_TOKEN: ${{ secrets.PAT_TOKEN }}
  run: |
    if [ -z "$PAT_TOKEN" ]; then
      echo "⚠️ PAT_TOKEN secret not set. Skipping submodule update."
      exit 0
    fi
    
    CREDENTIAL_FILE=$(mktemp)
    echo "https://x-access-token:${PAT_TOKEN}@github.com" > "$CREDENTIAL_FILE"
    git config --global credential.helper "store --file=$CREDENTIAL_FILE"
    
    cleanup() {
      rm -f "$CREDENTIAL_FILE"
      git config --global --unset credential.helper 2>/dev/null || true
    }
    trap cleanup EXIT
    
    git clone https://github.com/your-username/albania-platform.git ../albania-platform || exit 0
    cd ../albania-platform
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git submodule update --init --recursive || exit 0
    cd core
    git fetch origin
    git checkout ${{ github.sha }}
    cd ..
    git add core
    git commit -m "chore: update PPCSL core to ${{ github.sha }}" || exit 0
    git push origin main || exit 0
    
    cleanup
```

**Действия:**
- Заменить `your-username/albania-platform` на реальный путь к репозиторию
- Убедиться, что `PAT_TOKEN` секрет настроен в PPCSL репозитории

---

## Этап 4: Локальное тестирование

### 4.1. Копирование платформо-специфичных файлов

```bash
# В корне репозитория albania-platform
npm run prepare:build
# или вручную:
# mkdir -p core/frontend/lib/locales && cp locales/ro.json locales/ru.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/
# cp -r theme core/frontend/lib/ && cp -r config core/frontend/lib/
```

### 4.2. Установка зависимостей

```bash
cd core
npm run install:all
```

### 4.3. Настройка окружения

Создать файлы `.env` в `core/frontend` и `core/backend` (см. документацию LOCAL_DEVELOPMENT.md)

### 4.4. Запуск Docker контейнеров

```bash
# В директории core
docker-compose up -d
```

### 4.5. Запуск миграций базы данных

```bash
cd core/backend
npm run build
npm run migration:run
```

### 4.6. Запуск dev-серверов

```bash
cd core
npm run dev
```

### 4.7. Проверка

1. Открыть `http://localhost:3000` в браузере
2. Проверить, что интерфейс отображается на албанском языке
3. Проверить, что цвета темы применяются корректно
4. Проверить, что конфигурация сайта загружается (домен, валюта и т.д.)
5. Протестировать основные функции:
   - Регистрация
   - Вход
   - Создание объявления
   - Поиск объявлений
   - Фильтры

---

## Этап 5: Настройка Google аккаунта и аналитики

### 5.1. Создание Google аккаунта для Албании

**Важно:** Перед настройкой Google Analytics, Search Console и Sentry необходимо создать отдельные аккаунты/проекты для платформы Албании. Это обеспечит изоляцию данных и статистики для каждой платформы.

### 5.1.1. Архитектура конфигурации аналитики и мониторинга

**✅ Все настройки конфигурируются через переменные окружения - нет хардкода в core:**

| Сервис | Переменная окружения | Описание | Где используется |
|--------|---------------------|----------|-----------------|
| **Google Analytics** | `NEXT_PUBLIC_GA_ID` | Measurement ID (G-XXXXXXXXXX) | `core/frontend/components/GoogleAnalytics.tsx` |
| **Google Search Console** | `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Код верификации | `core/frontend/app/layout.tsx` |
| **Sentry Frontend** | `NEXT_PUBLIC_SENTRY_DSN` | DSN для Next.js проекта | `core/frontend/sentry.*.config.ts` |
| **Sentry Backend** | `SENTRY_DSN` | DSN для NestJS проекта | `core/backend/src/common/sentry.config.ts` |
| **Sentry Org/Project** | `SENTRY_ORG`, `SENTRY_PROJECT` | Для загрузки source maps | `next.config.js` |

**Преимущества:**
- ✅ Каждая платформа имеет отдельную статистику (GA4) и мониторинг ошибок (Sentry)
- ✅ Нет хардкода в core - все настройки берутся из переменных окружения
- ✅ Легко развертывать новые платформы - просто меняются env переменные
- ✅ Изоляция данных - ошибки и статистика не смешиваются между платформами

**Проверка отсутствия хардкода:**
- ✅ `GoogleAnalytics.tsx` использует только `process.env.NEXT_PUBLIC_GA_ID`
- ✅ Нет захардкоженных Measurement ID в коде
- ✅ Нет захардкоженных DSN в коде
- ✅ Все конфигурации читаются из переменных окружения

**Действия:**
1. Создать новый Google аккаунт с рабочей почтой под название платформы
   - Пример: `support@autoshqip.al` или `info@autoshqip.al`
   - Или использовать корпоративный Gmail: `autoshqip.al@gmail.com`
2. Настроить двухфакторную аутентификацию
3. Сохранить учетные данные в безопасном месте

### 5.2. Настройка Google Analytics

1. Войти в созданный Google аккаунт
2. Перейти в [Google Analytics](https://analytics.google.com/)
3. Создать новое свойство (Property) для платформы Албании
4. Настроить:
   - Название свойства: "AutoShqip" (или название платформы)
   - Часовой пояс: Tirana (GMT+1)
   - Валюта: ALL (албанский лек)
5. Получить Measurement ID (формат: `G-XXXXXXXXXX`)
6. Сохранить Measurement ID для настройки в переменных окружения

### 5.3. Настройка Google Search Console

1. Войти в созданный Google аккаунт
2. Перейти в [Google Search Console](https://search.google.com/search-console/)
3. Добавить новое свойство (Property)
4. Выбрать тип: "URL prefix"
5. Ввести URL платформы: `https://autoshqip.al` (или другой домен)
6. Выбрать метод верификации:
   - **Рекомендуется:** HTML-тег (через переменную окружения `NEXT_PUBLIC_GOOGLE_VERIFICATION`)
   - Альтернатива: HTML-файл или DNS-запись
7. Получить код верификации
8. Сохранить код верификации для настройки в переменных окружения

### 5.4. Настройка Sentry для мониторинга ошибок

**Важно:** Sentry используется для детального отслеживания ошибок и производительности. Для каждой платформы нужен отдельный проект Sentry.

1. Перейти на https://sentry.io
2. Войти в аккаунт (или создать новый)
3. Создать новую организацию (Organization) для платформы Албании (опционально, можно использовать существующую)
4. Создать два проекта:
   - **Frontend проект** (Platform: Next.js)
     - Название: `autoshqip-frontend` (или похожее)
     - Получить DSN (Data Source Name)
   - **Backend проект** (Platform: Node.js)
     - Название: `autoshqip-backend` (или похожее)
     - Получить DSN
5. Сохранить DSN для настройки в переменных окружения

**Примечание:** 
- Подробная инструкция по настройке Sentry: [SENTRY.md](../guides/SENTRY.md)
- Конфигурация GA, GTM, Sentry для платформ: [PLATFORM_GUIDE.md, раздел 6](../guides/PLATFORM_GUIDE.md#6-конфигурация-аналитики-и-мониторинга-ga-gtm-sentry)

**Важно:** 
- ✅ Все настройки Sentry конфигурируются через переменные окружения
- ✅ Нет хардкода в core - каждый проект использует свой DSN
- ✅ Для Албании будет отдельная статистика ошибок, не смешанная с Молдовой

---

## Этап 6: Настройка домена (Namecheap)

### 6.1. Приобретение домена

1. Зайти на [Namecheap.com](https://www.namecheap.com/)
2. Выбрать и приобрести домен (например, `autoshqip.al`)
3. Убедиться, что домен активирован

### 6.2. Настройка DNS записей в Namecheap

**Для Render.com деплоя:**

1. Войти в аккаунт Namecheap
2. Перейти в раздел "Domain List"
3. Нажать "Manage" на нужном домене
4. Перейти в "Advanced DNS"
5. Настроить записи:

   **Для основного домена (autoshqip.al):**
   - Тип: `A Record`
   - Host: `@`
   - Value: IP адрес Render.com сервиса (получить из Render dashboard)
   - TTL: Automatic

   **Для www поддомена:**
   - Тип: `CNAME Record`
   - Host: `www`
   - Value: `autoshqip.al` (или Render.com URL)
   - TTL: Automatic

   **Для API поддомена (если используется отдельный поддомен):**
   - Тип: `CNAME Record`
   - Host: `api`
   - Value: Render.com API URL
   - TTL: Automatic

6. Сохранить изменения
7. Подождать распространения DNS (обычно 5-30 минут, может занять до 48 часов)

### 6.3. Настройка SSL сертификата

Render.com автоматически настраивает SSL сертификаты через Let's Encrypt при подключении домена. Дополнительных действий не требуется.

---

## Этап 7: Деплой на Render.com

### 7.1. Создание проектов в Render.com

**Необходимо создать 2 сервиса:**
1. **Web Service** - для фронтенда (Next.js)
2. **Web Service** - для бэкенда (NestJS)

#### 7.1.1. Создание Web Service для Backend

1. Войти в [Render.com](https://render.com/)
2. Нажать "New +" → "Web Service"
3. Подключить GitHub репозиторий `albania-platform`
4. Настроить:
   - **Name:** `albania-platform-backend`
   - **Root Directory:** `core/backend`
   - **Environment:** `Node`
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Plan:** Free или Starter (в зависимости от потребностей)

5. Настроить переменные окружения (см. раздел 7.3)

#### 7.1.2. Создание Web Service для Frontend

1. В Render.com нажать "New +" → "Web Service"
2. Подключить тот же GitHub репозиторий `albania-platform`
3. Настроить:
   - **Name:** `albania-platform-frontend`
   - **Root Directory:** `core/frontend`
   - **Environment:** `Node`
   - **Build Command:** `cd ../.. && npm run prepare:build && cd core/frontend && npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free или Starter

4. Настроить переменные окружения (см. раздел 7.3)

### 7.2. Создание PostgreSQL Database в Render.com

1. В Render.com нажать "New +" → "PostgreSQL"
2. Настроить:
   - **Name:** `albania-platform-db`
   - **Database:** `albania_platform`
   - **User:** `albania_platform_user`
   - **Plan:** Free или Starter
3. Сохранить внутренний URL базы данных (будет использован в переменных окружения)

### 7.3. Настройка переменных окружения

#### 7.3.1. Backend Environment Variables

В Render.com для Backend сервиса добавить:

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Database Configuration (из Render PostgreSQL)
DATABASE_URL=<внутренний URL из Render PostgreSQL>
# Или отдельные переменные:
DB_HOST=<host из Render>
DB_PORT=5432
DB_USERNAME=<username из Render>
DB_PASSWORD=<password из Render>
DB_NAME=albania_platform

# Database Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# Authentication (ОБЯЗАТЕЛЬНО! Сгенерировать безопасный ключ)
JWT_SECRET=<сгенерировать безопасный ключ минимум 32 символа>

# CORS Configuration
FRONTEND_URL=https://autoshqip.al

# Redis Configuration (если используется)
REDIS_URL=<URL Redis сервиса, если создан>

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=<Account SID из Twilio>
TWILIO_AUTH_TOKEN=<Auth Token из Twilio>
TWILIO_MESSAGING_SERVICE_SID=<Messaging Service SID из Twilio>
# Или использовать TWILIO_FROM_NUMBER вместо MESSAGING_SERVICE_SID

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email из Google аккаунта для Албании>
SMTP_PASSWORD=<App Password из Google аккаунта>
SMTP_FROM=noreply@autoshqip.al

# Watermark Configuration
WATERMARK_DOMAIN=autoshqip.al

# Internationalization
DEFAULT_LOCALE=sq

# Sentry Configuration (мониторинг ошибок на бэкенде)
SENTRY_DSN=<DSN из Sentry для Backend проекта>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

**Генерация JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 7.3.2. Frontend Environment Variables

В Render.com для Frontend сервиса добавить:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://albania-platform-backend.onrender.com
# Или если настроен отдельный поддомен: https://api.autoshqip.al

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://autoshqip.al
NEXT_PUBLIC_COUNTRY=al

# Google Search Console Verification
NEXT_PUBLIC_GOOGLE_VERIFICATION=<код верификации из Google Search Console>

# Google Analytics Measurement ID
NEXT_PUBLIC_GA_ID=<G-XXXXXXXXXX из Google Analytics>

# Sentry Configuration (мониторинг ошибок)
NEXT_PUBLIC_SENTRY_DSN=<DSN из Sentry для Frontend проекта>
SENTRY_ORG=<название организации в Sentry>
SENTRY_PROJECT=<название Frontend проекта в Sentry>
SENTRY_AUTH_TOKEN=<Auth Token из Sentry для загрузки source maps>

# Promotion Feature Configuration (если используется)
PROMOTION_ACCESS=disabled
MAX_PROMOTIONS_PER_USER=10
CRON_SECRET=<сгенерировать безопасный ключ минимум 32 символа>
```

### 7.4. Настройка кастомного домена в Render.com

#### 7.4.1. Для Frontend сервиса

1. В Render.com открыть Frontend сервис
2. Перейти в "Settings" → "Custom Domains"
3. Нажать "Add Custom Domain"
4. Ввести домен: `autoshqip.al`
5. Render.com покажет инструкции по настройке DNS
6. Настроить DNS в Namecheap (см. раздел 6.2)
7. После распространения DNS Render.com автоматически настроит SSL

#### 7.4.2. Для Backend сервиса (если нужен отдельный поддомен)

1. В Render.com открыть Backend сервис
2. Перейти в "Settings" → "Custom Domains"
3. Нажать "Add Custom Domain"
4. Ввести поддомен: `api.autoshqip.al`
5. Настроить CNAME запись в Namecheap (см. раздел 6.2)

### 7.5. Запуск миграций базы данных

После первого деплоя Backend сервиса:

1. В Render.com открыть Backend сервис
2. Перейти в "Shell"
3. Выполнить команды:
```bash
cd core/backend
npm run migration:run
```

Или добавить в Build Command:
```bash
npm ci && npm run build && npm run migration:run
```

---

## Этап 8: Настройка Twilio для SMS

### 8.1. Создание Twilio аккаунта

1. Зайти на [Twilio.com](https://www.twilio.com/)
2. Создать новый аккаунт (или использовать существующий)
3. Подтвердить email и телефон

### 8.2. Настройка Twilio для Албании

1. Войти в Twilio Console
2. Перейти в "Phone Numbers" → "Manage" → "Buy a number"
3. Выбрать страну: **Albania (AL)**
4. Выбрать тип номера: **Mobile** или **Local**
5. Купить номер (или использовать Messaging Service)

**Альтернатива - Messaging Service:**
1. Перейти в "Messaging" → "Services"
2. Создать новый Messaging Service
3. Настроить для Албании
4. Добавить номер телефона в сервис

### 8.3. Получение учетных данных Twilio

1. В Twilio Console перейти в "Settings" → "General"
2. Скопировать:
   - **Account SID**
   - **Auth Token**
3. Если используется Messaging Service:
   - Перейти в "Messaging" → "Services"
   - Скопировать **Messaging Service SID**
4. Если используется прямой номер:
   - Перейти в "Phone Numbers" → "Manage" → "Active numbers"
   - Скопировать номер телефона (формат: +355XXXXXXXXX)

### 8.4. Настройка переменных окружения

Добавить в Backend Environment Variables в Render.com:

```env
TWILIO_ACCOUNT_SID=<Account SID>
TWILIO_AUTH_TOKEN=<Auth Token>
TWILIO_MESSAGING_SERVICE_SID=<Messaging Service SID>
# Или вместо MESSAGING_SERVICE_SID:
TWILIO_FROM_NUMBER=<номер телефона в формате +355XXXXXXXXX>
```

### 8.5. Обновление SMS сообщений для Албании

**Файл:** `core/backend/src/common/constants.ts`

Необходимо обновить SMS сообщения на албанский язык:

```typescript
export const SMS_MESSAGES = {
  VERIFICATION_CODE: (code: string) => `AutoShqip kodi i verifikimit: ${code}`,
  PASSWORD_RESET_CODE: (code: string) => `AutoShqip kodi i rivendosjes së fjalëkalimit: ${code}`,
} as const;
```

**Важно:** Это изменение нужно сделать в core репозитории PPCSL, так как это общий файл. Либо создать платформо-специфичную конфигурацию SMS сообщений.

---

## Этап 9: Перевод скриптов генерации данных

### 9.1. Список скриптов для проверки и перевода

**Все скрипты находятся в:** `core/backend/src/scripts/stage/`

**Важно:** 
- **Консольные логи (console.log)** должны быть на **английском языке** для удобства чтения разработчиком
- **Города** должны быть **реальными городами Албании** (не перевод македонских, а актуальные названия)
- **Описания автомобилей** должны быть на **албанском языке** (перевод с македонского)

**Скрипты, требующие обязательного перевода данных:**

1. **`seed.ts`** - Основной скрипт генерации тестовых данных
   - ✅ Массив `cities` (города) → **заменить** македонские города на **реальные города Албании**
   - ✅ Массив `descriptions` (описания автомобилей) → перевести на албанский
   - ❌ Сообщения в консоль → оставить на английском

2. **`reset-and-seed.ts`** - Сброс БД и генерация данных
   - ❌ Сообщения в консоль → перевести на английский (если сейчас на македонском)

**Скрипты, требующие проверки на наличие текстов:**

3. **`seed-vin-test.ts`** - Генерация данных с VIN кодами
   - Проверить наличие данных для перевода (города, описания)
   - Логи должны быть на английском

4. **`seed-vehicles-full.ts`** - Полная генерация транспортных средств
   - Проверить наличие данных для перевода (города, описания)
   - Логи должны быть на английском

5. **`create-test-listing.ts`** - Создание тестового объявления
   - Проверить наличие данных для перевода
   - Логи должны быть на английском

**Скрипты, которые НЕ требуют перевода (технические):**

- `add-brands.ts` - Добавление брендов (технические данные)
- `add-*-models.ts` - Добавление моделей (технические данные)
- `check-*.ts` - Проверочные скрипты (технические сообщения)
- `clear-*.ts` - Скрипты очистки (технические сообщения)
- `make-admin.ts` - Создание админа (технические сообщения)

### 9.2. Скрипты, требующие перевода

**✅ ВЫПОЛНЕНО:** Консольные логи во всех скриптах переведены на английский.

#### 9.2.1. Архитектурное улучшение — `seed-config.ts`

Создан конфигурационный файл `core/backend/src/scripts/stage/seed-config.ts`, который содержит все локализуемые данные для seed-скриптов:

```typescript
export interface SeedConfig {
  cities: string[];
  descriptions: string[];
  phonePrefix: string;
  testUserFirstName: string;
  testUserLastName: string;
  testCompanyName: string;
  transmissionLabels: {
    automatic: string;
    manual: string;
    cvt: string;
  };
}
```

**Для Албании нужно отредактировать `seed-config.ts`:**

```typescript
const config: SeedConfig = {
  cities: [
    'Tiranë',        // Тирана (столица)
    'Durrës',        // Дуррес
    'Vlorë',         // Влёра
    'Shkodër',       // Шкодер
    'Fier',          // Фиери
    'Korçë',         // Корча
    'Elbasan',       // Эльбасан
    'Kavajë',        // Кавая
    'Gjirokastër',   // Гирокастра
    'Sarandë',       // Саранда
    'Berat',         // Берат
    'Lushnjë',       // Люшня
    'Pogradec',      // Поградец
    'Lezhë',         // Лежа
  ],

  descriptions: [
    'Automjet i mirëmbajtur në mënyrë të shkëlqyer, pa defekte. Servisuar rregullisht.',
    'Automjet i mrekullueshëm në gjendje të shkëlqyer. Goma të reja, vaj i ri.',
    'Automjet në gjendje perfekte, si i ri. Mundësi e shkëlqyer.',
    'Automjet i mirëmbajtur me historik të plotë servisimi.',
    'Automjet me cilësi të lartë, ideal për familje.',
    'Automjet sportiv në gjendje të shkëlqyer. Performancë e shkëlqyer.',
    'Automjet ekonomik dhe i sigurt. Perfekt për qytet.',
    'Automjet luksoz me të gjitha opsionet. Cilësi premium.',
    'Automjet i besueshëm për udhëtime të gjata. Gjendje e shkëlqyer.',
    'Automjet modern me teknologjitë më të reja. Vlerë e shkëlqyer.',
  ],

  phonePrefix: '+355',  // Код Албании
  testUserFirstName: 'Test',
  testUserLastName: 'Përdorues',  // Пользователь на албанском
  testCompanyName: 'Kompania Test',  // Тестовая компания на албанском

  transmissionLabels: {
    automatic: 'Automatik',
    manual: 'Manuale',
    cvt: 'CVT',
  },
};
```

#### 9.2.2. Скрипты, которые уже обновлены

**✅ Переведены логи на английский:**
- `reset-and-seed.ts`
- `add-brands.ts`
- `seed-vin-test.ts`
- `seed-vehicles-full.ts`

**✅ Используют конфиг `seed-config.ts`:**
- `seed.ts` — города, описания, телефоны, имена пользователей, трансмиссии
- `seed-vin-test.ts` — города, описания, трансмиссии

#### 9.2.3. Действия для Албании

1. **Отредактировать `seed-config.ts`** — заменить данные на албанские (см. пример выше)
2. Скрипты автоматически подхватят новые значения

**Важно:**
- **Города** (cities) = реальные города Албании (замена, не перевод!)
- **Описания** (descriptions) = албанский язык (перевод)
- **Логи** (console.log) = английский язык (для удобства чтения)

**Важно:** Эти изменения нужно делать в PPCSL core репозитории, так как скрипты общие для всех платформ. Можно создать платформо-специфичные версии скриптов или использовать переменные окружения для выбора языка.

**Рекомендация:** Создать платформо-специфичные константы для городов и описаний, которые будут загружаться из конфигурации платформы, чтобы не дублировать код в core.

---

## Этап 10: Обновление валют в core репозитории

### 10.1. Обновление констант валют

**Важно:** Валюты для Албании - ALL (албанский лек) и EUR (евро). Необходимо обновить константы валют в core репозитории.

#### 10.1.1. Backend константы

**Файл:** `core/backend/src/common/constants.ts`

**Текущее значение:**
```typescript
export const currencies = ['EUR', 'ALL'] as const;

export const Currency = {
  EUR: currencies[0],
  ALL: currencies[1],
} as const;
```

**Нужно обновить для поддержки Албании:**
```typescript
export const currencies = ['EUR', 'ALL'] as const;

export const Currency = {
  EUR: currencies[0],  // Основная валюта (первая в списке)
  ALL: currencies[1],  // Дополнительная валюта
} as const;
```

**Важно:** Порядок важен! EUR должна быть первой, так как это основная валюта и она будет первой в выпадающем списке при создании объявления (как EUR сейчас на kupito.club).

#### 10.1.2. Frontend константы

**Файл:** `core/frontend/lib/constants.ts`

**Текущее значение:**
```typescript
export const currencies = ['EUR', 'ALL'] as const;

export const Currency = {
  EUR: currencies[0],
  ALL: currencies[1],
} as const;
```

**Нужно обновить:**
```typescript
export const currencies = ['EUR', 'ALL'] as const;

export const Currency = {
  EUR: currencies[0],  // Основная валюта (первая в списке)
  ALL: currencies[1],  // Дополнительная валюта
} as const;
```

**Важно:** Порядок важен! EUR должна быть первой, так как это основная валюта и она будет первой в выпадающем списке при создании объявления.

### 10.2. Важные замечания

1. **Изменения в core:** Эти изменения нужно делать в PPCSL core репозитории, так как константы общие для всех платформ
2. **Обратная совместимость:** Нужно убедиться, что изменение не сломает существующие платформы (kupito.club использует EUR)
3. **Варианты решения:**
   - Создать платформо-специфичные константы валют
   - Использовать переменные окружения для выбора валют
   - Сделать валюты конфигурируемыми через site config

**Рекомендация:** Лучше сделать валюты конфигурируемыми через платформо-специфичную конфигурацию, чтобы каждая платформа могла иметь свои валюты без изменения core.

---

## Этап 11: Перевод FAQ и обновление популярных брендов

### 11.1. Перевод FAQ

**Файл:** `core/frontend/app/faq/page.tsx`

FAQ содержит хардкодные тексты на македонском языке. Нужно добавить албанскую версию.

**Что делать:**
1. Добавить албанскую версию всех вопросов и ответов
2. Обновить структуру для поддержки нескольких языков (как в terms и privacy)
3. Перевести все вопросы и ответы на албанский

**Структура текущего FAQ:**
- Что такое платформа?
- Бесплатно ли использование?
- Как зарегистрироваться?
- Как создать объявление?
- Как опубликовать объявление?
- Как приостановить объявление?
- Как закрыть объявление?
- И другие вопросы...

### 11.2. Обновление популярных брендов (опционально)

**Файл:** `core/frontend/lib/popular-brands.ts`

Текущий список популярных брендов:
- Audi, BMW, Citroën, Fiat, Ford, Hyundai, Mercedes-Benz, Opel, Peugeot, Renault, Toyota, Volkswagen

**Рекомендация:** Проанализировать рынок автомобилей в Албании и определить, нужно ли изменить список популярных брендов. Возможно, список подходит и для Албании, так как это европейские бренды.

**Действия (если нужно изменить):**
1. Исследовать популярные бренды автомобилей в Албании
2. Обновить массив `POPULAR_BRANDS`
3. Обновить объект `POPULAR_MODELS_BY_BRAND`

---

## Этап 12: Обновление графических ресурсов

**✅ ОПТИМИЗИРОВАНО:** Создана архитектура platform-specific assets.

### 12.1. Новая архитектура assets/

Все графические ресурсы теперь хранятся в platform-репозитории в папке `assets/`:

```
assets/
├── frontend/
│   └── public/          # Frontend публичные ресурсы
│       ├── favicon*.png # Favicon иконки (все размеры)
│       ├── logo*.png    # Логотипы платформы
│       ├── og-image.jpg # Open Graph изображение
│       ├── opengraph-image.png
│       └── pwa192.png   # PWA иконка
└── backend/
    └── watermark/
        └── logo.png     # Логотип водяного знака
```

**Преимущества:**
- ✅ Графические ресурсы **platform-specific**, не в core
- ✅ Автоматическое копирование при сборке
- ✅ Core остаётся универсальным для всех платформ
- ✅ Легко создавать новые платформы

### 12.2. Как работает копирование

**Обновлённый скрипт `prepare:build` в `package.json`:**
```json
"prepare:build": "mkdir -p core/frontend/lib/locales && rm -rf core/frontend/lib/locales/backend && cp locales/ro.json locales/ru.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/ && cp -r theme core/frontend/lib/ && cp -r config core/frontend/lib/ && cp -r assets/frontend/public/* core/frontend/public/ && cp -r assets/backend/watermark core/backend/assets/"
```

**Процесс:**
1. При запуске `npm run prepare:build` или `npm run dev`:
   - Копируются `locales/ro.json`, `locales/ru.json` → `core/frontend/lib/locales/`; `locales/backend/*.json` → `core/backend/src/common/i18n/`
   - Копируются `theme/` → `core/frontend/lib/theme/`
   - Копируются `config/` → `core/frontend/lib/config/`
   - **Копируются `assets/frontend/public/*` → `core/frontend/public/`**
   - **Копируются `assets/backend/watermark/` → `core/backend/assets/watermark/`**

2. Core использует скопированные ресурсы во время работы

**`.gitignore` в core обновлён:**
- Скопированные ресурсы игнорируются в core
- Core остаётся чистым и универсальным

### 12.3. Действия для Албании

**Создать новые ресурсы:**

1. **Логотип AutoShqip** (3 версии):
   - `logo.png` - основной логотип
   - `logo-desktop.png` - версия для десктопа
   - `logo-mobile.png` - версия для мобильных
   - Формат: PNG с прозрачным фоном

2. **Favicon** (все размеры):
   - Использовать [Real Favicon Generator](https://realfavicongenerator.net/)
   - Сгенерировать: 16, 32, 64, 192, 512px + favicon.ico
   - Поместить в `assets/frontend/public/`

3. **PWA иконка**:
   - `pwa192.png` (192x192px)
   - Формат: PNG

4. **Open Graph изображения**:
   - `og-image.jpg` (1200x630px, JPG)
   - `opengraph-image.png` (1200x630px, PNG)
   - Для соцсетей (Facebook, Twitter и т.д.)

5. **Логотип водяного знака**:
   - `assets/backend/watermark/logo.png`
   - Формат: PNG с **прозрачным фоном**
   - Размер: ~200x200px (или пропорциональный)
   - Цвет: **белый или светлый** (для контраста на фотографиях)
   - Используется при загрузке фото автомобилей

**Поместить ресурсы:**
```bash
# Структура для Албании
albania-platform/
├── assets/
│   ├── frontend/
│   │   └── public/
│   │       ├── favicon.ico
│   │       ├── favicon-16.png
│   │       ├── favicon-32.png
│   │       ├── favicon-64.png
│   │       ├── favicon-192.png
│   │       ├── favicon-512.png
│   │       ├── logo.png
│   │       ├── logo-desktop.png
│   │       ├── logo-mobile.png
│   │       ├── og-image.jpg
│   │       ├── opengraph-image.png
│   │       └── pwa192.png
│   └── backend/
│       └── watermark/
│           └── logo.png
```

**Запустить копирование:**
```bash
npm run prepare:build
```

Ресурсы автоматически скопируются в core и будут использоваться платформой.

### 12.4. Watermark Configuration

Настроить env переменную для домена водяного знака:

```env
WATERMARK_DOMAIN=autoshqip.al
```

Эта переменная определяет текст, который будет отображаться **под** логотипом на фотографиях.

### 12.5. OpenGraph изображения (дополнительно)

**Файлы (теперь в `assets/frontend/public/`):**
- `og-image.jpg`
- `core/frontend/public/opengraph-image.png`
- `core/frontend/app/opengraph-image.tsx` (содержит хардкодный текст "Kupito")

**Действия:**
1. Создать новые OG изображения для платформы Албании
2. Обновить `opengraph-image.tsx` — заменить хардкодные тексты:
   - `alt = 'Kupito - Autoturisme în Moldova'` → локализовать
   - Fallback текст "Kupito" и "Купете или продадете авто на Kupito!" → локализовать

**Важно:** Файл `opengraph-image.tsx` содержит хардкодные тексты на македонском, которые нужно сделать конфигурируемыми или загружать из переводов.

---

## Этап 13: Перевод юридических документов

### 10.1. Файлы, требующие перевода

Юридические документы находятся в core репозитории и содержат хардкодные тексты:

#### 10.1.1. Terms of Service (Условия использования)

**Файл:** `core/frontend/app/terms/page.tsx`

**Что делать:**
1. Добавить албанскую версию в объект `terms`
2. Перевести все разделы:
   - Словарь терминов
   - Оглавление
   - Все 11 разделов условий использования
   - Контактная информация

**Структура:**
```typescript
const terms = {
  mk: { ... }, // Македонская версия
  en: { ... }, // Английская версия
  sq: {        // НОВАЯ: Албанская версия
    title: 'Kushtet e përdorimit',
    lastUpdated: 'Përditësuar për herë të fundit: ',
    languageToggle: 'Ndrysho gjuhën',
    dictionary: { ... },
    toc: { ... },
    sections: [ ... ],
    // ... остальные разделы
  },
};
```

#### 10.1.2. Privacy Policy (Политика конфиденциальности)

**Файл:** `core/frontend/app/privacy/page.tsx`

**Что делать:**
1. Добавить албанскую версию в объект `privacy`
2. Перевести все разделы:
   - Словарь терминов
   - Оглавление
   - Все 13 разделов политики конфиденциальности
   - Информацию о партнерах (Google Analytics, Twilio, AWS)
   - Контактная информация

**Структура:**
```typescript
const privacy = {
  mk: { ... }, // Македонская версия
  en: { ... }, // Английская версия
  sq: {        // НОВАЯ: Албанская версия
    title: 'Politika e privatësisë',
    lastUpdated: 'Përditësuar për herë të fundit: ',
    languageToggle: 'Ndrysho gjuhën',
    dictionary: { ... },
    toc: { ... },
    sections: [ ... ],
    // ... остальные разделы
  },
};
```

### 10.2. Обновление метаданных

**Файлы:**
- `core/frontend/app/terms/layout.tsx`
- `core/frontend/app/privacy/layout.tsx`

**Что делать:**
1. Добавить поддержку албанского языка в метаданные
2. Обновить title и description для албанской версии

### 10.3. Важные замечания по переводу

1. **Юридическая точность:** Рекомендуется использовать профессионального переводчика с юридическим образованием
2. **Адаптация под законодательство:** Убедиться, что документы соответствуют законодательству Албании
3. **Контактная информация:** Обновить email и адреса на информацию платформы Албании
4. **Название платформы:** Заменить "Kupito" на название платформы для Албании
5. **Домены:** Заменить `kupito.club` на домен платформы Албании

**Важно:** Эти изменения нужно делать в PPCSL core репозитории, так как это общие компоненты. Можно создать платформо-специфичные версии или использовать систему переводов.

---

## Этап 14: Дополнительные настройки инфраструктуры

### 14.1. Redis (кэширование и rate limiting)

**Важно:** Redis используется для кэширования и rate limiting. Нужно создать Redis сервис в Render.com.

**Действия:**
1. В Render.com нажать "New +" → "Redis"
2. Настроить:
   - **Name:** `albania-platform-redis`
   - **Plan:** Free или Starter
3. Скопировать REDIS_URL и добавить в переменные окружения Backend

### 14.2. Cron Jobs (автоматические задачи)

Платформа использует cron jobs для:
- Автоматического закрытия старых объявлений (старше 5 месяцев)
- Истечения промо-периодов

**Действия для Render.com:**
1. Создать Cron Job в Render.com или использовать внешний сервис (например, cron-job.org)
2. Настроить вызов эндпоинта `/api/cron/close-expired` с секретом CRON_SECRET
3. Рекомендуемое расписание: раз в день (0 0 * * *)

### 14.3. AWS S3 и CloudFront (хранение изображений)

Если используется AWS для хранения изображений (рекомендуется для продакшена):

#### 14.3.1. Общий или отдельный S3 bucket?

**Рекомендация: Отдельные buckets для каждой платформы**

| Критерий | Общий bucket | Отдельные buckets |
|----------|-------------|-------------------|
| Управление | Один bucket, но сложные папки | Простая структура |
| Безопасность | Если утечка — доступ ко всем | Изоляция данных |
| Удаление платформы | Сложно очистить | Просто удалить bucket |
| Биллинг | Общий, сложно разделить | Раздельная статистика |
| Регион | Один для всех | Можно выбрать ближайший |

**Вывод:** Использовать **отдельный bucket** для каждой платформы.

#### 14.3.2. Настройка S3 для Албании

**Действия:**
1. Войти в AWS Console
2. Создать новый S3 bucket:
   - **Имя:** `autoshqip-uploads` (или похожее)
   - **Регион:** `eu-south-1` (Милан) или `eu-central-1` (Франкфурт) — ближе к Албании
3. Настроить CORS для bucket
4. Создать CloudFront distribution для bucket:
   - **Origin:** S3 bucket
   - **Price Class:** Europe and North America
   - **HTTPS only**

#### 14.3.3. Переменные окружения

```env
AWS_ACCESS_KEY_ID=<ключ доступа>
AWS_SECRET_ACCESS_KEY=<секретный ключ>
AWS_REGION=eu-south-1
AWS_S3_BUCKET_NAME=autoshqip-uploads
AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net
```

**Важно:** Использовать отдельные IAM credentials с правами только на нужный bucket

### 14.4. Бэкапы базы данных

**Важно:** Настроить автоматические бэкапы базы данных.

**Для Render.com:**
- Starter план включает ежедневные бэкапы
- Free план не включает автоматические бэкапы

**Рекомендация:** Настроить дополнительные бэкапы на внешнее хранилище (S3).

### 14.5. Мониторинг

**Рекомендации:**
1. Настроить Health Checks в Render.com
2. Использовать Render.com Logs для мониторинга
3. Опционально: настроить внешний мониторинг (UptimeRobot, Pingdom)

### 14.6. Валидация телефонных номеров

**Важно:** Код страны для Албании — `+355`.

Убедиться, что:
1. Валидация телефонных номеров принимает формат `+355XXXXXXXXX`
2. Twilio настроен для отправки SMS на албанские номера

---

## Этап 15: Финальная проверка

### 15.1. Проверка функциональности

- [ ] Регистрация пользователей работает
- [ ] Вход в систему работает
- [ ] Создание объявлений работает
- [ ] Поиск и фильтры работают
- [ ] Отображение объявлений корректно
- [ ] Все тексты на албанском языке
- [ ] Цвета темы применяются корректно
- [ ] Конфигурация сайта загружается (домен, валюта ALL)
- [ ] SMS верификация работает (если настроена)
- [ ] Email верификация работает (если настроена)
- [ ] Админ-панель доступна
- [ ] Мобильная версия работает

### 15.2. Проверка SEO

- [ ] Мета-теги настроены
- [ ] Open Graph теги настроены
- [ ] Sitemap генерируется
- [ ] Robots.txt настроен
- [ ] Структурированные данные (Schema.org) работают

### 15.3. Проверка производительности

- [ ] Страницы загружаются быстро
- [ ] Изображения оптимизированы
- [ ] Кэширование работает
- [ ] CDN настроен (если используется)

---

## Этап 16: Документация и коммит

### 16.1. Создание README.md

**Файл:** `README.md`

```markdown
# AutoShqip - Platform for Albania

Platform for posting car sale listings in Albania.

## Setup

\`\`\`bash
git clone git@github.com:your-username/albania-platform.git
cd albania-platform
git submodule update --init --recursive
npm run prepare:build
cd core
npm run install:all
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
```

### 16.2. Коммит и пуш

```bash
git add .
git commit -m "feat: initial platform setup for Albania"
git push origin main
```

---

## ✅ Чеклист выполнения

> **💡 Совет:** Используйте этот чеклист как интерактивный список задач. Отмечайте выполненные пункты по мере продвижения.

### 📦 Подготовка
- [ ] Создан GitHub репозиторий
- [ ] Репозиторий клонирован локально
- [ ] PPCSL добавлен как submodule
- [ ] Создана структура директорий (locales, theme, config)

### ⚙️ Конфигурация
- [ ] Создан `config/site.ts` с настройками для Албании
- [ ] Создан `theme/colors.ts` с цветами темы
- [ ] Создан `locales/sq.json` с полным переводом на албанский
- [ ] Все ключи переведены (проверка соответствия с ro.json или ru.json)
- [ ] Обновлены константы валют в core (`['EUR', 'MDL']` → `['EUR', 'ALL']`) или настроена платформо-специфичная конфигурация валют
- [ ] EUR установлена как основная валюта (первая в списке) в конфиге сайта

### 🔄 CI/CD
- [ ] Создан `package.json` с необходимыми скриптами
- [ ] Создан `.github/workflows/ci.yml`
- [ ] Настроены секреты в GitHub (PAT_TOKEN, API_URL, SITE_URL)
- [ ] Добавлен шаг обновления submodule в PPCSL CI/CD

### 📊 Google аккаунт и аналитика
- [ ] Создан отдельный Google аккаунт для Албании
- [ ] Настроен Google Analytics (получен Measurement ID)
- [ ] Настроен Google Search Console (получен код верификации)
- [ ] Добавлены переменные окружения для Google сервисов

### Sentry (мониторинг ошибок)
- [ ] Создан аккаунт/организация в Sentry
- [ ] Создан Frontend проект в Sentry (Next.js)
- [ ] Создан Backend проект в Sentry (Node.js)
- [ ] Получены DSN для обоих проектов
- [ ] Добавлены переменные окружения для Sentry (Frontend и Backend)
- [ ] Настроены уведомления в Sentry (опционально)

### 🌐 Домен и деплой
- [ ] Домен приобретен в Namecheap
- [ ] DNS записи настроены в Namecheap
- [ ] Созданы сервисы в Render.com (Frontend, Backend, PostgreSQL)
- [ ] Настроены переменные окружения в Render.com
- [ ] Кастомный домен подключен в Render.com
- [ ] SSL сертификат настроен автоматически

### 📱 Twilio
- [ ] Создан/настроен Twilio аккаунт
- [ ] Приобретен номер телефона для Албании (или настроен Messaging Service)
- [ ] Получены учетные данные (Account SID, Auth Token, Messaging Service SID)
- [ ] Настроены переменные окружения Twilio в Render.com
- [ ] SMS сообщения переведены на албанский (в constants.ts)

### Архитектура скриптов ✅ РЕАЛИЗОВАНО
- [x] ~~Все скрипты хранятся в core~~ ✅ Выполнено
- [x] ~~Создана система `checkPlatform()` для контроля доступа~~ ✅ Выполнено
- [x] ~~Создан `script-guard.ts` с `checkPlatform()` и `getPlatform()`~~ ✅ Выполнено
- [x] ~~Создана структура `platforms/{mk,al}/config.ts`~~ ✅ Выполнено
- [x] ~~Создан `platforms/index.ts` с `getPlatformConfig()`~~ ✅ Выполнено
- [x] ~~Обновлены platform-specific скрипты для использования `checkPlatform()`~~ ✅ Выполнено
- [x] ~~Протестировано на Moldova~~ ✅ Выполнено

**Новая архитектура:**
- Все скрипты в `core/backend/src/scripts/`
- Конфигурации платформ в `core/backend/src/scripts/platforms/{mk,al}/config.ts`
- Доступ контролируется через `COUNTRY` env переменную
- См. [SCRIPTS_ARCHITECTURE.md](../architecture/SCRIPTS_ARCHITECTURE.md)

### Скрипты генерации данных ✅ ГОТОВО
- [x] ~~Переведены логи в скриптах на английский~~ ✅ Выполнено
- [x] ~~Создан `platforms/al/config.ts` с албанскими данными~~ ✅ Выполнено
  - [x] ~~Города Албании (Tiranë, Durrës, Vlorë, Shkodër и т.д.)~~ ✅
  - [x] ~~Описания на албанском языке~~ ✅
  - [x] ~~Телефонный префикс `+355`~~ ✅
  - [x] ~~Тестовые имена на албанском~~ ✅
  - [x] ~~Transmission labels на албанском~~ ✅
- [x] ~~Все скрипты используют `getPlatformConfig()`~~ ✅ Выполнено

**Запуск скриптов для Албании:**
```bash
COUNTRY=al npx ts-node -r tsconfig-paths/register src/scripts/stage/seed.ts
```

### ❓ FAQ и популярные бренды
- [ ] Добавлена албанская версия FAQ в `faq/page.tsx`
- [ ] Проверены/обновлены популярные бренды для Албании (опционально)

### 🎨 Графические ресурсы
- [x] ~~Создана архитектура `assets/` для platform-specific ресурсов~~ ✅ Выполнено
- [x] ~~Обновлён скрипт `prepare:build` для копирования assets~~ ✅ Выполнено
- [x] ~~Обновлён `.gitignore` в core для игнорирования скопированных ресурсов~~ ✅ Выполнено
- [ ] Создан новый логотип для платформы Албании (3 версии: основной, desktop, mobile)
- [ ] Создан новый логотип водяных знаков (`assets/backend/watermark/logo.png`)
- [ ] Настроена env переменная `WATERMARK_DOMAIN=autoshqip.al`
- [ ] Созданы новые favicon (16, 32, 64, 192, 512px + favicon.ico)
- [ ] Создана PWA иконка (`pwa192.png`)
- [ ] Созданы новые OpenGraph изображения (`og-image.jpg`, `opengraph-image.png`)
- [ ] Все ресурсы помещены в `assets/frontend/public/` и `assets/backend/watermark/`
- [ ] Запущен `npm run prepare:build` для копирования ресурсов в core

### Архитектурные улучшения (рекомендуется ДО создания Албании)
- [x] ~~Идентифицированы хардкодные platform-specific данные в core~~ ✅ Выполнено
- [x] ~~Создан документ `KNOWN_ISSUES.md`~~ ✅ Выполнено
- [x] ~~**Вынести SEO keywords** из core в config/locales~~ ✅ Выполнено (добавлено в locales/ro.json и locales/ru.json → metadata.site.keywords)
- [x] ~~**Вынести default metadata** (title, description) из core в locales~~ ✅ Выполнено (locales/ro.json и locales/ru.json → metadata.site)
- [x] ~~**Вынести OpenGraph хардкоды** из core~~ ✅ Выполнено (app/opengraph-image.tsx, app/page.tsx используют config и locales)
- [x] ~~**Вынести PWA цвета** из manifest.ts в theme/colors.ts~~ ✅ Выполнено (добавлено theme.pwa)
- [x] ~~**Вынести хардкодные описания страниц** из app/page.tsx, SearchStructuredData.tsx, OrganizationSchema.tsx~~ ✅ Выполнено (2026-01-23: добавлено в locales/ro.json и locales/ru.json → metadata.site.homePageDescription*, organizationDescription)
- [x] ~~Протестировать все изменения на текущей платформе (Молдова)~~ ✅ Выполнено (TypeScript компиляция пройдена)
- [x] ~~Обновить core с универсальной реализацией~~ ✅ Выполнено
- [ ] **Оценить popular brands** - нужны ли изменения для Албании (опционально)

### ⚖️ Юридические документы
- [ ] Добавлена албанская версия Terms of Service в `terms/page.tsx`
- [ ] Добавлена албанская версия Privacy Policy в `privacy/page.tsx`
- [ ] Обновлены метаданные для албанской версии
- [ ] Обновлена контактная информация в документах
- [ ] Заменено название платформы (Kupito → название для Албании)
- [ ] Заменены домены (kupito.club → домен для Албании)

### 🏗️ Инфраструктура
- [ ] Создан Redis сервис в Render.com
- [ ] Настроены Cron Jobs для автоматических задач
- [ ] Создан отдельный S3 bucket для Албании (`autoshqip-uploads`)
- [ ] Настроен CloudFront distribution для S3 bucket
- [ ] Созданы отдельные IAM credentials для bucket
- [ ] Настроены автоматические бэкапы базы данных
- [ ] Настроен мониторинг и Health Checks

### 🧪 Тестирование
- [ ] Платформо-специфичные файлы скопированы в core
- [ ] Зависимости установлены
- [ ] Docker контейнеры запущены
- [ ] Миграции выполнены
- [ ] Dev-сервер запущен и работает
- [ ] Интерфейс отображается на албанском
- [ ] Основные функции протестированы


### ✅ Финальная проверка
- [ ] Все функции работают корректно
- [ ] SEO настроено
- [ ] Производительность проверена
- [ ] README.md создан
- [ ] Изменения закоммичены и запушены

---

## ⚠️ Важные замечания

### 🔴 Критически важно

1. **Переводы:** ВСЕ ключи из `ro.json` или `ru.json` должны быть переведены в `sq.json`. Отсутствие хотя бы одного ключа может привести к падению приложения.

2. **Структура файлов:** Структура `sq.json` должна полностью повторять структуру `ro.json` или `ru.json`. Нельзя добавлять или удалять ключи.

3. **Плейсхолдеры:** В переводах сохранять плейсхолдеры типа `{name}`, `{count}`, `{page}` и т.д. без изменений.

4. **Submodule:** После каждого обновления core в PPCSL, нужно обновить submodule в платформенном репозитории:
   ```bash
   cd core
   git pull origin main
   cd ..
   git add core
   git commit -m "chore: update core submodule"
   git push
   ```

5. **Копирование файлов:** Перед каждым билдом необходимо копировать платформо-специфичные файлы в core:
   ```bash
   npm run prepare:build
   ```

6. **Google аккаунт:** Обязательно создать отдельный Google аккаунт для платформы Албании с рабочей почтой под название платформы (не kupito).

7. **Twilio:** Настроить Twilio для Албании с номером телефона или Messaging Service для этой страны.

8. **Скрипты:** Скрипты генерации данных находятся в core репозитории, поэтому их перевод нужно делать там (или создавать платформо-специфичные версии).
   - **Важно:** Консольные логи (console.log) должны быть на английском для удобства чтения разработчиком
   - **Города:** Заменить македонские города на реальные города Албании (не перевод, а актуальные названия)
   - **Описания:** Перевести описания автомобилей на албанский язык

9. **Юридические документы:** Terms и Privacy Policy также находятся в core, перевод нужно добавлять туда с поддержкой албанского языка.

10. **Валюты:** Для Албании используются валюты EUR (евро) - основная, ALL (албанский лек) - дополнительная. EUR должна быть первой в списке (как EUR сейчас на kupito.club). Нужно обновить константы валют в core репозитории с `['EUR', 'MDL']` на `['EUR', 'ALL']` или сделать их конфигурируемыми через платформо-специфичную конфигурацию.

11. **FAQ:** Страница FAQ (`faq/page.tsx`) содержит хардкодные тексты на македонском языке. Нужно добавить албанскую версию.

12. **Графические ресурсы:** Необходимо создать новые логотипы, favicon, PWA иконки и OpenGraph изображения для платформы Албании. Файл `opengraph-image.tsx` содержит хардкодные тексты.

13. **Redis:** Обязательно создать Redis сервис для кэширования и rate limiting.

14. **Cron Jobs:** Настроить cron jobs для автоматического закрытия старых объявлений.

15. **Телефонные номера:** Код страны для Албании — `+355`. Убедиться, что валидация и Twilio работают с этим форматом.

### 💡 Рекомендации

1. **Тестирование:** Всегда тестировать локально перед пушем в main
2. **Переводы:** Использовать профессионального переводчика для качественного перевода, особенно для юридических документов
3. **Брендинг:** Выбрать уникальное название и цвета для платформы (пока используется та же цветовая схема)
4. **Домен:** Выбрать домен, который легко запоминается и ассоциируется с Албанией
5. **Документация:** Ведите документацию по специфичным настройкам платформы
6. **Namecheap:** Использовать Namecheap для управления доменом
7. **Render.com:** Использовать Render.com для деплоя (проще, чем VPS, автоматический SSL)
8. **Google аккаунт:** Создать отдельный аккаунт заранее, до настройки аналитики
9. **Twilio:** Проверить доступность номеров для Албании и цены перед настройкой

---

## 📞 Контакты и поддержка

При возникновении проблем:
1. Проверить документацию в `core/docs/`
2. Проверить логи CI/CD в GitHub Actions
3. Проверить логи на сервере (PM2, Nginx)
4. Обратиться к команде разработки

---

## Реализованные улучшения архитектуры

### ✅ 1. Platform-specific Assets (графические ресурсы) — РЕАЛИЗОВАНО

**Решение:**
Создана архитектура `assets/` в корне платформенного репозитория:

```
platform-repo/
├── assets/
│   ├── frontend/
│   │   └── public/          # Frontend публичные ресурсы
│   │       ├── favicon*.png
│   │       ├── logo*.png
│   │       ├── og-image.jpg
│   │       └── pwa192.png
│   └── backend/
│       └── watermark/
│           └── logo.png     # Watermark логотип
├── locales/
├── theme/
├── config/
└── core/ (submodule)
```

**Механизм:**
- Скрипт `prepare:build` автоматически копирует ресурсы из `assets/` в `core/`
- `.gitignore` в core игнорирует скопированные ресурсы
- Core остаётся универсальным для всех платформ

**Преимущества:**
- ✅ Графические ресурсы теперь platform-specific
- ✅ Легко создавать новые платформы
- ✅ Нет конфликтов при обновлении core

---

## Важно: Обнаруженные проблемы архитектуры

⚠️ **КРИТИЧНО:** При анализе кодовой базы обнаружены **хардкодные platform-specific данные** в core, которые затруднят создание новых платформ.

### Основные проблемы:

1. ✅ **SEO Keywords** - ~~хардкоднуты на македонском в `app/layout.tsx` и `app/page.tsx`~~ **ИСПРАВЛЕНО** - вынесены в `locales/*.json` → `metadata.site.keywords`
2. ✅ **Default Metadata** - ~~title и description захардкожены на македонском в `app/layout.tsx`~~ **ИСПРАВЛЕНО** - вынесены в `locales/*.json` → `metadata.site.defaultTitle/defaultDescription`
3. ✅ **OpenGraph хардкоды** - ~~в `app/opengraph-image.tsx` и `app/page.tsx`~~ **ИСПРАВЛЕНО** - используют config и locales
4. ✅ **PWA Manifest цвета** - ~~хардкоднуты в `app/manifest.ts`~~ **ИСПРАВЛЕНО** - используют `theme.pwa`
5. ✅ **Хардкодные описания страниц** - ~~в `app/page.tsx`, `SearchStructuredData.tsx`, `OrganizationSchema.tsx`~~ **ИСПРАВЛЕНО** - вынесены в `locales/*.json` → `metadata.site.homePageDescription*` и `organizationDescription`
6. ✅ **Скрипты генерации данных** - ~~содержат македонские города, описания, телефоны **В CORE**~~ **ИСПРАВЛЕНО** - реализована архитектура с `checkPlatform()` и `getPlatformConfig()` в `core/backend/src/scripts/platforms/{mk,al}/config.ts`

### Детальная документация:

- **📄 Frontend/SEO:** [`KNOWN_ISSUES.md`](../architecture/KNOWN_ISSUES.md)
- **📄 Скрипты:** [`SCRIPTS_ARCHITECTURE.md`](../architecture/SCRIPTS_ARCHITECTURE.md) - **НОВОЕ!**

### Рекомендуемый порядок действий:

**Этап 1: Реорганизация скриптов (ПРИОРИТЕТ)**
1. Разделить скрипты на `common/` (универсальные) и `{country}/` (platform-specific)
2. Platform-specific скрипты переместить из core в platform-repo
3. Обновить `prepare:build` для копирования скриптов
4. Протестировать на Moldova
5. **Результат:** Core больше не содержит platform-specific данных в скриптах

**Этап 2: Оптимизация Frontend/SEO** ✅ **ВЫПОЛНЕНО**
1. ✅ Вынести SEO keywords в config/locales
2. ✅ Вынести metadata в locales
3. ✅ Вынести OpenGraph тексты в config/locales
4. ✅ Вынести PWA цвета в theme
5. ✅ Вынести хардкодные описания страниц в locales
6. **Результат:** Core полностью универсальный для Frontend/SEO

**Этап 3: Создание платформы Албания**
1. Скопировать `scripts/mk/` → `scripts/al/`
2. Обновить `seed-config.ts` албанскими данными
3. Создать албанские переводы
4. Создать албанские ресурсы (логотипы, иконки)
5. **Результат:** Новая платформа готова!

---

## Предложения по дальнейшим улучшениям (опционально)

См. [`KNOWN_ISSUES.md`](../architecture/KNOWN_ISSUES.md) для полного списка улучшений.

---

## Дополнительные ресурсы

- [MULTI_REPOSITORY.md](../architecture/MULTI_REPOSITORY.md) - Архитектура мультирепозиториев
- [PLATFORM_GUIDE.md](./PLATFORM_GUIDE.md) - Руководство по созданию платформ
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Инструкции по деплою
- [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) - Локальная разработка

---

---

## Связанные документы

### Руководства
1. **[PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md)** - Универсальный чеклист для создания платформ
2. **[PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md)** - Руководство по созданию платформ
3. **[DEPLOYMENT.md](../guides/DEPLOYMENT.md)** - Инструкции по деплою

### Архитектура
4. **[SCRIPTS_ARCHITECTURE.md](../architecture/SCRIPTS_ARCHITECTURE.md)** 🔴 - Архитектура скриптов (ОБЯЗАТЕЛЬНО)
5. **[KNOWN_ISSUES.md](../architecture/KNOWN_ISSUES.md)** - Известные проблемы
6. **[MULTI_REPOSITORY.md](../architecture/MULTI_REPOSITORY.md)** - Общая архитектура
7. **[ARCHITECTURE_OVERVIEW.md](../architecture/ARCHITECTURE_OVERVIEW.md)** - Обзор архитектуры

---

**Дата создания плана:** 2025-01-27  
**Последнее обновление:** 2026-01-23  
**Версия:** 1.3  
**Статус:** ✅ Frontend/SEO проблемы исправлены. Скрипты уже реорганизованы. Готово к созданию платформы Албания.

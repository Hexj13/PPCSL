---
title: Мобильное приложение
owner: platform
tags:
  - type/guide
  - domain/mobile
  - scope/core
  - status/draft
---

# Мобильное приложение PPCSL

План реализации нативных мобильных приложений (Android + iOS) на базе Expo (React Native).

## Оглавление

1. [Стратегия](#1-стратегия)
2. [Выбор технологии](#2-выбор-технологии)
3. [Размещение в репозитории](#3-размещение-в-репозитории)
4. [Взаимодействие с бэкендом](#4-взаимодействие-с-бэкендом)
5. [Сборка](#5-сборка)
6. [Отладка](#6-отладка)
7. [Тестирование](#7-тестирование)
8. [Публикация в сторы](#8-публикация-в-сторы)
9. [OTA-обновления](#9-ota-обновления)
10. [CI/CD](#10-cicd)
11. [Изменения в веб-версии](#11-изменения-в-веб-версии)
12. [Фазы реализации](#12-фазы-реализации)

---

## 1. Стратегия

### Android first, iOS second

Сначала выпускаем Android-приложение, стабилизируем, собираем фидбэк, потом выпускаем iOS. При этом архитектура с первого дня рассчитана на две платформы:

- Бизнес-логика, компоненты, навигация, API-клиент, хуки — **кроссплатформенные** с первого дня.
- Платформозависимый код (permissions, store-специфика) изолирован через `Platform.OS` и суффиксы `.android.tsx` / `.ios.tsx`.
- Expo Router, expo-secure-store, expo-notifications и другие Expo-модули уже кроссплатформенные — переписывать под iOS не придётся.
- Профили сборки в `eas.json` сразу описывают обе платформы (iOS-секции заполняются минимально, детализируются при переходе к iOS).

**Результат**: после выпуска и стабилизации Android, переход на iOS — это тестирование, UI-полировка под iOS-гайдлайны и настройка App Store, а не переписывание кода.

---

## 2. Выбор технологии

### Expo (React Native), SDK 55+

| Критерий | Expo |
|----------|------|
| Язык | TypeScript + React 19.2 — тот же стек, что и на фронте (Next.js 16) |
| Навигация | Expo Router — file-based routing, аналог Next.js App Router |
| Сборка | EAS Build — облачные сборки без локального Android Studio / Xcode |
| OTA-обновления | EAS Update — обновления JS-бандла без ревью в сторах, bundle diffing (~75% экономия трафика) |
| CI/CD | EAS Workflows — YAML-конфиг, триггеры на push/PR/расписание |
| Производительность | New Architecture (Fabric, TurboModules) — единственный вариант в SDK 55 |
| Нативный код | Expo Modules API — когда стандартных модулей недостаточно |

### Альтернативы

| Технология | Почему не подходит |
|------------|-------------------|
| Capacitor | WebView-обёртка, не нативный UX, ограничена производительность |
| Flutter | Dart вместо TypeScript, другая парадигма, нельзя переиспользовать React-экспертизу |
| Kotlin Multiplatform | Только shared-логика, UI платформозависимый, две кодовые базы для UI |

---

## 3. Размещение в репозитории

### Текущая структура

```
kupito.club/              (платформа — локали, тема, конфиг, ассеты)
  core/                   (PPCSL субмодуль — весь код)
    frontend/             (Next.js)
    backend/              (NestJS)
    docs/
```

### Структура с мобильным приложением

```
kupito.club/
  assets/
    mobile/                  платформенные ассеты
      android/               иконка, splash, store-скриншоты для Google Play
      ios/                   иконка, splash, store-скриншоты для App Store (позже)
  core/
    frontend/                Next.js (без изменений)
    backend/                 NestJS (без изменений)
    mobile/                  Expo-проект: один codebase, две платформы
      app/                   Expo Router — экраны (общие для обеих платформ)
        (tabs)/              основная таб-навигация
        auth/                экраны логина/регистрации
        listing/             карточка объявления
        _layout.tsx          корневой layout
      src/
        api/                 API-клиент (кроссплатформенный)
        auth/                JWT через expo-secure-store (кроссплатформенный)
        hooks/               React-хуки (кроссплатформенные)
        components/          UI-компоненты (кроссплатформенные)
          platform/          платформозависимые: .android.tsx / .ios.tsx
        i18n/                ro/ru/en — копируются из корневых locales/
        theme/               копируется из корневой theme/
        types/               общие типы
      assets/                шрифты, иконки внутри приложения
      app.json               Expo-конфиг (android + ios секции)
      eas.json               EAS Build: профили для обеих платформ
      package.json
    shared/                  (опционально) общие типы/утилиты для frontend + mobile
    docs/
```

### Принципы

- Код приложения в `core/mobile/` — часть PPCSL-субмодуля, шарится между платформами-площадками.
- **Один Expo-проект = два приложения** (Android + iOS). Общее: навигация, компоненты, хуки. Платформозависимое: `Platform.OS` или суффиксы `.android.tsx` / `.ios.tsx`.
- Платформенные ассеты (иконка под бренд, splash, store-скриншоты) — в корне платформы `assets/mobile/{android,ios}/`.
- Локали и тема копируются при сборке так же, как для frontend (расширение скрипта `prepare:build`).

---

## 4. Взаимодействие с бэкендом

Мобильное приложение использует **тот же REST API**, что и веб-клиент:

```
Mobile App  ──HTTPS──>  NestJS Backend (/api/*)  ──>  PostgreSQL + Redis
```

### Авторизация

- JWT Bearer token + refresh token.
- Хранение: `expo-secure-store` (Keychain на iOS, Encrypted SharedPreferences на Android) вместо localStorage.
- Заголовки: `Authorization: Bearer <token>`, `Accept-Language: ro|ru`, `X-Request-Id: <uuid>`.
- Refresh flow: `POST /api/auth/refresh` при 401 — та же логика, что и на вебе.

### API-клиент

Axios с интерцепторами — аналог `core/frontend/lib/api/api-client.ts`, адаптированный под secure storage:

- Request interceptor: Bearer-токен из `expo-secure-store`, язык из `expo-localization`, UUID для request-id.
- Response interceptor: автоматический refresh при 401, retry оригинального запроса.

### Push-уведомления

- `expo-notifications` (кроссплатформенный модуль).
- Android: FCM (Firebase Cloud Messaging).
- iOS: APNs (Apple Push Notification Service).
- Бэкенд: новый эндпоинт `POST /api/devices` для регистрации device-токенов.

### Доработки бэкенда

Для базовой работы приложения **бэкенд менять не нужно** — тот же API, те же контракты. Доработки понадобятся позже:

| Эндпоинт | Назначение | Фаза |
|----------|-----------|------|
| `POST /api/devices` | Регистрация push-токенов | 2 |
| `POST /api/notifications/send` | Отправка push из админки | 2 |
| `GET /.well-known/apple-app-site-association` | Universal links для iOS | 3 |
| `GET /.well-known/assetlinks.json` | App Links для Android | 2 |

---

## 5. Сборка

### Профили в `eas.json`

Три профиля сразу с секциями для обеих платформ (iOS-секции дополняются на фазе 3):

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

| Профиль | Назначение | Android | iOS (фаза 3) |
|---------|-----------|---------|---------------|
| `development` | Dev-клиент, дебаг-инструменты, hot reload | `.apk` | simulator build |
| `preview` | Release-сборка без дебага для QA | `.apk` | ad-hoc |
| `production` | Оптимизированный билд для сторов | `.aab` (Google Play) | `.ipa` (App Store) |

### Команды

```bash
cd core/mobile

# Фаза 1–2: только Android
eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform android

# Фаза 3: добавляется iOS
eas build --profile development --platform ios
eas build --profile production --platform ios

# Обе платформы одновременно
eas build --profile production --platform all
```

Сборки происходят **в облаке EAS** — не нужен локальный Android SDK / Xcode. Результат: ссылка на скачивание и QR-код для установки на устройство.

### Expo Fingerprint

EAS Workflows используют **Expo Fingerprint** — автоматическое определение, изменился ли нативный код. Если изменился только JS, достаточно OTA-обновления, полная пересборка не нужна. Экономит время и деньги (бесплатный план EAS: 30 билдов/месяц).

---

## 6. Отладка

### Локальная разработка

1. Запуск dev-сервера: `npx expo start --dev-client` из `core/mobile/`.
2. Физическое устройство: установить development build (`.apk`), подключить к той же Wi-Fi. Сканировать QR из терминала.
3. Эмулятор Android: Android Studio Emulator, dev build устанавливается автоматически через `--device`.
4. Fast Refresh: мгновенное обновление при сохранении файла (без полной перезагрузки).

### Инструменты

| Инструмент | Назначение |
|-----------|-----------|
| React DevTools | Инспекция дерева компонентов, props, state (встроено в dev-клиент) |
| Network Inspector | Просмотр HTTP-запросов к API прямо в dev-клиенте |
| Chrome DevTools | Клавиша `j` в терминале Expo — JS-дебаггер с breakpoints |
| Flipper | Расширенная отладка нативного слоя, БД, сети (опционально) |
| `console.log` | Вывод в Metro bundler терминал |
| Sentry | Мониторинг ошибок в production |
| `adb logcat` | Нативные логи Android при подключении по USB |

### Стейджинг

- Собрать **preview**-профиль с `EXPO_PUBLIC_API_URL`, указывающим на staging-бэкенд.
- Раздать `.apk` через EAS (ссылка/QR) или Internal App Sharing в Google Play Console.
- Логи: `adb logcat` при USB-подключении.

---

## 7. Тестирование

### Юнит- и интеграционные тесты

- **Jest + React Native Testing Library** — тесты компонентов и хуков (аналогично фронту).
- Конфигурация: `jest-expo` пресет (поставляется с Expo).
- Запуск: `npm run test` из `core/mobile/`.
- Общие утилиты/типы из `core/shared/` тестируются один раз.

### E2E тесты

- **Maestro** — рекомендуемый Expo инструмент для E2E (YAML-сценарии, проще Detox).
- Запуск локально на эмуляторе или в облаке через EAS Workflows.
- Пример сценария: открыть приложение → найти авто по фильтру → открыть карточку → добавить в избранное.

### Ручное (QA)

- **preview**-сборка раздаётся через EAS (ссылка + QR).
- **Internal Testing** в Google Play Console — до 100 тестировщиков по email.
- Тестирование на реальных устройствах: разные версии Android (API 24+), размеры экранов.

---

## 8. Публикация в сторы

### Google Play — первый релиз (фаза 1–2)

**Подготовка (однократно):**

1. Аккаунт Google Play Developer ($25, одноразово).
2. Создать приложение в Google Play Console (название, описание, скриншоты, иконка).
3. Заполнить Data Safety Form (какие данные собираем).
4. Настроить подпись: EAS управляет ключами автоматически (или upload key вручную).
5. Сгенерировать **Google Service Account JSON** для автоматического сабмита через EAS.

**Конфиг EAS Submit** (добавляется в `eas.json`):

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**Процесс релиза:**

```bash
eas build --profile production --platform android --auto-submit
```

Одна команда: сборка `.aab` в облаке → автоматическая загрузка в Google Play на указанный трек.

### Треки Google Play

```
internal  →  closed (alpha)  →  open (beta)  →  production
```

| Трек | Тестировщики | Ревью Google | Скорость |
|------|-------------|-------------|----------|
| internal | До 100, по email | Нет | Мгновенно |
| closed (alpha) | Приглашённые группы | Лёгкое | Часы |
| open (beta) | Все желающие | Полное | 1–3 дня |
| production | Публичный | Полное | 1–3 дня (первый раз), потом быстрее |

Рекомендация: `internal` → `closed` → `production`. Staged rollout: 10% → 50% → 100%.

### App Store (фаза 3)

- Аккаунт Apple Developer ($99/год).
- App Store Connect: скриншоты, описание, возрастной рейтинг, Privacy Policy URL.
- **TestFlight** для тестирования (аналог Internal Testing).
- EAS Submit: `eas submit --platform ios`.
- Ревью Apple строже (1–7 дней для первого релиза).

---

## 9. OTA-обновления

Для изменений в JS/React-коде (без нативных изменений) — **EAS Update**:

```bash
eas update --branch production --message "fix: search filter bug"
```

| Возможность | Описание |
|------------|---------|
| Bundle diffing | Передаётся только diff (~75% экономия трафика) |
| Staged rollout | `eas update --rollout-percentage=10` — сначала 10% |
| Автооткат | Если обновление крашит до рендера root-компонента, откат автоматический |
| Скорость | Минуты вместо дней — не требует ревью стора |

### Когда нужен полный билд vs OTA

| Полный билд (стор) | Достаточно OTA |
|-------------------|----------------|
| Обновление Expo SDK / React Native | Исправление багов в JS/TS |
| Новый нативный модуль (камера, push) | Новые экраны, компоненты, стили |
| Изменение `app.json` (версия, permissions, splash) | Обновление переводов, бизнес-логики |

---

## 10. CI/CD

### EAS Workflows

Файл `.eas/workflows/deploy.yaml` в `core/mobile/`. Начинаем только с Android (фазы 1–2), iOS-джобы раскомментируются на фазе 3:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  fingerprint:
    name: Check native changes
    steps:
      - uses: expo/fingerprint

  build_android:
    name: Build Android
    needs: [fingerprint]
    if: needs.fingerprint.outputs.changed == 'true'
    steps:
      - uses: eas/build
        with:
          platform: android
          profile: production

  submit_android:
    name: Submit to Google Play
    needs: [build_android]
    steps:
      - uses: eas/submit
        with:
          platform: android
          profile: production

  # --- iOS (раскомментировать на фазе 3) ---
  # build_ios:
  #   name: Build iOS
  #   needs: [fingerprint]
  #   if: needs.fingerprint.outputs.changed == 'true'
  #   steps:
  #     - uses: eas/build
  #       with:
  #         platform: ios
  #         profile: production
  #
  # submit_ios:
  #   name: Submit to App Store
  #   needs: [build_ios]
  #   steps:
  #     - uses: eas/submit
  #       with:
  #         platform: ios
  #         profile: production

  ota_update:
    name: OTA Update
    needs: [fingerprint]
    if: needs.fingerprint.outputs.changed == 'false'
    steps:
      - uses: eas/update
        with:
          branch: production
```

Логика: push в main → fingerprint → если нативный код изменился: сборка + сабмит (сначала только Android, потом обе платформы); если только JS → OTA.

---

## 11. Изменения в веб-версии

### Модалка установки в футере

Текущее поведение: кнопка «Мобильное приложение» открывает модалку с пошаговыми инструкциями по установке PWA (табы iOS/Android).

Файлы:
- `core/frontend/components/pwa/PWAInstallButtonGray.tsx`
- `core/frontend/hooks/usePWAInstall.ts`
- `locales/{en,ro,ru}.json` → секция `pwa`

### Новое поведение (поэтапно)

**Фаза 2 (только Android в сторе):**

| Устройство | Действие при нажатии |
|-----------|---------------------|
| Android (мобильный) | Редирект в Google Play |
| iOS (мобильный) | Старые PWA-инструкции (приложения в App Store ещё нет) |
| Десктоп | Модалка: QR-код (Google Play) + кнопка Google Play |

**Фаза 3 (оба стора):**

| Устройство | Действие при нажатии |
|-----------|---------------------|
| Android (мобильный) | Редирект в Google Play |
| iOS (мобильный) | Редирект в App Store |
| Десктоп | Модалка: QR-код + кнопки Google Play и App Store |

### Конфигурация

В `config/site.ts` добавляется секция:

```typescript
mobileApp: {
  enabled: true,
  androidUrl: 'https://play.google.com/store/apps/details?id=club.kupito.app',
  iosUrl: null,
}
```

| Состояние конфига | Поведение |
|------------------|-----------|
| `enabled = false` | Текущие PWA-инструкции (обратная совместимость) |
| `enabled = true`, `androidUrl` задан, `iosUrl = null` | Фаза 2: Android есть, iOS — PWA-инструкции |
| `enabled = true`, оба URL заданы | Фаза 3: оба стора |

---

## 12. Фазы реализации

### Фаза 1 — Фундамент + Android MVP

**Цель:** рабочее Android-приложение в Google Play (Internal Testing).

**Инфраструктура (сразу под две платформы):**
- Инициализация Expo-проекта в `core/mobile/` (`npx create-expo-app`).
- Кроссплатформенная структура папок: `app/`, `src/`, `assets/`.
- `app.json` с секциями `android` и `ios` (iOS минимально, детализируется позже).
- `eas.json` с профилями `development`, `preview`, `production` для обеих платформ.
- `tsconfig.json`, path aliases, линтинг.
- Расширение скрипта `prepare:build` для копирования локалей и темы в `core/mobile/`.

**API и авторизация (кроссплатформенные):**
- API-клиент на Axios (Bearer, refresh, Accept-Language, X-Request-Id).
- JWT через `expo-secure-store`.
- Хуки: `useAuth`, `useApi`, `useTranslation` — без платформозависимого кода.

**Экраны и навигация:**
- Expo Router: таб-навигация (каталог, избранное, создание объявления, профиль).
- Каталог: список объявлений с фильтрами, поиск, пагинация.
- Карточка объявления: фото-галерея, характеристики, контакт продавца.
- Избранное: список сохранённых.
- Профиль: авторизация/регистрация, мои объявления, настройки.

**Тема и локализация:**
- Тема из `theme/colors.ts`, адаптированная под React Native (без CSS-переменных).
- i18n: `expo-localization` + JSON из корневых `locales/`.

**Тестирование и сборка (Android):**
- Jest + React Native Testing Library.
- EAS Build: `development` (dev-клиент) + `preview` (QA) для Android.
- Ручное тестирование на устройствах.
- Публикация в Google Play Console → **Internal Testing**.

---

### Фаза 2 — Android production

**Цель:** стабильный публичный релиз в Google Play, сбор фидбэка.

**Доработки по результатам тестирования:**
- Фиксы багов, найденных на Internal Testing.
- Оптимизация производительности (списки, изображения, навигация).
- Push-уведомления: `expo-notifications` + FCM + `POST /api/devices` на бэке.

**Публикация:**
- Google Play: Internal → Closed Testing → Production (staged rollout 10% → 50% → 100%).
- EAS Workflows (CI/CD): push → fingerprint → build/OTA.
- OTA-обновления (EAS Update) для быстрых фиксов без ревью.

**Веб-интеграция (первая часть):**
- Модалка в футере: QR-код + кнопка Google Play (iOS — PWA-инструкции).
- `config/site.ts`: `mobileApp.androidUrl` = ссылка на Google Play.

**Сбор фидбэка:**
- Sentry для крашей, Google Play Console для отзывов.
- OTA-фиксы критичных багов (минуты вместо дней на ревью).

---

### Фаза 3 — iOS

**Цель:** выпуск iOS-приложения с учётом опыта Android.

**Подготовка (специфика iOS):**
- Аккаунт Apple Developer ($99/год).
- App Store Connect (скриншоты, описание, возрастной рейтинг, Privacy Policy URL).
- APNs ключ (.p8) для push-уведомлений.

**Адаптация UI под iOS:**
- Тестирование всех экранов на iOS-симуляторе и устройствах.
- Платформозависимые компоненты (при необходимости): `*.ios.tsx`.
- iOS-специфика: Safe Area, Dynamic Island, жесты, анимации.
- Human Interface Guidelines: отступы, шрифты, навигационные паттерны.

**Код менять минимально** — основная работа:
- Заполнение iOS-секций в `eas.json`.
- Тестирование на разных iPhone/iPad (размеры экранов, iOS-версии).
- E2E тесты (Maestro) для iOS.
- TestFlight → ревью Apple → публикация.

**Веб-интеграция (вторая часть):**
- Модалка: кнопка App Store рядом с Google Play.
- `config/site.ts`: `mobileApp.iosUrl` = ссылка на App Store.
- Smart App Banner для iOS Safari (`<meta name="apple-itunes-app">`).
- Deep links / Universal links (`.well-known/apple-app-site-association` на бэке).

---

### Фаза 4 — Зрелость

**Цель:** полный feature parity между вебом и мобильными приложениями.

- Создание/редактирование объявлений с камерой (`expo-image-picker`, `expo-camera`).
- Биометрическая авторизация (`expo-local-authentication`) — Face ID / отпечаток.
- Deep linking с веба в приложение (Firebase Dynamic Links или аналог).
- Оффлайн-режим (кэширование каталога, TanStack Query).
- Виджеты (Android), Live Activities (iOS) — опционально.
- A/B тестирование через EAS Update rollout.

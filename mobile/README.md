# Kupito mobile (Expo)

Android-first клиент к тому же NestJS API, что и веб.

## Запуск

Кратко: поднимите API (`npm run dev` в корне `kupito.club`), затем `npm run dev:mobile` в том же корне.

Пошагово: [docs/TESTING-ru.md](docs/TESTING-ru.md).

```bash
# один раз
npm run mobile:prepare

# API + web (в отдельном терминале)
npm run dev

# приложение
npm run dev:mobile
```

Для эмулятора в `.env`: `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000`. Для телефона в Wi‑Fi — IP вашего Mac/PC в локальной сети.

## EAS

См. [docs/EAS-ANDROID.md](docs/EAS-ANDROID.md).

## Синхронизация с платформой

`npm run prepare:build` в корне `kupito.club` копирует в этот пакет:

- `locales/*.json` → `src/i18n/`
- `theme/*.ts` → `src/theme/synced/` (с правкой импорта цветов)
- типы API из `core/frontend/lib/api/api-types.ts` → `src/synced/`

Не редактируйте файлы в `src/synced/` вручную — они перезаписываются скриптом.

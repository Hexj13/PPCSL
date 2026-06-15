# Telegram Login (OIDC) и cookies сессии

Краткая инструкция для операторов платформы (Moldova / kupito).

## Переменные окружения

**Backend (`core/backend` или сервис API):**

- `TELEGRAM_CLIENT_ID` — Client ID бота из BotFather (Web Login → Client ID). Используется для проверки `aud` в OIDC `id_token`.
- `TELEGRAM_BOT_TOKEN` — токен support-бота (тот же бот или связанный webhook `/api/telegram/webhook`). **Не** используется для Sign-In OIDC, только для support webhook.
- `JWT_SECRET` — секрет подписи JWT (должен совпадать с фронтом для middleware).
- `CORS_ORIGINS` — список origin фронта через запятую, чтобы браузер отправлял `credentials` (cookies) на API.
- `REDIS_HOST` / `REDIS_PORT` — one-time nonce для OIDC (`POST /api/auth/telegram/nonce`).

**Frontend (Next.js):**

- `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` — тот же Client ID (число), публичный для Telegram Login library.
- `JWT_SECRET` — тот же секрет, что на бэке; используется **только на сервере** Next (middleware).

`TELEGRAM_BOT_TOKEN` и Client Secret **не** публикуйте на фронтенд.

При build, если задан `NEXT_PUBLIC_TELEGRAM_CLIENT_ID`, `check-env.js` требует `TELEGRAM_CLIENT_ID`.

## BotFather

1. Используйте бота, который представляет приложение (рекомендуется тот же support-бот с узнаваемым именем и аватаром).
2. В [@BotFather](https://t.me/BotFather) откройте **Bot Settings → Web Login**.
3. Добавьте **Allowed URLs** для вашего сайта (origin, например `https://kupito.club`). Без этого popup Login не завершится.
4. Сохраните **Client ID** (и Client Secret — только если позже понадобится server-side code exchange; текущий flow проверяет `id_token` через JWKS).

Webhook поддержки (`/api/telegram/webhook`) остаётся отдельным механизмом.

## Поведение в приложении

- На `/sign` загружается **Telegram Login library** (`https://oauth.telegram.org/js/telegram-login.js?5`), если задан `NEXT_PUBLIC_TELEGRAM_CLIENT_ID`.
- По клику на кастомную кнопку «Продолжить с Telegram»:
  1. фронт запрашивает `POST /api/auth/telegram/nonce`;
  2. открывается popup `Telegram.Login.auth` с `request_access: ['phone']` и server-issued `nonce`;
  3. callback возвращает `id_token`;
  4. фронт вызывает `POST /api/auth/telegram` с `{ idToken, nonce, termsAccepted, type? }`.
- Бэкенд:
  - проверяет подпись JWT через JWKS `https://oauth.telegram.org/.well-known/jwks.json`;
  - проверяет `iss`, `aud`, `exp`, `nonce` в токене и one-time nonce в Redis;
  - при успехе выставляет httpOnly cookies `kupito_access_token` и `kupito_refresh_token` (как при Google).
- Если пользователь разрешил доступ к телефону и Telegram вернул `phone_number` в `id_token`, номер нормализуется и сохраняется с `phoneVerified: true` — SMS-гейт **пропускается**.
- Если телефон не выдан или занят другим аккаунтом:
  - без телефона — редирект на `/complete-profile?mode=phone_required&source=telegram_register`;
  - конфликт номера — `errors.phoneAlreadyExists` (без автослияния аккаунтов).
- На вкладке **регистрации** в теле запроса передаётся выбранный `type` (`Individual` | `Business`); на вкладке входа тип не отправляется.

### Идентичность аккаунта

- Идентификатор входа — `telegram_id` (из claim `id` / `sub`). `preferred_username` может меняться.
- Автопривязка к существующему Google/phone-аккаунту **не** выполняется.
- Существующему Telegram-аккаунту без телефона номер из OIDC добавляется только если у пользователя ещё нет другого подтверждённого номера.

### Вход по паролю для Telegram-only аккаунтов

- Аккаунты без пароля: попытка входа email/телефон + пароль → `errors.useTelegramSignIn` (или `errors.useSocialSignIn` для прочих провайдеров).

## Локальная разработка (без BotFather)

В `NODE_ENV=development` на `/sign` показывается **dev-кнопка Telegram** вместо OIDC popup. Клик вызывает `POST /api/auth/dev/telegram` (эндпоинт недоступен в `production` и `stage`).

- BotFather и Allowed URLs для localhost **не нужны**.
- Создаётся/логинится тестовый пользователь с `telegram_id = 900000001`.
- Дальше тот же флоу: cookies, редирект на `phone_required`, SMS-код `000000` в dev.

`NEXT_PUBLIC_TELEGRAM_CLIENT_ID` для dev-мока **не обязателен** — кнопка видна автоматически при `npm run dev`.

## Проверка

1. Задать `TELEGRAM_CLIENT_ID` и `NEXT_PUBLIC_TELEGRAM_CLIENT_ID`, добавить Allowed URLs в BotFather.
2. `npm run prepare:build`, поднять API (с Redis), Next, открыть `/sign`, проверить вход через Telegram.
3. С разрешением телефона — пользователь должен попасть в приложение без `phone_required`.

## Частые проблемы

- **Кнопка Telegram не появляется** — проверить `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` (только цифры) и что скрипт `oauth.telegram.org` не блокируется CSP.
- **401 / telegramSignInFailed** — неверный Client ID, nonce уже использован, невалидный `id_token`, или домен не в Allowed URLs.
- **telegramSignInUnavailable** — на API не задан `TELEGRAM_CLIENT_ID`.
- **telegramAuthExpired** — просроченный nonce или `id_token`.
- **Popup не открывается** — проверить `Cross-Origin-Opener-Policy: same-origin-allow-popups` (уже настроено в Next).
- **CORS / cookies** — см. [AUTH_COOKIE_SESSION.md](./AUTH_COOKIE_SESSION.md) и [GOOGLE_OAUTH_SETUP_RU.md](./GOOGLE_OAUTH_SETUP_RU.md).

## Связанные документы

- Cookie-сессия: [AUTH_COOKIE_SESSION.md](./AUTH_COOKIE_SESSION.md)
- Onboarding gates: [auth-onboarding-gates.md](../features/auth-onboarding-gates.md)
- Support-бот (webhook): [DEPLOYMENT.md](./DEPLOYMENT.md) § Telegram

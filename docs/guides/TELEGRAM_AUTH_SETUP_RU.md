# Telegram Login (Login Widget) и cookies сессии

Краткая инструкция для операторов платформы (отдельный бот и `/setdomain` на каждую платформу).

Вход реализован через **Telegram Login Widget**: Telegram возвращает данные пользователя
(`id`, `first_name`, `last_name`, `username`, `photo_url`, `auth_date`, `hash`), а бэкенд
проверяет их подлинность по HMAC-SHA256 с использованием токена бота. OIDC `id_token` не используется.

## Переменные окружения

**Backend (`core/backend` или сервис API):**

- `TELEGRAM_BOT_TOKEN` — токен бота из BotFather. Используется для проверки `hash` Login Widget
  (`secret = SHA256(bot_token)`) и, если настроен support webhook, для `/api/telegram/webhook`.
- `JWT_SECRET` — секрет подписи JWT (должен совпадать с фронтом для middleware).
- `CORS_ORIGINS` — список origin фронта через запятую, чтобы браузер отправлял `credentials` (cookies) на API.

**Frontend (Next.js):**

- `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` — числовой id бота (`bot_id`), публичный для Telegram Login library.
- `JWT_SECRET` — тот же секрет, что на бэке; используется **только на сервере** Next (middleware).

`TELEGRAM_BOT_TOKEN` **не** публикуйте на фронтенд.

При build, если задан `NEXT_PUBLIC_TELEGRAM_CLIENT_ID`, `check-env.js` требует `TELEGRAM_BOT_TOKEN`.

## BotFather

1. Создайте (или выберите) бота для **Login Widget** этой платформы.
2. В [@BotFather](https://t.me/BotFather) привяжите домен сайта командой `/setdomain` (например `example.com`). **Один домен на бота** — нельзя повесить два продакшен-домена разных платформ на один и тот же bot id. Без привязанного домена popup Login не завершится.
3. **Login Widget и support-бот — отдельные решения.** Widget только аутентифицирует; support-бот дополнительно требует `TELEGRAM_SUPPORT_CHAT_ID` и webhook и отвечает пользователям. Можно использовать один токен для обоих на одной платформе, но это не обязательно — разные боты тоже нормальны. Не смешивайте `/setdomain` и support-конфиг чужой платформы.

Webhook поддержки (`/api/telegram/webhook`) остаётся отдельным механизмом; если используете тот же бот, нужен тот же `TELEGRAM_BOT_TOKEN`.

## Поведение в приложении

- На `/sign` загружается **Telegram Login library** (`https://oauth.telegram.org/js/telegram-login.js?5`), если задан `NEXT_PUBLIC_TELEGRAM_CLIENT_ID`.
- По клику на кастомную кнопку «Продолжить с Telegram»:
  1. открывается popup `https://oauth.telegram.org/auth` с `client_id` (bot_id) и `origin` сайта;
  2. после авторизации Telegram через `postMessage` возвращает объект пользователя Login Widget с полем `hash`;
  3. фронт вызывает `POST /api/auth/telegram` с `{ id, first_name?, last_name?, username?, photo_url?, auth_date, hash, termsAccepted, type? }`.
- Бэкенд:
  - строит `data_check_string` из всех полей кроме `hash`, отсортированных по ключу, в формате `key=value` через `\n`;
  - сравнивает `HMAC_SHA256(data_check_string, SHA256(bot_token))` с `hash` (constant-time);
  - проверяет свежесть `auth_date` (не старше 24 часов, с допуском на расхождение часов);
  - при успехе выставляет httpOnly cookies `ppcsl_access_token` и `ppcsl_refresh_token` (как при Google).
- Login Widget **не** возвращает номер телефона, поэтому новый пользователь всегда проходит верификацию телефона:
  редирект на `/complete-profile?mode=phone_required&source=telegram_register`.
- На вкладке **регистрации** в теле запроса передаётся выбранный `type` (`Individual` | `Business`); на вкладке входа тип не отправляется.

### Идентичность аккаунта

- Идентификатор входа — `telegram_id` (поле `id`). `username` может меняться.
- Автопривязка к существующему Google/phone-аккаунту **не** выполняется.

### Вход по паролю для Telegram-only аккаунтов

- Аккаунты без пароля: попытка входа email/телефон + пароль → `errors.useTelegramSignIn` (или `errors.useSocialSignIn` для прочих провайдеров).

## Локальная разработка (без BotFather)

В `NODE_ENV=development` на `/sign` показывается **dev-кнопка Telegram** вместо popup. Клик вызывает `POST /api/auth/dev/telegram` (эндпоинт недоступен в `production` и `stage`).

- BotFather и привязка домена для localhost **не нужны**.
- Создаётся/логинится тестовый пользователь с `telegram_id = 900000001`.
- Дальше тот же флоу: cookies, редирект на `phone_required`, SMS-код `000000` в dev.

`NEXT_PUBLIC_TELEGRAM_CLIENT_ID` для dev-мока **не обязателен** — кнопка видна автоматически при `npm run dev`.

## Проверка

1. Задать `TELEGRAM_BOT_TOKEN` (backend) и `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` (frontend), привязать домен в BotFather (`/setdomain`).
2. `npm run prepare:build`, поднять API, Next, открыть `/sign`, проверить вход через Telegram.
3. Новый пользователь без сохранённого телефона должен попасть на `phone_required`.

## Частые проблемы

- **Кнопка Telegram не появляется** — проверить `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` (только цифры) и что скрипт `oauth.telegram.org` не блокируется CSP.
- **401 / telegramSignInFailed** — несовпадение `hash` (неверный `TELEGRAM_BOT_TOKEN`), или домен не привязан в BotFather (`/setdomain`).
- **telegramSignInUnavailable** — на API не задан `TELEGRAM_BOT_TOKEN`.
- **telegramAuthExpired** — устаревший `auth_date` (повторите вход).
- **Popup не открывается** — проверить `Cross-Origin-Opener-Policy: same-origin-allow-popups` (уже настроено в Next).
- **CORS / cookies** — см. [AUTH_COOKIE_SESSION.md](./AUTH_COOKIE_SESSION.md) и [GOOGLE_OAUTH_SETUP_RU.md](./GOOGLE_OAUTH_SETUP_RU.md).

## Связанные документы

- Cookie-сессия: [AUTH_COOKIE_SESSION.md](./AUTH_COOKIE_SESSION.md)
- Onboarding gates: [auth-onboarding-gates.md](../features/auth-onboarding-gates.md)
- Support-бот (webhook): [DEPLOYMENT.md](./DEPLOYMENT.md) § Telegram

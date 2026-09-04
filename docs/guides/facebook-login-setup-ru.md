# Facebook Login и cookies сессии

Краткая инструкция для операторов платформы (отдельное Meta App / Facebook Login product на каждую платформу / домен).

## Переменные окружения

**Backend (`core/backend` или сервис API):**

- `FACEBOOK_APP_ID` — App ID из Meta Developer Console (должен совпадать с публичным App ID на фронте).
- `FACEBOOK_APP_SECRET` — App Secret (только на API; никогда не публиковать на фронте).
- `JWT_SECRET` — секрет подписи JWT (должен совпадать с фронтом для middleware).
- `CORS_ORIGINS` — список origin фронта через запятую, чтобы браузер отправлял `credentials` (cookies) на API.

**Frontend (Next.js):**

- `NEXT_PUBLIC_FACEBOOK_APP_ID` — тот же App ID (публичный). **Должен посимвольно совпадать с `FACEBOOK_APP_ID` на API**.
- `JWT_SECRET` — тот же секрет, что на бэке; используется **только на сервере** Next (middleware).

Frontend-сервису нужен только `NEXT_PUBLIC_FACEBOOK_APP_ID`; не передавайте ему `FACEBOOK_APP_SECRET`. Backend validation требует `FACEBOOK_APP_ID` и `FACEBOOK_APP_SECRET` парой. При общей сборке `core/scripts/check-env.js` также проверяет совпадение публичного и backend App ID, когда заданы оба.

## Meta Developer Console

1. Создайте приложение типа Consumer / Business → добавьте продукт **Facebook Login**.
2. **App Domains** и **Valid OAuth Redirect URIs** / Allowed Domains for JavaScript SDK: продакшен-домены платформы (apex и `www`) и `localhost` для разработки.
3. Permissions: `public_profile`, `email`. Для Live mode / внешних пользователей обычно нужен **App Review** для `email`.
4. В Development mode вход работает только для Roles / Test Users.
5. Privacy Policy URL и Terms URL — страницы `/privacy` и `/terms` платформы.

## Поведение в приложении

- Скрипт `https://connect.facebook.net/en_US/sdk.js` подключается на `/sign` при наличии `NEXT_PUBLIC_FACEBOOK_APP_ID`.
- Кнопка вызывает `FB.login` со scope `email,public_profile`; access token уходит в `POST /api/auth/facebook`.
- Бэкенд проверяет токен через Graph `debug_token` (app_id + `is_valid`) и `GET /me?fields=id,email,first_name,last_name` с `appsecret_proof`.
- Email обязателен: если Meta не отдала email → `errors.facebookEmailRequired`. Meta не предоставляет надёжный признак `email_verified`, поэтому полученный email сохраняется неподтверждённым.
- Cookies сессии и phone gate — как у Google: новый пользователь → `/complete-profile?mode=phone_required&source=facebook_register`.
- На вкладке регистрации передаётся `type` (`Individual` | `Business`); на вкладке входа — нет.
- Запросы с `/sign` используют `X-Skip-Error-Handling` и `X-Skip-Auth-Redirect`.

### Учётные записи

`FacebookSignInUseCase` ищет аккаунт по `facebookId`. Автоматической привязки по совпавшему email нет: Meta не предоставляет надёжный признак владения email, поэтому совпадение с существующим аккаунтом возвращает `errors.facebookEmailAlreadyExists`. Self-delete освобождает `facebookId`; admin deactivate возвращает `errors.userDeactivated`.

## Проверка

1. Задать env, `npm run prepare:build`, поднять API и Next, открыть `/sign`, войти тестовым Facebook-пользователем, пройти SMS phone gate.

## Частые проблемы

- **Нет кнопки** — не задан `NEXT_PUBLIC_FACEBOOK_APP_ID` или SDK заблокирован.
- **401 после popup** — несовпадение App ID / Secret, App не в Live, domain не в allowlist, `CORS_ORIGINS`.
- **facebookEmailRequired** — у аккаунта Facebook нет email или permission `email` не выдан / не прошёл App Review.
- **facebookEmailAlreadyExists** — email уже принадлежит существующему аккаунту; войдите его текущим способом.
- **COOP** — на `/sign` должен быть `Cross-Origin-Opener-Policy: same-origin-allow-popups` (уже в core).

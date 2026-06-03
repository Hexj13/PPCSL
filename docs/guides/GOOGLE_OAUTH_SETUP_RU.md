# Google OAuth (GIS) и cookies сессии

Краткая инструкция для операторов платформы (Moldova / kupito).

## Переменные окружения

**Backend (`core/backend` или сервис API):**

- `GOOGLE_CLIENT_ID` — OAuth 2.0 Client ID типа Web application (тот же Client ID, что и у фронта, без префикса `NEXT_PUBLIC_`).
- `JWT_SECRET` — секрет подписи JWT (должен совпадать с фронтом для middleware).
- `CORS_ORIGINS` — список origin фронта через запятую (например `https://kupito.club,https://www.kupito.club`), чтобы браузер отправлял `credentials` (cookies) на API.

**Frontend (Next.js):**

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — тот же Client ID (публичный).
- `JWT_SECRET` — тот же секрет, что на бэке; используется **только на сервере** Next (middleware) для проверки claim `phoneVerified` в access-cookie. Не добавляйте префикс `NEXT_PUBLIC_` для этого значения.

## Google Cloud Console

1. APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
2. Authorized JavaScript origins: URL сайта (и `http://localhost:3000` для локальной разработки).
3. Authorized redirect URIs для GIS с кнопкой One Tap обычно не обязательны; важны **JavaScript origins**.
4. OAuth consent screen: домен, политика конфиденциальности, scopes по умолчанию (email, profile) согласно требованиям Google.

## Поведение в приложении

- Скрипт `https://accounts.google.com/gsi/client` подключается на странице `/sign` (вкладки вход и регистрация). Инициализация GIS (`initialize` / `renderButton`) выполняется **после** `onReady` этого скрипта (Next.js `Script`) и при наличии `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; иначе кнопка не появится. До готовности кнопки показывается skeleton; при remount проверяется `window.google?.accounts?.id`.
- После успеха GIS фронт вызывает `POST /api/auth/google` с полем `idToken`; бэкенд проверяет токен через `google-auth-library`, выставляет httpOnly cookies `kupito_access_token` и `kupito_refresh_token` (path у refresh — `/api/auth`).
- Дальнейшие запросы API идут с `withCredentials: true`; access JWT содержит `phoneVerified`; без подтверждённого телефона пользователь перенаправляется на `/complete-profile?mode=phone_required` (middleware + клиентский guard). Для юр. лица без названия компании в профиле действует отдельный клиентский гард на `/complete-profile?mode=business_onboarding` (см. [auth-onboarding-gates.md](../features/auth-onboarding-gates.md)).

## Проверка

1. Локально: задать переменные, `npm run prepare:build`, поднять API и Next, открыть `/sign`, проверить вход через Google и сценарий с SMS на телефон.

## Частые проблемы

- **CORS / cookies не приходят** — проверить `CORS_ORIGINS` и что фронт обращается к API с того же «семейства» origin, что в списке; в ответах должны быть `Access-Control-Allow-Credentials: true`.
- **Middleware не видит `phoneVerified`** — на фронт-сервисе должен быть задан тот же `JWT_SECRET`, что и у Nest JWT.
- **401 после логина** — проверить, что refresh-cookie доступен на пути `/api/auth` и что клиент не блокирует third-party cookies (для SameSite=Lax обычно достаточно same-site запросов к API).
- **Нет кнопки Google при заданном `NEXT_PUBLIC_GOOGLE_CLIENT_ID`** — убедиться, что скрипт GIS реально загрузился (сеть / блокировщики); инициализация привязана к `onReady` скрипта. Если skeleton не исчезает, проверить блокировку `accounts.google.com` и консоль на ошибки GIS.
- **Зависание на `https://accounts.google.com/gsi/transform`** — popup GIS не завершил обмен с сайтом; callback в приложении не вызывается, запрос `POST /api/auth/google` в Network не появляется. Проверить по шагам:
  1. **Authorized JavaScript origins** в Google Cloud Console: точное совпадение origin страницы (`https://kupito.club`, при необходимости `https://www.kupito.club`; для локали префикс `/ru` не меняет origin).
  2. **Заголовок COOP** на `/sign`: должен быть `Cross-Origin-Opener-Policy: same-origin-allow-popups`, не `same-origin` (строгий `same-origin` ломает связь popup ↔ страница). Проверка после деплоя: `curl -sS -I https://kupito.club/sign | grep -i cross-origin-opener-policy`
  3. **DevTools → Network** после выбора аккаунта Google: если `POST /api/auth/google` нет — проблема до бэкенда (GIS, origins, COOP, блокировщики). Если POST есть и 401 — `GOOGLE_CLIENT_ID` на API и совпадение с `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, плюс `CORS_ORIGINS`.
  4. Консоль на `/sign` и в popup: ошибки GIS (`origin_mismatch`, FedCM, `postMessage`).

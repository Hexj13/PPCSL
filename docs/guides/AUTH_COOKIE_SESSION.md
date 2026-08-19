# Auth cookies and environment

Session tokens are issued as `httpOnly` cookies (`ppcsl_access_token`, `ppcsl_refresh_token`). JSON responses from `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/google`, `POST /api/auth/facebook`, `POST /api/auth/telegram`, and `POST /api/auth/verify-phone` return only the `user` payload (and OAuth-specific flags) without token fields.

`POST /api/auth/change-password` revokes all refresh tokens except the current browser’s refresh cookie (other sessions end; cookies are not cleared). `POST /api/auth/reset-password` revokes refresh tokens and clears session cookies. Access JWTs already issued remain valid until their expiry; see [auth-jwt-invalidation-followup.md](../architecture/auth-jwt-invalidation-followup.md) for a planned hardening PR.

Deploying Google Sign-In requires both `GOOGLE_CLIENT_ID` (NestJS) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Next.js build) with the same Web client ID. Next.js middleware validates the access cookie using `JWT_SECRET`; set the same secret as the backend JWT signing secret. Account lookup, self-delete vs admin deactivate, and register-tab `type` are documented in [GOOGLE_OAUTH_SETUP_RU.md](./GOOGLE_OAUTH_SETUP_RU.md) (operators) and summarized under Authentication in [backend-overview.md](../architecture/backend-overview.md).

`POST /api/auth/google`, `POST /api/auth/facebook`, and `POST /api/auth/telegram` from `/sign` use `X-Skip-Error-Handling` and `X-Skip-Auth-Redirect` so the global Axios interceptor does not duplicate toasts; see [frontend-api-error-handling.md](./frontend-api-error-handling.md).

Beyond `phoneVerified`, the SPA may enforce an extra **business company** step for verified Business users without `companyName` (client redirect to `/complete-profile?mode=business_onboarding`). That gate is not encoded in the JWT; see [auth-onboarding-gates.md](../features/auth-onboarding-gates.md).

After migrating guests from legacy `localStorage` tokens to cookies, users were signed out once and must log in again.

## Guest refresh and `401`

`POST /api/auth/refresh` with response `errorKey: errors.unauthorized` means the request had no refresh token (neither `ppcsl_refresh_token` cookie nor `refresh_token` in JSON). The app calls refresh after `GET /api/auth/me` fails (`initAuth` in the auth store, invoked from `AuthProvider` on load and after cross-tab `auth-storage` storage events) and when the Axios interceptor retries a `401` on a protected request. Guests without a session therefore hit this endpoint regularly. That is expected and not a backend bug.

For cookies to be sent from the browser, the page origin must be allowed by backend CORS (`CORS_ORIGINS` or `FRONTEND_URL` in Nest) and the frontend must call the API with credentials (`NEXT_PUBLIC_API_URL` must match the API origin you use in the browser).

### Render `*.onrender.com` and the Public Suffix List

Auth cookies are **host-only** with `sameSite: 'lax'`. That works when the site and API share a registrable domain (e.g. `https://example.com` + `https://api.example.com`).

`onrender.com` is on the [Public Suffix List](https://publicsuffix.org/), so two services such as `platform-frontend.onrender.com` and `platform-backend.onrender.com` are **cross-site**. Host-only Lax cookies set by the API are **not** sent on credentialed requests from the frontend. Telegram Login Widget `/setdomain` is likewise limited to one domain per bot and cannot cover both Render subdomains usefully.

**Implication:** smoke-test pages and `/health` on Render URLs if needed, but **auth acceptance (login, Google, Telegram, session survival) requires custom domains** attached to both frontend and API. Keep `NEXT_PUBLIC_NOINDEX=true` until that cutover. See [platform-checklist.md](./platform-checklist.md) §13.

## Client refresh behavior

- **`initAuth`** (auth store, invoked from `AuthProvider` on load and after cross-tab `storage` on auth keys) is idempotent: concurrent calls share one in-flight promise.
- **`GET /api/auth/me` during init** uses `X-Skip-Auth-Refresh` so a `401` does not trigger the Axios interceptor refresh before `refreshQuiet` runs.
- **`POST /api/auth/refresh`** goes through `refreshAuthSession()` in `api-client.ts`: one shared promise for concurrent refresh calls, `X-Skip-Auth-Refresh` on the request, no interceptor retry on `429` for that URL.
- Protected requests that receive `401` still use the interceptor queue and `refreshAuthSession()` before retrying the original request.

# Auth cookies and environment

Session tokens are issued as `httpOnly` cookies (`kupito_access_token`, `kupito_refresh_token`). JSON responses from `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/google`, and `POST /api/auth/verify-phone` return only the `user` payload (and Google-specific flags) without token fields.

Deploying Google Sign-In requires both `GOOGLE_CLIENT_ID` (NestJS) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (Next.js build) with the same Web client ID. Next.js middleware validates the access cookie using `JWT_SECRET`; set the same secret as the backend JWT signing secret.

After migrating guests from legacy `localStorage` tokens to cookies, users were signed out once and must log in again.

## Guest refresh and `401`

`POST /api/auth/refresh` with response `errorKey: errors.unauthorized` means the request had no refresh token (neither `kupito_refresh_token` cookie nor `refresh_token` in JSON). The app calls refresh after `GET /api/auth/me` fails (`initAuth` in the auth store, invoked from `AuthProvider` on load and after cross-tab `auth-storage` storage events) and when the Axios interceptor retries a `401` on a protected request. Guests without a session therefore hit this endpoint regularly. That is expected and not a backend bug.

For cookies to be sent from the browser, the page origin must be allowed by backend CORS (`CORS_ORIGINS` or `FRONTEND_URL` in Nest) and the frontend must call the API with credentials (`NEXT_PUBLIC_API_URL` must match the API origin you use in the browser).

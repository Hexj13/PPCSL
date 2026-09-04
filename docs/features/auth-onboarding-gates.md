---
title: Auth onboarding gates (phone and business profile)
owner: platform
tags:
  - type/feature
  - domain/auth
  - scope/core
  - status/active
---

# Auth onboarding gates

Short reference for **mandatory steps** before a signed-in user can use the marketplace UI.

## Phone not verified

- **Middleware** (Next.js): reads access JWT; if `phoneVerified` is not `true`, redirects to `/complete-profile?mode=phone_required` with optional `returnUrl`.
- **Client:** `PhoneRequiredGuard` in root layout aligns with the same rule for client navigations.
- **Exempt paths:** `lib/phone-verification-paths.ts` (`/sign`, `/verify-phone`, `/complete-profile`, legal pages, etc.).
- **Browser Back on `phone_required`:** `CompleteProfilePhoneGate` traps history back (`useHistoryBackClose`). Leaving the mandatory phone step always calls `logout()` and `replace` to `/sign` (with `returnUrl` when present) so the user is not left signed in without a verified phone. It additionally calls `DELETE /api/auth/profile` to discard the half-created account **only for an in-progress OAuth signup** — detected by `isOAuthPhoneRequiredSignupFlow`, i.e. a `source=google_register`/`source=telegram_register`/`source=facebook_register` query param or the saved signup session context (`oauthPhoneRequiredContext`). Existing OAuth-only users re-verifying a phone are logged out without deletion.
- **Back on OAuth `phone_required`:** Gray **Back** on the phone gate runs the same exit path as browser back. The button is shown for OAuth signups and for existing OAuth-only users (no password); account deletion still happens only for the signup case described above.

## Business account without company name

Applies when `user.type === 'Business'`, phone is verified, and `companyName` is empty (after trim).

- **Client:** `BusinessOnboardingGuard` in root layout redirects to `/complete-profile?mode=business_onboarding` (with `returnUrl`) until `companyName` is saved via profile update.
- **Exempt paths:** `lib/business-onboarding-gate.ts` (sign, login, register, verify-phone, legal pages, etc.). `/complete-profile` is not blanket-exempt: only `mode=business_onboarding` avoids redirect while the gate is active.
- **Middleware** does not encode company completion; the gate is client-side only (JWT does not carry `companyName`).

## `complete-profile` modes

| Query `mode` | When shown |
| --- | --- |
| `phone_required` | User must confirm phone (SMS flow). |
| `business_onboarding` | Business user must submit required company fields (at least company name). |
| (default / standard) | Optional name/contact completion for users who already passed the gates above. |

## Verify-phone → next URL

After successful SMS verification in the “complete profile” flow, the client navigates to `business_onboarding` when the selected account type is Business (query `selectedType` is carried through verify-phone). Password registration with business type already stores company name at signup, so this path mainly affects OAuth / flows without company name in DB.

Post-auth steps (verify-phone success, complete-profile gates, business onboarding finish, pending saved filter) use **client-side navigation** (`router.replace` via `useLocalizedNavigation`) rather than `window.location` full reloads, so auth state in the Zustand store stays warm and intermediate blank screens are avoided. Direct visits or hard refreshes on `/complete-profile` show `CompleteProfilePageLoader` while `AuthProvider` resolves the session.

### Phone number in URL (privacy)

For `complete-profile` and reserved `post-register` flows, the phone number is stored in **`sessionStorage`** via `lib/verify-phone-context.ts` (`saveVerifyPhoneContext` / `loadVerifyPhoneContext`). Navigation to `/verify-phone` uses `buildVerifyPhoneSearchParams()` with `mode`, `returnUrl`, `source`, and `selectedType` only — not `phone` in the query string. Legacy links with `?phone=` are migrated on load and stripped from the address bar. Context is cleared after successful verification (`clearVerifyPhoneContext`). Profile phone-change flows may still pass `phone` in the URL until migrated separately.

## API: profile `type` while phone unverified

`PATCH` profile (see `UserProfilePatchService`) allows changing `type` (`Individual` | `Business`) only while `phoneVerified` is false, so the account kind can be corrected before SMS confirmation.

## Profile password (Google-only accounts)

- **`hasPassword`** on `GET /api/auth/me` / `PATCH /api/auth/profile` — whether the user has a password hash (not the hash itself).
- **No password yet:** `/profile` shows set-password UI (new field only). `POST /api/auth/change-password` with `{ newPassword }` only.
- **Password set:** standard change-password UI (current + new). Google Sign-In and email/phone + password login both work.
- Save enables when the new password passes client rules; other profile fields (e.g. invalid company website) do not block password-only submit.

OAuth providers (Google, Telegram) without a password use the same set-password flow. Telegram registration sets `telegram: true` on the user profile. The Telegram Login Widget does not return a phone number, so new Telegram users are always sent to `phone_required` like Google signup.

## Related docs

- Google GIS and env: [google-oauth-setup-ru.md](../guides/google-oauth-setup-ru.md)
- Telegram Login (Login Widget) and env: [telegram-auth-setup-ru.md](../guides/telegram-auth-setup-ru.md)
- Cookies and JWT alignment: [auth-cookie-session.md](../guides/auth-cookie-session.md)
- E2E login helper: [e2e-playwright-standards.md](../guides/e2e-playwright-standards.md) (`loginByUi` throws if mandatory profile URL is hit)

---
title: Platform checklist
owner: platform
tags:
  - type/guide
  - domain/platform
  - scope/core
  - status/active
---

# Platform creation checklist

Checklist for launching a new platform on PPCSL core.

Written against the second platform launch (MakinaGuru, Albania) after Kupito (Moldova). Items marked **gotcha** cost real debugging time — read them before you hit them.

## Before you start

- [multi-repository.md](../architecture/multi-repository.md) — Overall architecture
- [scripts-architecture.md](../architecture/scripts-architecture.md) — Scripts architecture
- [known-issues.md](../architecture/known-issues.md) — Known issues
- [platform-guide.md](./platform-guide.md) — Where to make changes, analytics config
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Render and Namecheap steps

---

## Platform repository structure

```
platform-repo/
├── assets/                    # Graphics
│   ├── frontend/
│   │   └── public/           # Logos, icons, favicon, OG images
│   └── backend/
│       └── watermark/        # Watermark for photos
├── config/
│   ├── site.ts               # Platform config
│   ├── legal.ts              # Terms + Privacy content
│   ├── faq.ts, faq-data-*.ts # FAQ content
│   └── parsers.ts            # Partner parser catalog (empty = none)
├── locales/
│   ├── {lang}.json           # Frontend translations
│   └── backend/{lang}.json   # Backend translations
├── theme/
│   └── colors.ts             # Color scheme
├── core/                      # PPCSL submodule
├── package.json
└── README.md
```

`npm run prepare:build` (see `scripts/sync-platform-to-core.cjs`) copies the overlay over `core/`, **replacing whole files** — it is not a merge. Anything not present in the overlay keeps the core version.

---

## Which resources are separate per platform

Rule of thumb: **separate anything with state, quota, branding, or access scope. Share only billing and ownership.**

| Resource | Separate? | Notes |
|---|---|---|
| PostgreSQL, Redis | **Separate** | Never share between platforms |
| S3 bucket | **Separate bucket** | Not a folder — see gotcha below |
| GA4 property | **Separate** | Platform rule: never one property for two platforms |
| GTM container | **Separate** | Requires `NEXT_PUBLIC_GTM_ID` |
| Search Console | **Separate** resource | |
| Google Cloud project | **Separate**, same billing account | Holds OAuth client + Gemini key |
| Gemini API key | **Separate** | Quotas are per Cloud project |
| Sentry projects | **Separate** (frontend + backend), same org | See gotcha below |
| Twilio | **Subaccount** under the same parent | Own Messaging Service per country |
| SMTP / mailbox | **Separate** | Own domain, own SPF/DKIM/DMARC |
| Google account | **Shared** | One login can own many properties; separate account only for a separate legal entity |
| AWS account | **Shared** | Separate IAM user per platform |
| Render workspace | **Shared** | Separate services |
| FXRatesAPI key | **Shared is fine** | One request per day; no quota concern |

**Gotcha — S3 must be a separate bucket, not a prefix.** Object keys are flat (`uploads/{uuid}.webp`) and there is no tenant prefix setting; the bucket name is the only separation point (`AWS_S3_BUCKET_NAME` in `core/backend/src/upload/upload.service.ts`). Also `src/scripts/production/upload-robots-txt.ts` writes `robots.txt` to the **bucket root**, so a shared bucket means one platform overwrites the other's `robots.txt`.

**Gotcha — Sentry needs separate projects, not just environments.** All platforms run the same core code, and Sentry groups issues by stack trace fingerprint. In a shared project, identical exceptions from different platforms merge into one issue and resolving it closes it for both. `SENTRY_ENVIRONMENT` is a filter, not a grouping boundary.

**Gotcha — Gemini quotas are per Cloud project.** A shared key means a traffic spike on one platform returns 429 on the other, and spend cannot be attributed. Remember to attach billing to the new project or the key stays on the free tier.

---

## Checklist

### 1. Infrastructure

- [ ] Domain registered (Namecheap)
- [ ] Git repository created
- [ ] PPCSL core added as submodule
- [ ] Folder structure created (`assets/`, `config/`, `locales/`, `theme/`)

### 2. Long lead time — start these first

External parties gate these; everything else waits on nobody.

- [ ] **Twilio sender ID for the country** — some countries require alphanumeric sender registration, which takes weeks. Fall back to a plain number (`TWILIO_FROM_NUMBER`) if not ready
- [ ] **Mailbox for `support@` and `noreply@`** plus SMTP credentials
- [ ] Any partner agreements (vehicle history provider, etc.)

### 3. Configuration (`config/site.ts`)

- [ ] `country` code set
- [ ] Platform `name` set — used as OG `siteName` and in emails
- [ ] `domain` set
- [ ] `locale` set
- [ ] `localeRouting` set (default locale, supported locales, prefixed locales)
- [ ] `currency` and `currencies` set
- [ ] `countryCode` for phones set
- [ ] `supportEmail` set — **must be a real mailbox**, it appears in FAQ, legal texts and email footers
- [ ] `siteUrl` set
- [ ] `assetVersion` updated when public assets change
- [ ] `footerPartners` configured, or left empty to hide the block
- [ ] `socialLinks` configured, or left empty to hide the block
- [ ] `reportProvider` — omit entirely to hide the vehicle-history section

### 4. Content (`locales/`, `config/legal.ts`, `config/faq*.ts`)

There is **no admin panel or database** for FAQ, footer and legal pages — all of it is overlay files synced by `prepare:build`. No seeding required.

- [ ] Frontend translations for every supported locale
- [ ] Backend translations in `locales/backend/`
- [ ] Legal documents (Terms, Privacy) in `config/legal.ts` for every locale
- [ ] FAQ content in `config/faq-data-{lang}.ts` and wired in `config/faq.ts`
- [ ] Subprocessor list in the privacy policy matches the services actually used
- [ ] Cookie table matches the cookies actually set
- [ ] Key structure identical across shipped locale files

Footer links themselves are hardcoded in `core/frontend/components/layout/Footer/FooterSitemap.tsx`; the overlay supplies labels only.

### 5. Theme (`theme/colors.ts`)

- [ ] Colors set
- [ ] TailwindCSS compatibility verified

### 6. Graphics (`assets/`)

Frontend (`assets/frontend/public/`):

- [ ] `logo.png`, `logo-desktop.*`, `logo-mobile.*`
- [ ] Favicons (16, 32, 64, 192, 512px) and `favicon.ico`
- [ ] PWA icon `pwa192.png`
- [ ] `og-image.jpg` and `opengraph-image.png` (1200x630)
- [ ] `partners/` assets for every `footerPartners[].logoSrc`

Backend (`assets/backend/watermark/`):

- [ ] Watermark `logo.png` (transparent PNG, ~200x200, light)
- [ ] A separate PNG for the video overlay, if listing video is enabled — uploaded to the bucket and referenced by `LISTING_VIDEO_WATERMARK_S3_URI`. The photo watermark is the wrong size; the overlay is inserted 140 px wide

**Gotcha — App Router icons need the same branding.** `sync-platform-to-core.cjs` copies `assets/frontend/public` into `core/frontend/public` and also syncs `favicon.ico` → `core/frontend/app/favicon.ico` and `favicon-64.png` → `core/frontend/app/icon.png`. Ensure those source files exist in the overlay. Page metadata also sets `icons` from `public/` in `app/[locale]/layout.tsx`; `manifest.ts` uses `siteConfig`; `opengraph-image.tsx` reads `public/opengraph-image.png`.

### 7. Cities and country data

- [ ] City list added to `core/backend/src/cities/data/{country}.ts` (`name` official local spelling stored on listings, ASCII `nameEn`, optional `nameRu`) and registered in `CITIES_BY_COUNTRY` (`core/backend/src/cities/cities.service.ts`)
- [ ] Sort locale added to `SORT_LOCALE_BY_COUNTRY`
- [ ] Phone prefix supported in `core/backend/src/auth/.../phone.service.ts`
- [ ] Platform config in core: `core/backend/src/scripts/platforms/{country}/config.ts`

Cities come from code and are cached in Redis — nothing to seed.

**Gotcha — `COUNTRY` has a silent fallback to `md`** (`core/backend/src/common/env.ts`). Forget the variable and the platform quietly serves Moldovan cities and Moldovan defaults with no error. Verify on the listing form right after the first deploy.

### 8. Parsers (`config/parsers.ts`)

- [ ] `parsersConfig` set to `[]` if the platform has no partner importers

An empty catalog is what isolates other platforms' parsers: the admin list, manual runs, schedules and CLI spawning all go through it.

- [ ] `ADMIN_PARSING_SCHEDULER_ENABLED=false` when there are no parsers — the scheduler defaults to **enabled** (`core/backend/src/parsing/application/parsing-env.ts`)

Known limits when the catalog is empty: the Parsing tab is still visible, sync runs resolve the CLI by code without checking the catalog (only reachable with rows already in the DB), and new schedules default to `Europe/Chisinau`.

### 9. Features that need an explicit decision

Each of these is visible or reachable by default and fails confusingly if left unconfigured.

- [ ] **Listing video** — **there is no flag to hide it.** `PhotosSection.tsx` renders the uploader unconditionally and neither `site.ts` nor any env var gates it, so without AWS MediaConvert users upload a clip and hit `errors.video.transcodingUnavailable`. Either configure MediaConvert (`AWS_MEDIACONVERT_ENDPOINT`, `_QUEUE_ARN`, `_ROLE_ARN`, EventBridge → SNS → `POST /api/webhooks/mediaconvert`, plus `mediaconvert:CreateJob/GetJob/DescribeEndpoints` on the app's IAM user) or add the flag to core. Set `AWS_MEDIACONVERT_SNS_TOPIC_ARN` as well: without it the webhook accepts validly signed events from **any** SNS topic. A separate PNG in the bucket via `LISTING_VIDEO_WATERMARK_S3_URI` puts the logo on clips — the photo watermark is the wrong size, the overlay is inserted 140 px wide. Full walkthrough: [listing-video-production-setup-ru.md](./listing-video-production-setup-ru.md)
- [ ] **Telegram** — the login widget and the support bot are separate decisions. The widget needs a bot in BotFather with `/setdomain` (**one domain per bot**), `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` and `TELEGRAM_BOT_TOKEN`; it sends no messages, so platform locales do not matter. The support bot additionally needs `TELEGRAM_SUPPORT_CHAT_ID` and a webhook, and replies in **ro + ru only** (`core/backend/src/telegram/telegram.service.ts`) regardless of platform locales
- [ ] **Google sign-in** — set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` to the **same** Web client ID, and list the production origins (apex and `www`) under Authorized JavaScript origins. The `Cross-Origin-Opener-Policy: same-origin-allow-popups` header and the CSP entries for `accounts.google.com` are already in core
- [ ] **Facebook Login** — set `NEXT_PUBLIC_FACEBOOK_APP_ID`, `FACEBOOK_APP_ID`, and `FACEBOOK_APP_SECRET`; configure App Domains / JavaScript SDK domains in Meta Developer Console; Live mode + App Review for `email` as required. See [FACEBOOK_LOGIN_SETUP_RU.md](./FACEBOOK_LOGIN_SETUP_RU.md). CSP entries for `connect.facebook.net` / `www.facebook.com` / `graph.facebook.com` are in core
- [ ] **Promotions** — set `PROMOTION_ACCESS` explicitly (`disabled` / `admin` / `all`). There is no payment provider in the project; promotions are an internal mechanic
- [ ] **Vehicle history** — omit `reportProvider` from `site.ts` to keep the section hidden. See the gotcha in section 15
- [ ] **Email** — decide before launch. Password reset does not work without SMTP, which leaves locked-out users with no recovery path

### 10. Environment variables

Validated at build/startup (`core/scripts/check-env.js`, `core/backend/src/common/env.validation.ts`): `COUNTRY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `JWT_SECRET` (min 16), `CRON_SECRET` (min 8), `DB_*`, `REDIS_HOST`, `REDIS_PORT`, `FRONTEND_URL`; plus `GOOGLE_CLIENT_ID` when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set and `TELEGRAM_BOT_TOKEN` when `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` is set. Facebook backend validation requires `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` together; combined builds also require `FACEBOOK_APP_ID` to match `NEXT_PUBLIC_FACEBOOK_APP_ID` when both are present. Frontend-only builds do not require the app secret.

Backend:

```
COUNTRY, DEFAULT_LOCALE, SUPPORTED_LOCALES, DEFAULT_CURRENCY
NODE_ENV=production
JWT_SECRET, CRON_SECRET
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
REDIS_HOST, REDIS_PORT
FRONTEND_URL, API_URL
SITE_NAME or PLATFORM_NAME        # email footer brand + Swagger title
NEXT_PUBLIC_SITE_URL              # yes, on the backend too — used by the sitemap
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_REGION
AWS_CLOUDFRONT_URL                # if using a CDN
WATERMARK_DOMAIN
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, SUPPORT_EMAIL
EMAIL_LOGO_PATH                   # optional public path for the email header logo
GOOGLE_CLIENT_ID
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
GEMINI_API_KEY
FXRATESAPI_API_KEY
SENTRY_DSN                        # environment comes from NODE_ENV; SENTRY_ENVIRONMENT is ignored
LOG_LEVEL                         # optional, defaults to info in production
ADMIN_PARSING_SCHEDULER_ENABLED
PROMOTION_ACCESS
TELEGRAM_BOT_TOKEN
AWS_MEDIACONVERT_ENDPOINT, AWS_MEDIACONVERT_QUEUE_ARN, AWS_MEDIACONVERT_ROLE_ARN
AWS_MEDIACONVERT_SNS_TOPIC_ARN     # recommended when video is enabled
LISTING_VIDEO_WATERMARK_S3_URI    # separate PNG; photo watermark wrong size (140px overlay)
ONNXRUNTIME_NODE_INSTALL=skip     # Render build
GITHUB_PAT                        # Render build, private core submodule
```

Frontend:

```
NEXT_PUBLIC_COUNTRY
NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_API_URL
NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_GTM_ID      # GTM empty = not loaded
NEXT_PUBLIC_NOINDEX                       # true = noindex/nofollow for staging
NEXT_PUBLIC_GOOGLE_VERIFICATION, NEXT_PUBLIC_GOOGLE_CLIENT_ID
NEXT_PUBLIC_TELEGRAM_CLIENT_ID
NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN
NEXT_PUBLIC_IMAGE_CDN_URL                 # if using a CDN; also feeds CSP + remotePatterns
```

**Gotcha — `SMTP_FROM` and `SUPPORT_EMAIL` fall back to `noreply@` / `support@` plus the `FRONTEND_URL` hostname** (`core/backend/src/auth/infrastructure/services/email.service.ts`). Set them explicitly for production.

**Logging needs no per-platform work.** Pino writes line-delimited JSON to stdout (`core/backend/src/common/logger/logger.module.ts`) and the host collects it per service; application events go through `log-user-event.ts` and carry nothing platform-specific. Phones, emails, tokens and cookies are stripped before anything reaches Sentry (`sentry-event-sanitize.utils.ts`). `/metrics` is behind `CRON_SECRET`.

**Plate masking and photo watermarks need no extra assets beyond the overlay logo.** The 28 MB `plate-detector.onnx` is committed to core and arrives with the submodule; `ONNXRUNTIME_NODE_INSTALL=skip` only skips the optional GPU binaries, and detection runs on CPU. Do watch the instance size — the model and `sharp` sit in memory. The watermark image comes from the platform overlay (`assets/backend/watermark/logo.png`, synced by `prepare:build`). Domain text on the photo watermark **and** on plate masks comes from `WATERMARK_DOMAIN`, falling back to the `FRONTEND_URL` hostname when unset. Wrong domain text is burned into stored photos — set it before first production uploads.

**The SMS sender name already switches on `COUNTRY`** (`core/backend/src/common/constants.ts`), with `SMS_BRAND_NAME` as an override. Like the cities and the description locales, it silently falls back to the first platform when `COUNTRY` is unset — that one variable is worth verifying first when anything looks Moldovan.

**Gotcha — exchange rates silently stop** if `DEFAULT_CURRENCY` is not `EUR`: the refresh use case logs a warning and returns without fetching, because FXRatesAPI is called with EUR as base.

### 11. External services

Google (same account, new entities):

- [ ] GA4 property → `NEXT_PUBLIC_GA_ID`
- [ ] Search Console resource → `NEXT_PUBLIC_GOOGLE_VERIFICATION`
- [ ] Cloud project on the same billing account → OAuth Web Client (origins on the new domain) and Gemini API key
- [ ] Billing attached to the new Cloud project
- [ ] GTM container → `NEXT_PUBLIC_GTM_ID`; do not add a GA4 auto page_view tag while `gtag.js` is active

Sentry:

- [ ] `{platform}-frontend` and `{platform}-backend` projects in the existing org

Twilio:

- [ ] Subaccount created; own SID and auth token
- [ ] Messaging Service for the target country
- [ ] SMS delivery tested

AWS:

- [ ] Bucket `{platform}-uploads` created, public-read policy, CORS for the site origin
- [ ] IAM user scoped to that bucket only
- [ ] CloudFront distribution if using a CDN

### 12. Deployment (Render)

- [ ] PostgreSQL and Key Value (Redis) created, same region as the services
- [ ] Backend web service — build, start and pre-deploy commands copied from an existing platform (submodule checkout + `prepare:build` + `migration:run:prod`)
- [ ] Frontend web service
- [ ] Env variables set on both
- [ ] Brands seeded: `npm run seed:all-brands:prod`
- [ ] Admin created: `npm run make-admin:prod -- --email ... --password ...`

Cron: schedules run **in-process** via `@Cron` decorators (exchange rates, closing old listings, expiring promotions, token cleanup, notifications). External Render Cron Jobs are only needed on the free tier where services sleep.

### 13. Smoke test on the Render URLs

**Nothing that needs a login can be tested here.** Auth cookies are set host-only with `sameSite: 'lax'` (`core/backend/src/auth/application/services/auth-token-issuer.service.ts`). On the production domain that is fine, because the site and its `api.` subdomain are same-site. But `onrender.com` is on the Public Suffix List, so two `*.onrender.com` services are cross-site and the cookies never reach the frontend. The Telegram widget is blocked too, since a bot has a single `/setdomain`. Both are fixed only by attaching the custom domain.

So attach the domain early and keep indexing disabled until acceptance passes. There is no staging environment by default.

- [ ] `NEXT_PUBLIC_NOINDEX=true` while testing
- [ ] Home page and `/health` respond; no crashes in the logs
- [ ] Cities are the new country's — proves `COUNTRY` was picked up
- [ ] Footer pages open in every supported locale
- [ ] No parsing scheduler ticks in the logs

### 14. Domain, then full acceptance

- [ ] Custom domains added in Render (apex, `www`, `api`)
- [ ] DNS records in Namecheap; parking A records and URL redirects removed
- [ ] Mail records: MX, SPF, DKIM, DMARC
- [ ] SSL issued
- [ ] Env switched to the production URLs and frontend redeployed (`NEXT_PUBLIC_*` are build-time), **keeping `NEXT_PUBLIC_NOINDEX=true`**

Then, on the real domain:

- [ ] Phone signup, SMS arrives
- [ ] Google sign-in, Facebook Login, Telegram sign-in, admin login; the session survives navigation
- [ ] Listing form description tabs are labelled with the platform's `descriptionLocales` and open on the current UI language; both texts save and render on the listing page
- [ ] The listing AI report answers in the UI language
- [ ] If video is enabled: a clip leaves `processing`, carries the platform watermark, and its poster renders. The SNS subscription can only be confirmed once the domain is live, so create it after cutover and look for `listing_video_webhook_subscription_confirmed` in the logs
- [ ] Photo upload works; watermark and plate mask show the correct domain
- [ ] Sharing a listing shows the correct site name in the preview
- [ ] Password reset email arrives and is not marked spam
- [ ] GA4 Realtime receives hits; no requests to another platform's GTM container
- [ ] No CORS errors in the console

Only then remove `NEXT_PUBLIC_NOINDEX`, redeploy, submit the sitemap to Search Console, and confirm `/robots.txt` and `/sitemap.xml` carry the new domain.

### 15. Changing core for a new platform

Core must stay **platform-neutral**. Do not add a live brand, domain, or cookie/storage prefix to `core/frontend` or `core/backend`. Visible name and domain come from overlay `config/site.ts` and env (`SITE_NAME`, `PLATFORM_NAME`, `SMS_BRAND_NAME`). Shared keys are `ppcsl_*` / `ppcsl-`. `lint:platform-neutral` (part of frontend `lint` and backend `lint:check`) fails the build if a known platform token leaks into core; when you launch another platform, add its token to `core/scripts/check-platform-neutral.cjs`. Details: [linting.md](../engineering/linting.md).

Some values are still environment- or locale-shaped rather than fully generic. Expect to find more. Known ones that should still be checked against `siteConfig` or env:

- OG `siteName` on the listing page (`core/frontend/app/[locale]/listings/[id]/page.tsx`) — every other page already uses `siteConfig.name`
- `/investors` page locales (`InvestorsPageClient.tsx`) — content follows the URL locale; the page language dropdown navigates to the matching locale path (same supported locales as the site switcher)
- Telegram contact handle (`core/frontend/app/[locale]/contacts/page.tsx`)
- Vehicle-history provider: locale type is `'ro' | 'ru'` and `isReportProviderConfigured()` hard-requires the `ro` key in `baseUrls` and `demoUrls`, so filling other locales alone will not enable the section

**Already driven by env / site config (do not treat as hardcoded launch blockers):**

- Plate mask + photo watermark domain text — `WATERMARK_DOMAIN` / `FRONTEND_URL`
- GTM container id — `NEXT_PUBLIC_GTM_ID` (empty = no GTM)
- CSP `connect-src` and `images.remotePatterns` — built from `NEXT_PUBLIC_API_URL` and CDN env in `next.config.js`
- Image diagnostics allowlist — `AWS_CLOUDFRONT_URL` + `API_URL` only (`diagnostics.service.ts`)
- Listing AI report language — UI locale `en` / `sq` / `ro` / `ru`
- Swagger title — `SITE_NAME` / `PLATFORM_NAME` / `FRONTEND_URL` hostname
- Email layout brand label — `siteName` / site base URL passed into `email-template.ts`

The listing description tabs are **not** in this list: they already read `descriptionLocales` from `site.ts` and label themselves from `languageSwitcherTranslationKeys`. The DB columns stay `description_ro` / `description_ru`, but they are just slot 0 and slot 1. Do set `descriptionLocales` — the fallback is `['ro', 'ru']`.

Fallback values pointing at another platform are the dangerous subset, because everything looks fine until the variable is missing: sitemap base URL, watermark domain, S3 bucket name.

Internal cookie and locale keys are `ppcsl_access_token` / `ppcsl_refresh_token` / `ppcsl-locale`. Renaming them logs everyone out; that is expected when bumping a core that already shipped the `ppcsl_*` prefix. Do not introduce a dual-read of the old `kupito_*` names. Infocar’s affiliate query stays `from=kupito` (external partner id, not our cookie prefix).

#### Impact on existing platforms

A core change reaches other platforms only when someone bumps the submodule pointer in their repository — `.gitmodules` pins a commit and builds do not use `--remote`. That delay is a trap: set the variables **before merging into core**, because the person who bumps the pointer may not know about your change.

Before merging a core change that moves a hardcoded value into env:

- [ ] Set the new variable on every existing platform (e.g. `NEXT_PUBLIC_GTM_ID`)
- [ ] Verify existing platforms set explicitly any variable whose fallback you are removing — especially `AWS_S3_BUCKET_NAME`, `NEXT_PUBLIC_SITE_URL`, `WATERMARK_DOMAIN`
- [ ] Note behaviour changes that need no env work but are user-visible, and confirm them with the platform owner
- [ ] Run `lint` and `test` in both `core/frontend` and `core/backend` (`lint` includes `lint:platform-neutral`)

### 16. CI/CD

- [ ] `.github/workflows/ci.yml` present
- [ ] `PAT_TOKEN` secret for the private core submodule
- [ ] `API_URL` secret for the frontend build
- [ ] Optional deploy hooks
- [ ] Workflow green

### 17. Legal

- [ ] Terms and Privacy translated and country-appropriate
- [ ] Subprocessors listed match reality
- [ ] Contacts verified
- [ ] Compliance with local law reviewed

---

## After launch

- [ ] Verify the first exchange rate row appears the next day, with no `DEFAULT_CURRENCY` warning in logs
- [ ] Log and Sentry monitoring
- [ ] SMS and photo upload spot checks
- [ ] Database backups
- [ ] Core updates (bump the submodule deliberately, not automatically)
- [ ] Dependency updates

---

## Useful commands

```bash
# Clone repo with submodule
git clone --recurse-submodules <repo-url>

# Update submodule to the pinned commit
git submodule update --init --recursive

# Prepare for build (sync overlay into core)
npm run prepare:build

# Run locally
npm run dev
```

---

## Links

- [Multi-Repository](../architecture/multi-repository.md)
- [Scripts Architecture](../architecture/scripts-architecture.md)
- [Known Issues](../architecture/known-issues.md)
- [Platform Guide](./platform-guide.md)
- [Deployment](./DEPLOYMENT.md)
- [Parsers multiplatform migration](../architecture/parsers-multiplatform-migration.md)

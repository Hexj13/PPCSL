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

Short checklist for creating a new platform based on PPCSL core.

## Before you start

Read these documents:

- [multi-repository.md](../architecture/multi-repository.md) — Overall architecture
- [scripts-architecture.md](../architecture/scripts-architecture.md) — Scripts architecture
- [known-issues.md](../architecture/known-issues.md) — Known issues

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
│   └── site.ts               # Platform config
├── locales/
│   └── {lang}.json           # Translations
├── theme/
│   └── colors.ts             # Color scheme
├── core/                      # PPCSL submodule
│   └── backend/src/scripts/platforms/{country}/  # Platform configs in core
│       └── config.ts         # Cities, descriptions, phones
├── package.json
└── README.md
```

---

## Checklist

### 1. Infrastructure

- [ ] Domain registered (Namecheap)
- [ ] Git repository created
- [ ] PPCSL core added as submodule
- [ ] Folder structure created (`assets/`, `config/`, `locales/`, `theme/`)

### 2. Configuration (`config/site.ts`)

- [ ] `country` code set (e.g. `md` for Moldova)
- [ ] Platform `name` set
- [ ] `domain` set (e.g. `kupito.club`)
- [ ] `locale` set (e.g. `ro-MD`)
- [ ] `currency` set (e.g. `MDL`)
- [ ] `countryCode` for phones set (e.g. `MD`)
- [ ] `supportEmail` set
- [ ] `siteUrl` set

### 3. Translations (`locales/{lang}.json`)

- [ ] Translation file created for primary language
- [ ] All keys translated (match `ro.json` or `ru.json`)
- [ ] Legal documents translated (Terms, Privacy)
- [ ] FAQ translated
- [ ] SMS messages translated (in `core/backend/src/common/constants.ts`)
- [ ] Structure verified (matches `ro.json` or `ru.json`)

### 4. Theme (`theme/colors.ts`)

- [ ] `colors.ts` copied from Moldova or created new
- [ ] Colors adjusted if needed
- [ ] TailwindCSS compatibility verified

### 5. Graphics (`assets/`)

#### Frontend (`assets/frontend/public/`)

- [ ] Logo `logo.png` created
- [ ] `logo-desktop.png` created
- [ ] `logo-mobile.png` created
- [ ] Favicons created (16, 32, 64, 192, 512px)
- [ ] `favicon.ico` created
- [ ] PWA icon `pwa192.png` created
- [ ] Open Graph image `og-image.jpg` (1200x630px)
- [ ] `opengraph-image.png` (1200x630px)

#### Backend (`assets/backend/watermark/`)

- [ ] Watermark logo `logo.png` (PNG with transparent background, ~200x200px, white/light)

### 6. Data generation scripts (`scripts/{country}/`)

- [ ] Platform config in core: `core/backend/src/scripts/platforms/{country}/config.ts`
  - [ ] Country cities
  - [ ] Descriptions in local language
  - [ ] Phone prefix (e.g. `+373` for Moldova)
  - [ ] Test user names
  - [ ] Transmission labels in local language
- [ ] Seed/reset-and-seed etc. run with `COUNTRY={country}` (scripts in core, config in platforms/{country})

### 7. Package.json

- [ ] `name` set
- [ ] `description` set
- [ ] `prepare:build` script updated:
  ```json
  "prepare:build": "mkdir -p core/frontend/lib/locales && rm -rf core/frontend/lib/locales/backend && cp locales/ro.json locales/ru.json core/frontend/lib/locales/ && cp locales/backend/*.json core/backend/src/common/i18n/ && cp -r theme core/frontend/lib/ && cp -r config core/frontend/lib/ && cp -r assets/frontend/public/* core/frontend/public/ && cp -r assets/backend/watermark core/backend/assets/"
  ```
- [ ] Run scripts added:
  ```json
  "seed": "COUNTRY={country} npm run prepare:build && cd core/backend && COUNTRY={country} npx ts-node -r tsconfig-paths/register src/scripts/stage/seed.ts",
  "reset-and-seed": "COUNTRY={country} npm run prepare:build && cd core/backend && COUNTRY={country} npx ts-node -r tsconfig-paths/register src/scripts/stage/reset-and-seed.ts",
  "add-brands": "cd core/backend && npx ts-node -r tsconfig-paths/register src/scripts/stage/add-brands.ts"
  ```

### 8. Environment variables (`.env`)

#### Backend

- [ ] `DATABASE_URL` (PostgreSQL)
- [ ] `REDIS_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `FRONTEND_URL` (e.g. `https://kupito.club`)
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_S3_BUCKET_NAME` (shared or separate?)
- [ ] `AWS_REGION`
- [ ] `CLOUDFRONT_URL`
- [ ] `WATERMARK_DOMAIN` (e.g. `kupito.club`)
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_PHONE_NUMBER`
- [ ] `INFOCAR_SECRET_KEY` (optional; for Infocar signed report URL, see [infocar-history-section.md](../features/infocar-history-section.md))

#### Frontend

- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_COUNTRY` (e.g. `md`)
- [ ] `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
- [ ] `NEXT_PUBLIC_GOOGLE_VERIFICATION`

### 9. External services

#### Google

- [ ] Google account for platform created
- [ ] Google Analytics configured
- [ ] Google Search Console configured
- [ ] Measurement ID obtained
- [ ] Verification code obtained

#### Twilio

- [ ] Twilio account created/configured
- [ ] Phone number or Messaging Service set up
- [ ] Credentials obtained (SID, Auth Token)
- [ ] SMS sending tested

#### AWS S3 (if separate bucket)

- [ ] S3 bucket created
- [ ] Permissions configured
- [ ] CloudFront distribution created
- [ ] CORS configured

#### Domain & DNS (Namecheap)

- [ ] Domain purchased
- [ ] DNS records set (A, CNAME)

### 10. Deployment (Render.com)

- [ ] PostgreSQL service created
- [ ] Redis service created
- [ ] Backend service created
  - [ ] Env variables set
  - [ ] Build command set
  - [ ] Start command set
- [ ] Frontend service created
  - [ ] Env variables set
  - [ ] Build command set
  - [ ] Start command set
- [ ] Custom domain connected
- [ ] SSL certificate configured (automatic)

### 11. CI/CD

- [ ] `.github/workflows/ci.yml` created
- [ ] GitHub Actions configured
- [ ] Secrets added in GitHub
- [ ] Workflow tested

### 12. Local testing

- [ ] `npm run prepare:build` run
- [ ] Dependencies installed (`npm install` in core/backend and core/frontend)
- [ ] Database running (PostgreSQL, Redis)
- [ ] `npm run add-brands` run (universal brands)
- [ ] `npm run seed` run (local data)
- [ ] Backend running (`npm run dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Site verified locally
- [ ] Registration/login verified
- [ ] Phone verification tested (Twilio)
- [ ] Photo upload tested (S3)
- [ ] Photo watermark verified

### 13. Production deploy

- [ ] Backend deployed on Render.com
- [ ] Frontend deployed on Render.com
- [ ] Production verified
- [ ] Monitoring and logs configured
- [ ] DB backups configured
- [ ] Cron jobs configured if needed

### 14. SEO & Analytics

- [ ] Site added to Google Search Console
- [ ] Sitemap submitted
- [ ] Indexing verified
- [ ] Google Analytics configured
- [ ] Event tracking verified

### 15. Legal documents

- [ ] Terms of Service translated
- [ ] Privacy Policy translated
- [ ] Contacts and info verified
- [ ] Compliance with country law verified

---

## After launch

### Regular tasks

- [ ] Log monitoring
- [ ] SMS (Twilio) checks
- [ ] Photo upload (S3) checks
- [ ] Database backups
- [ ] Core updates (git submodule update)
- [ ] Dependency updates

### Support

- [ ] Team documentation
- [ ] Deploy instructions
- [ ] Update instructions
- [ ] Support contacts

---

## Useful commands

```bash
# Clone repo with submodule
git clone --recurse-submodules <repo-url>

# Update submodule
git submodule update --remote

# Prepare for build
npm run prepare:build

# Generate brands (universal)
npm run add-brands

# Generate local data
npm run seed

# Reset and full seed
npm run reset-and-seed

# Run locally
npm run dev
```

---

## Links

- [PPCSL Core Repository](https://github.com/your-org/ppcsl)
- [Multi-Repository](../architecture/multi-repository.md)
- [Scripts Architecture](../architecture/scripts-architecture.md)
- [Known Issues](../architecture/known-issues.md)
- [Platform Guide](./platform-guide.md)
- [Deployment](./deployment.md)

---

**Good luck with your new platform!**

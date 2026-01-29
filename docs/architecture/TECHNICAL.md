# Техническая документация PPCSL

Complete technical documentation for the PPCSL platform.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Development Setup](#2-development-setup)
3. [Environment Variables](#3-environment-variables)
4. [Architecture](#4-architecture)
5. [API Reference](#5-api-reference)
6. [Database](#6-database)
7. [Security](#7-security)
8. [Testing](#8-testing)
9. [Scripts](#9-scripts)
10. [SEO & Analytics](#10-seo--analytics)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Project Restart](#12-project-restart)

---

## 1. Project Overview

### Purpose

Core application framework for creating car marketplace platforms for different countries. Users can independently add, edit, pause, and close their listings.

### Core Principles

- Fully free service, no payments, subscriptions, or paid options
- Two user types: **Individual** and **Business**
- Individual users: maximum **100 active listings** simultaneously
- Business users: maximum **100 active listings** simultaneously
- Listings have three statuses: **Active**, **Paused**, **Closed**
- Automatic closing after **5 months** (approximately 150 days) since `last_updated_at` timestamp
  - Non-promoted listings older than 5 months are closed automatically
  - Promoted listings with active promotion are not closed automatically
  - Promoted listings with expired promotion are closed automatically on the next cron run
- **Paid Promotion Feature (MVP):** Users can promote their listings for higher visibility
  - Promoted listings appear first in search results
  - Visual highlighting with green border and "Promoted" tag
  - Promotion periods: 1, 7, 14, or 30 days
  - Promotion time is frozen when listing is paused
  - Access control via `PROMOTION_ACCESS` environment variable (disabled/admin/all)
  - See [`docs/PAID_PROMOTION.md`](./PAID_PROMOTION.md) for complete documentation

### Technologies

- **Frontend:** Next.js 16, React 19, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Database:** PostgreSQL 15 with comprehensive indexing and triggers
- **Search:** PostgreSQL Full-Text Search
- **Image Processing:** Sharp library for optimization and WebP conversion
- **File Storage:** AWS S3 for image storage (using AWS SDK v3), AWS CloudFront CDN for delivery
- **Authentication:** JWT tokens (1 hour expiration), Refresh tokens (7 days)
- **Task Scheduling:** NestJS Schedule module (cron jobs)

---

## 2. Development Setup

### Requirements

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Quick Start

```bash
# Install dependencies
npm run install:all

# Start database
docker-compose up -d

# Start backend (Terminal 1)
cd backend && npm run start:dev

# Start frontend (Terminal 2)
cd frontend && npm run dev
```

**Frontend:** http://localhost:3000 | **Backend:** http://localhost:4000

### Docker Issues

If you see `Cannot connect to the Docker daemon`:

**Option 1: Start Docker Desktop**
1. Open Docker Desktop application
2. Wait for full startup
3. Run `docker-compose up -d`

**Option 2: Install PostgreSQL and Redis locally**

#### PostgreSQL (macOS)
```bash
brew install postgresql@15
brew services start postgresql@15
createdb ppcsl
psql postgres
```

In psql:
```sql
CREATE USER ppcsl WITH PASSWORD 'ppcsl123';
ALTER DATABASE ppcsl OWNER TO ppcsl;
GRANT ALL PRIVILEGES ON DATABASE ppcsl TO ppcsl;
\q
```

#### Redis (macOS)
```bash
brew install redis
brew services start redis
```

### Database Setup

**For production (migrations):**
```bash
cd backend
npm run build
npm run migration:run
```

**For development (TypeORM sync):**
```bash
cd backend && npm run start:dev
```

**Important:** Always use migrations in production. The latest migration includes database optimizations (indexes, triggers).

---

## 3. Environment Variables

### Backend (`backend/.env`)

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ppcsl
DB_PASSWORD=ppcsl123
DB_NAME=ppcsl

# Database Connection Pooling (optional)
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# Authentication
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Watermark Configuration (optional)
WATERMARK_DOMAIN=your-domain.com
# If not set, domain will be extracted from FRONTEND_URL

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com

# Internationalization (optional)
DEFAULT_LOCALE=<locale>
# Supported locales depend on platform (e.g. ro, ru for Moldova)
```

### Frontend (`frontend/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_COUNTRY=<country>
# ISO 3166-1 alpha-2 country code (e.g. md for Moldova)

# Google Search Console Verification (optional)
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-verification-code

# Google Analytics Measurement ID (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Promotion Feature Configuration
PROMOTION_ACCESS=disabled  # Options: disabled, admin, all
MAX_PROMOTIONS_PER_USER=10  # Maximum active promotions per user
CRON_SECRET=your-secret-key-here  # Secret for cron job authentication
```

### Promotion Feature Variables

- **`PROMOTION_ACCESS`**: Controls who can access promotion features
  - `disabled`: Feature disabled for all users
  - `admin`: Only administrators can promote listings
  - `all`: All authenticated users can promote listings
- **`MAX_PROMOTIONS_PER_USER`**: Maximum number of active promotions per user (default: 10)
- **`CRON_SECRET`**: Secret key for authenticating cron job endpoints (minimum 32 characters)

See [`docs/PAID_PROMOTION.md`](./PAID_PROMOTION.md) for complete promotion feature documentation.

### Production Notes

⚠️ **Important:** In production, you **must** set `JWT_SECRET` and `DB_PASSWORD` to secure values. The application will throw an error if `JWT_SECRET` is missing in production mode.

---

## 4. Architecture

### Project Structure

```
PPCSL/
├── frontend/          # Next.js application
│   ├── app/          # Pages and routes (Server Components)
│   ├── components/   # React components (Client/Server)
│   └── lib/          # Utilities and API clients
│       ├── api.ts    # Client-side API client (Axios)
│       └── server-api.ts # Server-side API functions (native fetch)
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── users/    # Users
│   │   ├── listings/ # Listings
│   │   ├── favorites/# Favorites
│   │   ├── saved-filters/ # Saved search filters
│   │   ├── brands/   # Brands and models
│   │   ├── admin/    # Admin panel
│   │   ├── upload/   # File upload service (with watermark support)
│   │   ├── common/   # Common utilities and services
│   │   │   ├── decorators/ # Custom validation decorators (IsName, IsPhone, IsPassword)
│   │   │   ├── i18n/  # Internationalization service (I18nService)
│   │   │   └── utils/ # Utility functions (data-cleanup, error-handling, query-builder, validation)
│   │   └── scripts/  # Utility scripts
│   ├── assets/
│   │   └── watermark/ # Watermark assets (logo.png)
│   └── uploads/       # Local file storage (development)
├── docs/             # Documentation
└── docker-compose.yml # Database configuration
```

### Frontend Architecture

**Server Components (Next.js App Router):**
- Homepage (`app/page.tsx`) is an async Server Component that fetches initial listings data
- Server-side data fetching uses native `fetch` with Next.js Data Cache and Request Memoization
- Initial data passed as props to client components for infinite scroll functionality
- Improves SEO, reduces client-side JavaScript, and improves initial page load performance

**Client Components:**
- Interactive components (forms, modals, infinite scroll) remain as Client Components
- State management handled by Zustand stores
- API calls for subsequent data loads use Axios client (`lib/api.ts`)

### Key Features

- **Image Processing:** Automatic compression, resizing (max 1920px width), conversion to WebP format (75% quality by default)
- **Adaptive Quality:** Different quality levels for different contexts (70% for thumbnails, 75-80% for cards and detail pages, 85% for full-size modal views)
- **File Storage:** AWS S3 for persistent image storage (using AWS SDK v3, required for production on Render.com), AWS CloudFront CDN for fast global delivery
- **Search:** PostgreSQL Full-Text Search with extensive filtering options
- **Caching:** Redis for SMS codes, cache optimization (SCAN instead of KEYS)
- **Monitoring:** Health check endpoint (`/health`) with database and Redis connectivity checks
- **Code Quality:** TypeScript strict mode, CI/CD automation, bundle optimization

---

## 5. API Reference

### Authentication

```http
POST /api/auth/register              # Register new user
POST /api/auth/login                  # Login (returns access_token and refresh_token)
POST /api/auth/refresh                # Refresh access token
GET  /api/auth/me                     # Get current user profile
PATCH /api/auth/profile              # Update user profile
DELETE /api/auth/profile              # Delete user account
POST /api/auth/send-sms              # Send SMS verification code
POST /api/auth/verify-sms            # Verify SMS code
POST /api/auth/request-password-reset # Request password reset
POST /api/auth/reset-password         # Reset password
```

### Listings

```http
GET    /api/listings                  # List listings (with filters)
GET    /api/listings/:id              # Get listing details
POST   /api/listings                  # Create listing
PATCH  /api/listings/:id              # Update listing (only non-closed)
POST   /api/listings/:id/publish      # Activate listing
POST   /api/listings/:id/pause        # Pause listing
POST   /api/listings/:id/close        # Close listing
GET    /api/listings/my               # Get user's listings
GET    /api/listings/vin/:vin         # Find listings by VIN
POST   /api/listings/refresh-dates    # Refresh all user's listing dates
POST   /api/listings/cron/close-old   # Close old listings (cron job, requires x-cron-secret header)
PATCH  /api/listings/:id/promote      # Toggle listing promotion (user, JWT required)
GET    /api/listings/promotion-history # Get user's promotion history (JWT required)
GET    /api/listings/promotion-history/check # Check if user has promotion history (JWT required)
GET    /api/listings/promotion-access  # Get promotion access status (no auth required)
```

**Filter Parameters:**
- The frontend supports **slug-based URLs** for better SEO and user-friendly URLs:
  - `?brand=toyota` or `?brand=toyota,bmw` - Filter by brand slugs (comma-separated)
  - `?model=yaris` or `?model=yaris,corolla` - Filter by model slugs (comma-separated, requires brand filter)
  - Slug parameters are converted to `brand_ids` and `model_ids` on the **frontend** (in `parseSearchParams` via `brandResolver`) before the API request; the API receives only UUIDs.
  - If a brand slug from the URL is not found (e.g. no such brand in the catalog), the search returns **0 listings** (no fallback to “all brands”).
  - Other filter parameters remain unchanged (price, year, city, etc.)
- Example URLs:
  - `/?brand=toyota` - All Toyota listings
  - `/?brand=toyota&model=yaris` - Toyota Yaris listings
  - `/?brand=toyota,bmw&model=yaris,3-series` - Multiple brands and models

### Favorites

```http
GET    /api/favorites                 # Get user's favorites
POST   /api/favorites/:id             # Add to favorites
DELETE /api/favorites/:id             # Remove from favorites
GET    /api/favorites/check/:id       # Check if listing is in favorites
```

**Note:** Favorites page includes tab counters showing the number of listings and saved filters.

### Car Comparison

Car comparison feature allows users to compare up to 3 cars simultaneously:
- Comparison data stored in `localStorage` (Zustand store with persist middleware)
- Maximum 3 cars can be added to comparison
- Comparison page displays detailed side-by-side table with all vehicle specifications
- Unauthorized users can add cars to comparison; data is stored in `pendingComparisons` and automatically added after login/registration
- Comparison data is cleared on logout
- Comparison button in header shows counter badge when items are added

### Saved Filters

```http
GET    /api/saved-filters              # Get all saved filters (authenticated users)
POST   /api/saved-filters              # Create saved filter (max 20 per user)
PATCH  /api/saved-filters/:id          # Update saved filter name
DELETE /api/saved-filters/:id          # Delete saved filter
```

### Upload

```http
POST /api/upload/image                # Upload and optimize image
                                      # Automatically applies watermark (logo + domain text)
                                      # Images are resized, watermarked, and converted to WebP
GET  /api/upload/image/:filename      # Get optimized image version
                                     # Query params: ?quality=X&width=Y
```

**Watermark Details:**
- Watermark is automatically applied to all uploaded images
- Logo file location: `backend/assets/watermark/logo.png`
- Watermark includes: logo (15% of image size) + domain text below
- Watermark domain is configurable via `WATERMARK_DOMAIN` environment variable
- If `WATERMARK_DOMAIN` is not set, domain is extracted from `FRONTEND_URL` environment variable
- Default domain: extracted from `FRONTEND_URL` (fallback)
- Watermark opacity: 35%
- Watermark position: bottom-right corner with 3% padding
- Logo is centered relative to the text

### Admin

```http
GET   /api/admin/users                # Get all users
GET   /api/admin/listings             # Get all listings
GET   /api/admin/stats                # Get statistics
PATCH /api/admin/listings/:id/status  # Change listing status
PATCH /api/admin/users/:id/toggle-status # Enable/disable user
                                      # When deactivating, all user's refresh tokens are revoked
```

### Health

```http
GET /                                 # API status check
GET /health                          # Health check (database, Redis)
```

---

## 6. Database

### Optimizations

#### Indexes

**Listings Table:**
- `status`, `user_id`, `status + user_id` (composite)
- `status + last_updated_at` (composite, for auto-closing)
- `price`, `created_at`, `views`, `vin` (partial), `urgent` (partial)
- `currency`, `city`, `title`

**Listing Date Fields:**
- `created_at` - Date when listing was created (automatic, never changes)
- `last_updated_at` - Updated only when:
  - Listing is created
  - User clicks "Refresh dates" button (updates all active listings)
  - Used for automatic closing after 5 months
- `last_edited_at` - Updated when listing content is edited (price, description, images, etc.)
- `last_published_at` - Updated when listing status changes to Active:
  - When listing is created with Active status
  - When listing is published via `POST /api/listings/:id/publish`
- `updated_at` - Automatically updated by TypeORM on any listing modification

**Listings Table Fields:**
- `price` - Integer (stored as integer, no decimal places)
- `power_kw` - Integer, nullable (power in kilowatts)
- `equipment` - Simple array, nullable (array of equipment keys: air_conditioning, leather_seats, sunroof, navigation, parking_sensors, rear_camera, cruise_control, heated_seats, xenon_lights, led_lights, fog_lights, alloy_wheels, electric_windows, central_locking, bluetooth, usb_port, multifunction_steering, start_stop, esp, abs)

**Vehicles Table:**
- `brand_id`, `model_id`, `brand_id + model_id` (composite)
- `year`, `fuel` (partial), `transmission` (partial)
- `body_type`, `mileage_km` (partial), `engine_displ_l` (partial)

**Users Table:**
- `phone` (partial), `type`, `active`, `email` (unique)

**Saved Filters Table:**
- `user_id`, `created_at`

#### Triggers

1. **Auto-increment views counter** - Increments views when view is recorded
2. **Cleanup listing views** - Removes view records when listing is deleted
3. **Cleanup favorites** - Removes favorite records when listing is deleted

**Note:** The auto-update trigger for `last_updated_at` was removed. This field is now updated manually only during listing creation and when using the "Refresh dates" feature. This allows users to control when their listings' auto-close timer resets.

#### Connection Pooling

- **Max connections:** 20 (configurable via `DB_POOL_MAX`)
- **Min connections:** 5 (configurable via `DB_POOL_MIN`)
- **Idle timeout:** 30 seconds
- **Connection timeout:** 2 seconds

### Backups

#### TypeScript Script (Development)

```bash
npm run backup
npm run backup -- --output-dir /path/to/backups
npm run backup -- --no-compress
npm run backup -- --keep-days 60
```

#### Bash Script (Production/Cron)

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=ppcsl
export DB_PASSWORD=your_password
export DB_NAME=ppcsl
export BACKUP_DIR=/var/backups/ppcsl
export KEEP_DAYS=30

./backend/scripts/backup-database.sh
```

#### Automated Backups (Cron)

```bash
# Daily backup at 2 AM
0 2 * * * source /etc/ppcsl/backup.env && /path/to/ppcsl/backend/scripts/backup-database.sh >> /var/log/ppcsl-backup.log 2>&1
```

Backups are saved to `backend/backups/` by default with format: `ppcsl_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`

---

## 7. Security

### Implemented Security Measures

#### Authentication & Authorization
- JWT tokens with expiration (1 hour access tokens, 7 days refresh tokens)
- Password hashing with bcrypt (10 rounds)
- Protected routes with guards (JwtAuthGuard, AdminGuard)
- Token rotation for enhanced security

#### Rate Limiting

**Global:** 100 requests per 60 seconds

**Special Limits:**
- `POST /api/auth/register`: 3 requests per 10 minutes
- `POST /api/auth/login`: 5 requests per 5 minutes
- `POST /api/auth/send-sms`: 3 requests per minute
- `POST /api/upload/image`: 20 requests per minute

#### SMS Verification
- IP-based brute force protection (40 attempts per IP, 1-hour block)
- Frontend: 10 attempts per code, 3 code resends maximum
- Automatic cleanup of expired IP blocks (hourly cron job)

#### File Upload Security
- Magic byte validation (file signature checking for JPEG, PNG, GIF, WebP)
- MIME type validation
- File size limits (10MB per image)
- Image metadata validation (width, height)
- Maximum dimension limits (10000x10000 pixels)
- Empty file detection
- Authentication required (JWT)

#### HTML Sanitization
- Backend HTML sanitization for listing descriptions
- Removes dangerous HTML tags (script, iframe, object, embed, etc.)
- Strips event handlers (onclick, onerror, etc.)
- Removes javascript: protocol links
- Allows only safe formatting tags (p, br, strong, em, u, ul, ol, li, font)

#### HTTP Security Headers
- Helmet middleware configured
- Content Security Policy (CSP)
- Standard security headers (XSS Protection, Content-Type-Options, Frame-Options, etc.)

#### Input Validation
- Class-validator for all DTOs
- ValidationPipe with whitelist and transform
- Custom validation decorators:
  - `@IsName()` - Validates name fields (letters, spaces, hyphens, dashes only)
  - `@IsPhone()` - Validates phone number format (+country code 1-4 digits + number 6-15 digits)
  - `@IsPassword()` - Validates password strength (uppercase, lowercase required)
- Phone number format validation
- Email validation
- VIN length validation (17 characters)
- SMS code validation (6 digits, numeric only)

#### Error Handling
- Global exception filter with integrated I18nService for localized error messages
- Error logging without exposing details to users
- Unified error messages with support for multiple locales (ro, ru, en)
- Locale detection from `Accept-Language` header or `DEFAULT_LOCALE` environment variable

---

## 8. Testing

### Unit Tests

**Backend:** Jest-based unit tests for services and controllers
**Frontend:** Jest + React Testing Library for components and utilities

**Running Tests:**
```bash
# Backend unit tests
cd backend && npm test

# Backend integration tests
cd backend && npm run test:integration

# Frontend tests
cd frontend && npm test
```

### Integration Tests

- **Contract Testing:** API endpoints validated against Swagger/OpenAPI specification
- **Framework:** Jest + Supertest + jest-openapi
- **Location:** `backend/src/test/*.integration.ts`
- **Coverage:** Listings, Auth, Brands, Cities, Favorites, Upload, Users, Admin APIs

### Test Coverage

**Backend Services:** ✅ All critical services have unit tests
**Controllers:** ✅ All controllers have comprehensive unit tests
**Guards:** ✅ JwtAuthGuard, AdminGuard, IpBlockGuard tested
**Frontend Components:** ✅ Core components tested (AuthProvider)
**Frontend Server API:** ✅ Server-side data fetching functions tested (`lib/server-api.test.ts`)
**Frontend API:** ✅ Client-side API functions tested (`lib/api.test.ts`)
**Frontend Utilities:** ✅ Utility functions tested (`lib/utils.test.ts`)

**Test Statistics:**
- **Total Tests:** 324 tests across 27 test suites
- **Backend Unit:** 195 tests across 14 test suites
- **Backend Integration:** 44 tests across 5 test suites
- **Frontend:** 85 tests across 8 test suites (component tests, utility tests, API tests, server API tests)

### CI/CD

- All tests run automatically in GitHub Actions on push and pull requests
- Automated deployment job for production (main branch)
- Bundle size analysis in frontend CI

---

## 9. Scripts

### Brand and Model Scripts

```bash
# Add brands and models
npm run add-brands
npm run add-historical
npm run add-grand
npm run add-models
npm run add-french-models
npm run add-german-models
npm run add-italian-models
npm run add-japanese-models
npm run add-american-models
npm run add-commercial-models
npm run add-other-model
npm run seed:all-brands  # Run all brand scripts sequentially (optimized)

# Check and manage
npm run check-brands
npm run check-models
npm run check-citroen
npm run check-duplicates
npm run remove-duplicates
npm run delete-all-brands
npm run cleanup-brands
npm run sync-carquery
npm run generate-listings-for-models
```

### Database Scripts

```bash
# Seeding
npm run seed
npm run reset-and-seed
npm run seed:vin
npm run seed:vehicles
npm run copy-seed-images
npm run create-test-listing

# Management
npm run clear-database
npm run update-titles
npm run check-user
```

### Cache Management

```bash
npm run clear-cache
npm run clear-cache:listings
npm run clear-cache:listing <listing-id>
npm run clear-cache:brands
```

### User Scripts

```bash
npm run make-admin
npm run reset-users
```

### Backup Scripts

```bash
npm run backup
npm run backup -- --output-dir /path/to/backups
npm run backup -- --keep-days 60
```

All scripts are located in `backend/src/scripts/` and can be executed via npm commands.

---

## 10. SEO & Analytics

### SEO Optimizations

#### Meta Tags
- **Comprehensive metadata** (title, description, keywords) on all pages
- **Open Graph tags** for social media sharing:
  - `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `og:site_name`, `og:locale`
  - All URLs are absolute (using `NEXT_PUBLIC_SITE_URL`)
  - Image size: 1200×630 pixels
- **Twitter Cards** (`summary_large_image`) with title, description, and image
- **Canonical URLs** for all pages
- **Dynamic meta tags for listings** (`/listings/[id]`):
  - Title generated from vehicle info (brand + model + year)
  - Description from listing content (first 160 characters, HTML stripped)
  - Image from listing's main photo or fallback to default OG image
  - URL: `https://your-domain.com/listings/{id}`
- **Static meta tags for key pages**:
  - Homepage (`/`): Static OG tags with platform description
  - Auth pages (`/login`, `/register`, `/reset-password`): Page-specific descriptions
  - Legal pages (`/terms`, `/privacy`, `/faq`): Content-specific descriptions
- **Meta description length**: All descriptions are optimized to 110-160 characters (Open Graph recommendation)
- **H1 tags**: All pages have proper `<h1>` tags:
  - Listing pages: Dynamic H1 from vehicle info (brand + model + year) with fallback
  - Other pages: Page-specific H1 tags

#### Structured Data (Schema.org)
- **Organization Schema** - Business entity information
- **WebSite Schema** - Site structure with SearchAction
- **Vehicle Schema** - Vehicle-specific information for listings
- **Product Schema** - Product information alongside Vehicle schema
- **BreadcrumbList Schema** - Navigation structure

#### Technical SEO
- **Robots.txt** - Proper crawling instructions
- **Sitemap.xml** - Dynamic sitemap with:
  - Static pages (homepage, terms, privacy, FAQ, cookie-settings)
  - Brand landing pages (`/?brand={slug}`) for all brands
  - Brand-model landing pages (`/?brand={slug}&model={slug}`) for popular combinations
  - All active listings (paginated, up to 45,000 listings, revalidated hourly)
- **Sitemap.txt** - Text sitemap with the same URL structure for alternative submission
- **Image optimization** - WebP format, lazy loading, proper alt text
- **Performance** - Compression, security headers, optimized image sizes

### Google Search Console Setup

1. Go to https://search.google.com/search-console
2. Add property: `https://your-domain.com`
3. Choose verification method: **HTML tag**
4. Copy verification code and add to `NEXT_PUBLIC_GOOGLE_VERIFICATION` in `.env.local`
5. Restart server and verify
6. Submit sitemap: `https://your-domain.com/sitemap.xml`

### Google Analytics Setup

1. Go to https://analytics.google.com/
2. Create account: "Your Platform Name"
3. Create property: "Your Platform Website"
4. Create data stream: Web → `https://your-domain.com`
5. Copy Measurement ID (format: `G-XXXXXXXXXX`)
6. Add to `NEXT_PUBLIC_GA_ID` in `.env.local` (or production environment variables)
7. Component `GoogleAnalytics.tsx` is already created and integrated

#### Google Analytics Features

**Consent Mode v2:**
- Implements Google Analytics Consent Mode v2 for GDPR compliance
- Analytics are disabled by default until user grants consent
- Consent can be managed via `/cookie-settings` page
- All events respect user consent preferences

**Tracked Events:**
- `view_item` - When user views a listing detail page
- `search` - When user performs search/filtering
- `add_to_wishlist` / `remove_from_wishlist` - Favorite management
- `add_to_comparison` / `remove_from_comparison` - Car comparison
- `contact_seller` - When user contacts seller (phone/Viber/WhatsApp/Telegram)
- `create_listing` - When user creates a new listing
- `save_filter` - When user saves a search filter
- `login` / `sign_up` - Authentication events
- `conversion_event_page_view` - Homepage conversion tracking

All events are sent only after user grants analytics consent.

#### Google Ads Conversion Tracking

**Architecture:**
The project uses the recommended approach:
1. **Google Analytics 4 (GA4)** - tracks all user events
2. **Google Ads conversions** - imported from GA4 (the only recommended method)

**Data Flow:**
```
User → Site → GA4 (all events) → Google Ads (only conversions)
```

**Setup Steps:**

1. **Create events in GA4:**
   - Go to Google Analytics → Events → Create Event
   - Mark events as conversions:
     - `conversion_event_page_view` (Homepage view)
     - `sign_up` (User registration)
     - `create_listing` (Listing creation)

2. **Link GA4 to Google Ads:**
   - In Google Ads: Tools & Settings → Linked Accounts
   - Find Google Analytics (GA4)
   - Click "Link" and select your GA4 property
   - Enable "Import conversions from Google Analytics"

3. **Import conversions:**
   - Go to Goals → Conversions
   - Click "+" → Import
   - Select "Google Analytics (GA4)"
   - Select events to import:
     - ✅ `conversion_event_page_view`
     - ✅ `sign_up`
     - ✅ `create_listing`

4. **Configure each conversion:**
   - **Category:** Page views / Registration
   - **Optimization:** Main action
   - **Value:** Use default or from GA4
   - **Attribution:** Data-driven (Recommended)
   - **Conversion window:** 1-90 days depending on conversion type

**Main Conversions:**
- **Homepage view** (`conversion_event_page_view`) - 1 day window, high priority
- **User registration** (`sign_up`) - 30 days window, high priority
- **Listing creation** (`create_listing`) - 90 days window, high priority

**Verification:**
1. Check events in GA4 real-time reports
2. Check conversions in Google Ads (may take 24-48 hours for first data)
3. Use Google Tag Assistant for debugging

**Common Issues:**
- **Conversions not recording:** Check events are sent correctly, verify user consent
- **Data delay:** Normal - GA4 data updates in Google Ads every 3-24 hours
- **Duplicate conversions:** Use only import from GA4, don't configure events directly in Google Ads

For detailed setup instructions, see [Google Ads Help](https://support.google.com/google-ads/answer/1727054).

### Cloudflare Setup (Optional)

**Code is already ready for Cloudflare!** ✅

The backend has `trust proxy: true` configured, which correctly identifies real user IP through Cloudflare.

**Setup Steps:**
1. Register on Cloudflare (free)
2. Add domain
3. Change DNS servers at registrar
4. Configure caching rules (cache `/uploads/*`, bypass `/api/*`)
5. Enable SSL/TLS (Full strict mode)
6. Enable WAF and Bot Protection

See [DEPLOYMENT.md](./DEPLOYMENT.md#72-rendercom-deployment) for CloudFront CDN setup instructions (CloudFront is AWS's CDN service, similar to Cloudflare).

---

## 11. Performance Optimizations

### Database Optimizations
- Comprehensive indexing strategy with partial and composite indexes
- **Search query optimization:**
  - Composite indexes for search sorting: `(is_promoted DESC, created_at DESC)`, `(is_promoted DESC, price ASC)`, `(is_promoted DESC, views DESC)` with `WHERE status = 'Active'`
  - Index on `vehicles.year DESC` for year-based sorting
  - Selective field selection in queries to reduce data transfer by ~25-40%
- Triggers for automatic updates and cleanup
- Connection pooling (min 5, max 20 connections)
- Full-text search support with GIN indexes (if pg_trgm available)

### Frontend Optimizations
- **Server-side data fetching:** Initial listings data loaded on server using Next.js Server Components and native `fetch` API, improving SEO and initial page load performance
- **Request deduplication:** `React.cache()` wrapper for server-side functions (`fetchBrands`, `fetchModelsByBrands`, `getListings`) eliminates duplicate API calls, reducing initial page load time by ~40-50%
- **Centralized search parameter parsing:** Shared `lib/search-params.ts` module eliminates ~200 lines of duplicate code and provides unified logic for URL parameter parsing, base64 encoding/decoding, and slug-to-ID conversion
- **Optimized search filters:** Refactored `SearchFilters.tsx` component split into 5 custom hooks (`useSearchFiltersSync`, `useVehicleType`, `useSearchTabs`, `useFilterHandlers`, `useFilterOptions`) and 3 modular components (`VehicleTypeSelector`, `SearchTabs`, `SearchFormActions`), reducing main component from 1796 to 473 lines (73% reduction)
- **Unified listing fetch logic:** Merged `fetchListings` and `handleLoadMore` functions into a single unified function, eliminating ~180 lines of duplicate code
- **Component memoization:** React.memo, useMemo, useCallback for preventing unnecessary re-renders
  - ListingCard wrapped in React.memo for optimal re-render performance
  - Memoized event handlers in Header, SearchFilters, and other interactive components
- **Non-blocking updates:** startTransition for deferring non-urgent state updates, improving INP (Interaction to Next Paint)
  - Favorite toggle operations use startTransition to prevent blocking user interactions
  - Navigation and filter updates wrapped in startTransition
- **Deferred value updates:** useDeferredValue for delaying expensive computations
  - Search query filtering in Dropdown and MultiSelectDropdown components
  - Listing grid updates deferred to prevent blocking during data fetching
- Next.js built-in bundle optimization (removed custom webpack splitChunks configuration)
- **Image optimization with Next.js Image component:**
  - Automatic optimization for external images via `remotePatterns` configuration
  - Conditional `unoptimized` prop for localhost images in development
  - Proper `sizes` attribute for responsive image loading - Next.js automatically generates appropriate image sizes for mobile and desktop
  - Optimized quality settings: 65% for listing cards (800px width), 70% for management cards (900px), 75% for detail pages (1200px)
  - Priority loading for first 8 visible images in grid to improve LCP
  - Next.js Image component handles responsive image loading automatically via `srcSet` based on `sizes` attribute
  - Improved sizes attributes for better responsive image selection across breakpoints
- **Image preview system:** Simplified, efficient image preview and photo viewer system
  - **Thumbnail switching:** Instant switching when images are in browser cache (thumbnails and preview use same URL)
  - **Simple preloading:** Next image preloaded using `new window.Image()` - browser manages caching automatically
  - **Loading states:** Loader only shown when image is actually loading, with 1s minimum display time to prevent flicker
  - **Modal viewer:** Full-screen photo viewer with keyboard navigation and swipe gestures
  - **Performance:** 80% code reduction, instant cache switching, no artificial delays
  - See [IMAGE_PREVIEW.md](../features/IMAGE_PREVIEW.md) for complete documentation
- **Race condition prevention:** Loading states and request guards to prevent duplicate API calls
  - Favorite toggle button disabled during operation with visual feedback
  - Ref-based guards to prevent concurrent requests
- Third-party scripts optimization (Google Analytics, Google Tag Manager) using `lazyOnload` strategy to reduce Total Blocking Time (TBT)
- **Resource hints optimization:**
  - Static preconnect to API domain in `layout.tsx` for faster image loading (server-rendered, no JS required)
  - DNS-prefetch and preconnect for Google Tag Manager (server-rendered in `layout.tsx`)
  - Resource hints are included in initial HTML, allowing browsers to establish connections immediately
- Set-based lookups in MultiSelectDropdown for O(1) performance instead of O(n) with Array.includes()
- Optimized SortDropdown with memoized sort key resolution
- URL parameter synchronization for search filters and sorting
- Lazy loading for images with priority for above-the-fold content
- Skeleton loaders for improved UX
- **PWA Support:** Service Worker with intelligent caching strategy
  - Static assets cached permanently (CSS, JS, images, fonts)
  - API responses cached with 1 hour TTL (stale-while-revalidate strategy)
  - Page caching for specific routes (favorites, profile, my-listings, listing detail) with 1 hour TTL
  - Automatic cache cleanup for expired entries
  - Offline page support
  - PWA installation support for iOS and Android with tabbed modal interface
  - Installation instructions with keyword highlighting and browser compatibility notes
- Optimistic UI updates for car comparison (no flickering on item removal)
- Cached filter loading to prevent skeleton flickering on tab switches
- Zustand stores with persist middleware for favorites and comparisons (localStorage)
- **Collapsible description block:** Long listing descriptions are automatically collapsed to 400px (including padding, title, text, and button) with expand/collapse functionality
  - Smooth animation (0.4s ease-in-out) between collapsed (400px) and expanded (full height) states
  - Gradient overlay at bottom when collapsed to indicate more content
  - Button positioned absolutely at bottom with z-index above gradient
  - Auto-scroll to block start (with 110px offset for header) when collapsing
  - Skeleton loader reserves 400px height during initial load to prevent CLS
  - Height measurement after content hydration (100ms delay) to account for formatted text
  - Component: `components/ListingPage/ListingPageDescription.tsx`

### Redis Optimizations
- SCAN instead of KEYS for better performance
- Batch operations
- Proper TTL management

### Code Quality
- TypeScript strict mode enabled in backend
- CI/CD automation
- Automated bundle analysis
- **ESLint with custom rules:**
  - `no-hardcoded-text` - Enforces use of translation keys instead of hardcoded text
  - `import/order` - Ensures consistent import ordering
  - TypeScript and React rules for code quality
  - See [`frontend/docs/LINTING.md`](../frontend/docs/LINTING.md) for complete linting guide

---

## 12. Project Restart

### Full Restart

```bash
# Stop all processes (Ctrl+C in terminals)

# Install/update dependencies
npm run install:all

# Ensure database is running
docker-compose up -d

# Create uploads folder (if needed)
mkdir -p backend/uploads

# Start both servers
npm run dev
```

### Quick Restart

If already running:
1. In backend terminal: `Ctrl+C`, then `npm run start:dev`
2. In frontend terminal: `Ctrl+C`, then `npm run dev`

Or use `npm run dev` in root - it will start both servers.

### Verification

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API check: http://localhost:4000 (should show "PPCSL API v1.0")

---

## Additional Resources

- **API Documentation:** Swagger available at `/api` endpoint (when running)
- **Project README:** See `README.md` in project root
- **Deployment Guide:** See `DEPLOYMENT.md` for production deployment
- **TODO List:** See `TODO.md` for project tasks

---

## 13. CI/CD Configuration

Complete guide for setting up Continuous Integration and Continuous Deployment (CI/CD) for PPCSL core and platform-specific repositories.

### 13.1. Overview

The CI/CD system is designed to:
- **Automatically test** code changes in PPCSL core
- **Verify code quality** (linting, formatting, TypeScript type checking)
- **Update submodules** in platform repositories when core changes
- **Build and deploy** platform-specific applications independently
- **Maintain separation** between core and platform-specific code

### 13.2. Architecture

```
PPCSL (Core Repository)
    │
    ├─── On push to main:
    │    ├── Run tests (frontend + backend)
    │    ├── Run linters and formatters
    │    ├── TypeScript type checking
    │    └── Update submodules in platform repos
    │
    └─── Platform Repositories (e.g., kupito.club)
         │
         ├─── On submodule update or push:
         │    ├── Copy locale files to core (optional: translations load from root)
         │    ├── Copy theme files to core (required: TypeScript modules)
         │    ├── Copy config files to core (required: TypeScript modules)
         │    ├── Install dependencies
         │    ├── Build frontend and backend
         │    └── Deploy to production
```

### 13.3. PPCSL Core CI/CD

**Workflow File:** `.github/workflows/ci.yml` in PPCSL repository

**Jobs:**
1. **Test Jobs:**
   - Backend: Installs dependencies, runs linters, runs unit and integration tests
   - Frontend: Installs dependencies, runs linters, checks formatting, runs tests
   - Validates code quality

2. **Type Check Job:**
   - Runs TypeScript type checking (`tsc --noEmit`) for both frontend and backend
   - Verifies code compiles without errors (without creating build artifacts)

3. **Update Platforms Job:**
   - Only runs on push to `main` branch
   - Clones platform repositories
   - Updates submodule reference to latest commit
   - Commits and pushes changes

**Required Secrets:**
- `PAT_TOKEN` (optional) - Personal Access Token with `repo` scope for pushing to platform repositories
  - If not set, submodule updates will be skipped with a warning
  - To create: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
  - Required scopes: `repo` (full control of private repositories)

### 13.4. Platform-Specific CI/CD (kupito.club)

**Workflow File:** `.github/workflows/ci.yml` in kupito.club repository

**Steps:**
1. **Checkout with submodules:**
   - Clones repository with PPCSL core submodule
   - Initializes and updates submodules recursively

2. **Copy platform-specific files:**
   - Copies `locales/ro.json`, `locales/ru.json` to `core/frontend/lib/locales/` (frontend; no backend folder in frontend)
   - Copies `locales/backend/*.json` to `core/backend/src/common/i18n/` (backend)
   - Copies `theme/` to `core/frontend/lib/theme/`
   - Copies `config/` to `core/frontend/lib/config/`

   **Note:** Translation files are loaded from the copied files in core at build/runtime.

3. **Install dependencies:**
   - Installs frontend and backend dependencies

4. **Run linters:**
   - Validates code quality

5. **Build:**
   - Builds frontend with platform-specific configuration
   - Builds backend

6. **Deploy:**
   - Deploys to production environment

**Required Secrets:**
- `PAT_TOKEN` (required) - Personal Access Token with `repo` scope for accessing private PPCSL submodule
  - If not set, submodule checkout will fail with "Repository not found" error
  - To create: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
  - Required scopes: `repo` (full control of private repositories)
- `API_URL` (required) - Backend API URL for production builds

**Note:** The `actions/checkout@v4` action must be configured with `token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}` to access private submodules. The default `GITHUB_TOKEN` may not have sufficient permissions for private submodules.

### 13.4.1. Render.com Deployment Configuration

For deploying kupito.club on Render.com, configure the following:

**Root Directory:** (leave empty)

**Environment Variables:**
- `GITHUB_PAT` - Personal Access Token with `repo` scope for accessing private PPCSL submodule
- `NEXT_PUBLIC_COUNTRY` - Set to your platform's country code (e.g. `md` for Moldova)
- `NEXT_PUBLIC_SITE_URL` - Set to `https://kupito.club`
- `NEXT_PUBLIC_API_URL` - Backend API URL

**Build Command:**
```bash
git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && git submodule update --init --recursive && npm run prepare:build && cd core/frontend && npm ci && npm run build
```

**Start Command:**
```bash
cd core/frontend && npm start
```

**Important:** The Build Command must:
1. Configure git credentials for accessing private submodule
2. Initialize and update the submodule
3. Copy platform-specific files via `npm run prepare:build` (frontend locales ro/ru, backend locales, theme, config, assets)
4. Install dependencies and build the application

### 13.4.2. Render.com Backend Deployment Configuration

For deploying kupito.club backend on Render.com, configure the following:

**Root Directory:** (leave empty)

**Environment Variables:**
- `GITHUB_PAT` - Personal Access Token with `repo` scope for accessing private PPCSL submodule
- `NODE_ENV` - Set to `production`
- `PORT` - Automatically set by Render (use `process.env.PORT || 4000` in code)
- `DB_HOST` - PostgreSQL database host
- `DB_PORT` - PostgreSQL port (usually `5432`)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secure random key for JWT tokens
- `FRONTEND_URL` - Frontend URL (e.g., `https://kupito.club`)
- `API_URL` - Backend API URL (e.g., `https://kupito-backend.onrender.com`)
- `AWS_ACCESS_KEY_ID` - AWS S3 access key (required for file storage)
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret key (required for file storage)
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_REGION` - AWS region (e.g., `eu-north-1`)
- `REDIS_HOST` - Redis host (if using external Redis)
- `REDIS_PORT` - Redis port (if using external Redis)

**Build Command:**
```bash
git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && git submodule update --init --recursive && cd core/backend && npm ci && npm run build
```

**Start Command:**
```bash
cd core/backend && npm run start:prod
```

**Important:** The Build Command must:
1. Configure git credentials for accessing private submodule
2. Initialize and update the submodule
3. Install dependencies and build the backend application

**After First Deployment:**
1. Run database migrations via Render Shell:
   ```bash
   cd core/backend && npm run migration:run
   ```

2. Load brands and models:
   ```bash
   cd core/backend && npm run seed:all-brands
   ```

3. Create admin user:
   ```bash
   cd core/backend && npm run make-admin:prod -- --email your-email@example.com --password your-secure-password
   ```

### 13.5. Workflow Overview

**Development Workflow:**
1. Developer makes changes in PPCSL core
2. Commits and pushes to PPCSL/main
3. PPCSL CI/CD triggers:
   - Tests pass
   - Linters and formatters pass
   - TypeScript type checking passes
   - Updates kupito.club submodule
4. kupito.club CI/CD triggers:
   - Copies locale/theme/config files
   - Builds with platform config
   - Deploys to production

**Platform-Specific Changes:**
1. Developer makes changes in kupito.club
2. Updates locales/theme/config files
3. Commits and pushes to kupito.club/main
4. kupito.club CI/CD triggers:
   - Copies files to core
   - Builds with new config
   - Deploys to production

### 13.6. Troubleshooting

**Submodule Update Fails:**
- Ensure `PAT_TOKEN` secret is set in repository settings
- PAT must have `repo` scope to push to other repositories
- To create PAT: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)

**Submodule Checkout Fails in kupito.club (Repository not found):**
- Ensure `PAT_TOKEN` secret is set in kupito.club repository settings
- The `actions/checkout@v4` action must be configured with `token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}`
- `GITHUB_TOKEN` may not have sufficient permissions to access private submodules
- PAT must have `repo` scope to access private repositories
- Verify that the submodule URL in `.gitmodules` is correct and points to the right repository
- Add secret: Repository Settings → Secrets and variables → Actions → New repository secret → Name: `PAT_TOKEN`

**Build Fails After Submodule Update:**
- Verify copy commands in workflow are correct
- Check file paths match repository structure
- Ensure files exist in platform repository

**Tests Fail in Platform CI/CD:**
- Tests should run in PPCSL core CI/CD only
- Platform CI/CD should only run build and deployment
- Remove test steps from platform workflow if needed

**Why No Build in PPCSL Core:**
- Build requires locale-specific files (translations, theme, config) that don't exist in core
- Build in core would use default values, not reflecting real production builds
- Build is done in platform repositories (kupito.club) where locale files are available
- TypeScript type checking (`tsc --noEmit`) is sufficient to verify code compiles correctly

**Deployment Fails:**
- Check deployment credentials/secrets
- Verify deployment commands are correct
- Check deployment target is accessible
- Review deployment logs for specific errors

### 13.7. Best Practices

1. **Always test** core changes locally before pushing
2. **Monitor builds** - ensure all platform builds succeed after core updates
3. **Use semantic versioning** for major core changes
4. **Document breaking changes** in core that affect platforms
5. **Keep secrets secure** - never commit secrets to repository
6. **Use environment-specific configurations** for different deployment targets
7. **Set up notifications** for build failures
8. **Review deployment logs** regularly
9. **Test submodule updates** in staging before production
10. **Backup** platform-specific files before major core updates

For detailed implementation, see [Multi-Repository](./MULTI_REPOSITORY.md).

---

## 13. Paid Promotion Feature

The platform includes a paid promotion feature (MVP) that allows users to promote their listings for higher visibility in search results.

### Overview

- **Status:** ✅ MVP fully implemented
- **Documentation:** See [`docs/PAID_PROMOTION.md`](./PAID_PROMOTION.md) for complete documentation
- **Access Control:** Controlled via `PROMOTION_ACCESS` environment variable

### Key Features

- Promoted listings appear first in search results
- Visual highlighting with green border and "Promoted" tag
- Promotion periods: 1, 7, 14, or 30 days (unlimited for admins)
- Promotion time is frozen when listing is paused
- Promotion history tracking
- Automatic expiration of expired promotions
- Server-side pagination and filtering in admin panel

### Testing

Comprehensive test coverage for promotion features:

- **P0 (Critical):** `togglePromotion`, access control, validation
- **P1 (Important):** Promotion history, sorting, pause/resume behavior

Run tests:
```bash
cd backend && npm run test -- listings.service.spec.ts
```

### Related Documentation

- [`docs/PAID_PROMOTION.md`](./PAID_PROMOTION.md) - Complete promotion feature documentation
- [`backend/src/listings/listings.service.spec.ts`](../backend/src/listings/listings.service.spec.ts) - Test suite

---

**Last Updated:** 2026-01-16
**Version:** 1.10

### Recent Updates
- **Slug-based URLs & SEO Improvements (2025-12-17):**
  - Implemented slug-based URLs for brand and model filters (`?brand=toyota&model=yaris`) for better SEO and user-friendly URLs
  - Added utility functions `createSlug()` and `slugToName()` in `lib/utils.ts` for URL-friendly text conversion
  - Updated sitemap to include brand landing pages (`/?brand={slug}`) and brand-model combinations (`/?brand={slug}&model={slug}`)
  - Enhanced SavedFiltersList to use slug-based URLs when applying saved filters
  - Improved sitemap scalability with pagination support (up to 45,000 listing URLs)
  - Fixed scroll restoration bug on homepage that was overwriting restored scroll position
- **Core Web Vitals & INP Optimizations (2025-01-29):**
  - Implemented startTransition for non-blocking state updates, improving INP (Interaction to Next Paint)
  - Added useDeferredValue for deferred search filtering and listing updates
  - Optimized image quality and sizes: reduced thumbnail quality to 65% (800px), improved responsive sizes attributes
  - Added priority loading for first 8 visible images in grid to improve LCP
  - Enhanced component memoization: React.memo for ListingCard, useCallback for all event handlers
  - Fixed race conditions in favorite toggle with loading states and request guards
  - Optimized SearchFilters: Complete refactoring into 5 hooks and 3 components, reducing from 1796 to 473 lines (73% reduction), improved maintainability and testability
- **Performance Optimizations (2025-01):**
  - Migrated initial data fetching to Server Components for improved SEO and initial page load
  - Optimized third-party scripts (Google Analytics, Google Tag Manager) with `lazyOnload` strategy
  - Enhanced image optimization with proper Next.js Image configuration
  - Removed custom webpack configuration, relying on Next.js built-in optimizations
- Added car comparison feature (up to 3 cars)
- Added status filters with counters on My Listings page
- Added tab counters on Favorites page
- Added breadcrumbs navigation on key pages
- Optimized filter loading to prevent skeleton flickering
- Comprehensive test coverage: 52 frontend tests across 4 test suites, 195 backend tests across 14 test suites


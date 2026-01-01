# PPCSL - Platform for Posting Car Sale Listings

Core application framework for creating car marketplace platforms for different countries.

## Documentation Structure

This directory contains **general project documentation**. For component-specific documentation, see:
- **Backend documentation:** [`../backend/docs/`](../backend/docs/)
- **Frontend documentation:** [`../frontend/docs/`](../frontend/docs/)

## Quick Start

```bash
npm run install:all          # Install dependencies
docker-compose up -d         # Start database
npm run dev                  # Start both frontend and backend
```

**Frontend:** http://localhost:3000 | **Backend:** http://localhost:4000

**For detailed setup instructions, see:**
- **[Local Development Guide](LOCAL_DEVELOPMENT.md)** - Complete local development setup
- **[Technical Documentation](TECHNICAL.md#2-development-setup)** - Development setup details
- **[Environment Variables](TECHNICAL.md#3-environment-variables)** - Complete environment variables reference

<details>
<summary><b>Technologies</b></summary>

- **Frontend:** Next.js 16, React 19, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Storage:** AWS S3 for image storage, AWS CloudFront CDN for delivery

</details>

<details>
<summary><b>Core Features</b></summary>

- User registration and authentication (Individual and Business)
- JWT authentication with refresh tokens (1 hour access token, 7 days refresh token)
- Automatic token refresh on expiration
- SMS verification during registration via Twilio (with IP-based brute force protection)
- Phone number verification stored in database
- Create, edit, and publish listings
  - Edit non-closed listings (Active or Paused status)
  - Edit button available on "My Listings" page
  - All fields can be updated including vehicle specifications
  - Price validation (integers only)
  - Equipment field for vehicle equipment selection (air conditioning, leather seats, navigation, etc.)
  - Power in kilowatts (power_kw) field
  - Registration date format validation (MM.YYYY, month must be 2 digits)
- Extended search and filtering with advanced filters
- Sort functionality (by date, popularity, price, year) with URL parameter synchronization
- Multi-select dropdowns with search, categories, and action buttons
- Optimized dropdown components with Set-based lookups for performance
- **Saved filters:** Save up to 20 filter sets per user with custom names, edit and delete saved filters, apply saved filters with one click
- **Car comparison:** Compare up to 3 cars simultaneously with detailed side-by-side comparison table
- Listing limits (100 for Individuals, 100 for Business)
- Listing statuses (Active, Paused, Closed)
- Automatic listing closure after 5 months (non-promoted listings only; promoted listings close automatically after promotion expires)
- Custom 404 and error pages
- Favorites (for authenticated users and guests) with tab counters
- **My Listings page:** Status filters with counters (All, Active, Paused, Closed) for easy management
- VIN search functionality
- Image upload with automatic WebP conversion and adaptive quality optimization (75% default quality)
- **Paid Promotion Feature (MVP):** Promote listings for higher visibility
  - Promoted listings appear first in search results with visual highlighting
  - Promotion periods: 1, 7, 14, or 30 days
  - Promotion history tracking
  - Access control via environment variable
  - See [`docs/PAID_PROMOTION.md`](./PAID_PROMOTION.md) for details
- Admin panel for management

</details>

<details>
<summary><b>Project Structure</b></summary>

```
PPCSL/
├── frontend/          # Next.js application
│   ├── app/          # Pages and routes
│   ├── components/   # React components
│   └── lib/          # Utilities and API clients
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Authentication
│   │   ├── users/    # Users
│   │   ├── listings/ # Listings
│   │   ├── favorites/# Favorites
│   │   ├── saved-filters/ # Saved search filters
│   │   ├── brands/   # Brands and models
│   │   ├── admin/    # Admin panel
│   │   └── scripts/  # Utility scripts
├── docs/             # Documentation
└── docker-compose.yml # Database configuration
```

</details>

<details>
<summary><b>API Endpoints</b></summary>

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login (returns access_token and refresh_token)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Current user profile
- `PATCH /api/auth/profile` - Update user profile
- `DELETE /api/auth/profile` - Delete user account
- `POST /api/auth/send-sms` - Send SMS verification code
- `POST /api/auth/verify-sms` - Verify SMS code (with IP-based brute force protection)
- `POST /api/auth/verify-phone` - Verify phone number (JWT required)
- `POST /api/auth/check-phone` - Check if phone number is available
- `POST /api/auth/change-phone-request` - Request phone number change
- `POST /api/auth/change-phone-verify` - Verify phone number change
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/verify-reset-code` - Verify password reset code
- `POST /api/auth/reset-password` - Reset password

### Listings
- `GET /api/listings` - List listings (with filters)
- `GET /api/listings/:id` - Listing details
- `POST /api/listings` - Create listing
- `PATCH /api/listings/:id` - Update listing (only non-closed listings)
- `POST /api/listings/:id/publish` - Publish
- `POST /api/listings/:id/pause` - Pause
- `POST /api/listings/:id/close` - Close
- `GET /api/listings/my` - My listings
- `GET /api/listings/user/:userId/active` - User's active listings
- `GET /api/listings/vin/:vin` - Find listings by VIN (with optional excludeId query param)
- `POST /api/listings/refresh-dates` - Refresh all user's listing dates
- `POST /api/listings/cron/close-old` - Close old listings (cron job endpoint, requires x-cron-secret header)

### Favorites
- `GET /api/favorites` - Favorites list
- `POST /api/favorites/:id` - Add to favorites
- `DELETE /api/favorites/:id` - Remove from favorites
- `GET /api/favorites/check/:id` - Check if listing is in favorites

### Saved Filters
- `GET /api/saved-filters` - Get all saved filters (authenticated users)
- `POST /api/saved-filters` - Create saved filter (max 20 per user)
- `PATCH /api/saved-filters/:id` - Update saved filter name
- `DELETE /api/saved-filters/:id` - Delete saved filter

### Upload
- `POST /api/upload/image` - Upload image (JWT required)
  - Automatically applies watermark (logo + domain text, configurable via WATERMARK_DOMAIN)
  - Images are resized, watermarked, and converted to WebP format
- `GET /api/upload/image/:filename` - Get optimized image version (query params: `quality`, `width`)

### Brands & Cities
- `GET /api/brands` - Get all brands
- `GET /api/brands/:id/models` - Get models by brand ID
- `GET /api/brands/name/:name/models` - Get models by brand name
- `POST /api/brands/name/:name/models` - Add models to existing brand
- `DELETE /api/brands/all` - Delete all brands (admin only)
- `GET /api/cities` - Get all cities

### Admin Panel
- `GET /api/admin/users` - All users list
- `GET /api/admin/listings` - All listings list
- `GET /api/admin/stats` - Statistics
- `PATCH /api/admin/listings/:id/status` - Change listing status
- `GET /api/admin/users/:id/listings` - User's listings
- `PATCH /api/admin/users/:id/toggle-status` - Enable/disable user
  - When deactivating a user, all their refresh tokens are automatically revoked
  - Deactivated users cannot log in or refresh their tokens

### Health & Monitoring
- `GET /` - API status check
- `GET /health` - Health check endpoint (checks database and Redis connectivity)

</details>

<details>
<summary><b>Implementation Features</b></summary>

- Automatic listing closure after 5 months based on `last_updated_at` timestamp (cron job runs daily at midnight)
  - Non-promoted listings older than 5 months are closed automatically
  - Promoted listings with active promotion are not closed automatically
  - Promoted listings with expired promotion are closed automatically on the next cron run
- Date refresh feature with 48-hour cooldown - users can refresh `last_updated_at` for all active listings to reset auto-close timer
- Active listing limit validation on publish
- Favorites stored in localStorage for guests and on server for authenticated users
- **Saved filters:** Users can save up to 20 filter sets with custom names, edit and delete them, apply with one click
- **Car comparison:** Users can compare up to 3 cars simultaneously. Comparison data stored locally, cleared on logout. Unauthorized users can add cars to comparison, which are automatically added after login/registration
- **Breadcrumbs:** Navigation breadcrumbs on favorites, my listings, and comparison pages
- PostgreSQL Full-Text Search for search functionality
- **Database optimizations:** Comprehensive indexing, triggers for data integrity, connection pooling
- **Health monitoring:** Health check endpoint with database and Redis connectivity checks
- **Automated backups:** Database backup scripts with cron support for production
- **Code quality:** TypeScript strict mode, CI/CD automation, bundle optimization
- **Performance:** Frontend memoization, React.memo, startTransition, useDeferredValue, Redis cache optimization, lazy loading, Core Web Vitals optimizations (INP, LCP)
- **Analytics:** Google Analytics integration
- **SEO & Metadata:**
  - Full Open Graph and Twitter Card meta tags on all pages
  - Dynamic meta tags for listing pages (generated from vehicle data)
  - Static meta tags for key pages (homepage, auth, legal pages)
  - Optimized meta descriptions (110-160 characters)
  - Proper H1 tags on all pages with fallback logic
  - Canonical URLs for all pages
  - Absolute URLs for all OG images and links
- Image optimization (resize, compress, convert to WebP with adaptive quality, lazy loading, SEO-friendly)
- **File upload security:** Magic byte validation, metadata checking, dimension limits
- **HTML sanitization:** Backend sanitization for listing descriptions to prevent XSS attacks
- Responsive design with TailwindCSS
- VIN search with privacy protection
- Date refresh feature with 48-hour cooldown
- Smart listing loading: Auto-load 80 listings, then "Load More" button (40 per click)

</details>

## Testing

The project includes comprehensive testing:

- **Unit Tests:** Jest-based tests for services and components
- **Integration Tests:** API contract tests against Swagger specification
- **Frontend Tests:** 188 tests across 13 test suites covering components, utilities, API clients, and server-side functions
- **Backend Tests:** 266 tests across 20 test suites
- **CI/CD:** Automated testing in GitHub Actions

### Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend integration tests (requires database)
cd backend && npm run test:integration

# Frontend tests
cd frontend && npm test
```

**Test Coverage Highlights:**
- ✅ All critical backend services, controllers, and guards
- ✅ All critical frontend components (ListingCard, SearchFilters, ListingForm, ListingGrid, AuthProvider)
- ✅ Server-side data fetching functions (`lib/server-api.ts`)
- ✅ Client-side API functions and utilities

For more details, see [Technical Documentation](TECHNICAL.md#8-testing) and [Frontend Test Review](../frontend/docs/TEST_REVIEW.md).

## Documentation

### General Documentation

- **[Platform Setup Guide](PLATFORM_GUIDE.md)** - ⭐ **Complete guide for creating new platforms and where to make code changes**
- **[Technical Documentation](TECHNICAL.md)** - Complete technical documentation (architecture, API, database, security, testing, scripts, SEO, CI/CD, Google Ads setup)
- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions (VPS, Render.com, Namecheap, SSH setup, staging)
- **[Multi-Repository Architecture](MULTI_REPOSITORY_ARCHITECTURE.md)** - Multi-repository architecture guide (includes PPCSL overview and pre-migration checklist)
- **[SEO Audit](SEO_AUDIT.md)** - SEO audit and Google Search Console issues & fixes
- **PWA Features** - Progressive Web App fully implemented with Service Worker, offline support, and installation (see Frontend Documentation for details)
- **[TODO List](TODO.md)** - All project tasks and todos ⚠️ **IMPORTANT**

### Backend Documentation

- **[Backend Documentation](../backend/docs/README.md)** - Backend-specific documentation
  - **[Scripts Guide](../backend/docs/SCRIPTS.md)** - Scripts organization and usage
  - **[Testing Guide](../backend/docs/TESTING.md)** - Integration testing documentation

### Frontend Documentation

- **[Frontend Documentation](../frontend/docs/README.md)** - Frontend-specific documentation
  - **[Design System](../frontend/docs/DESIGN_SYSTEM.md)** - Design system and UI components
  - **[Storybook Guide](../frontend/docs/STORYBOOK.md)** - Storybook setup guide

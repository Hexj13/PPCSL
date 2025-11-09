# Technical Documentation

Complete technical documentation for the Kupito platform.

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

Platform for selling new and used cars in Macedonia. Users can independently add, edit, pause, and close their listings.

### Core Principles

- Fully free service, no payments, subscriptions, or paid options
- Two user types: **Individual** and **Business**
- Individual users: maximum **3 active listings** simultaneously
- Business users: maximum **20 active listings** simultaneously
- Listings have three statuses: **Active**, **Paused**, **Closed**
- Automatic closing after **5 months** (approximately 150 days) since last update

### Technologies

- **Frontend:** Next.js 16, React 19, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Database:** PostgreSQL 15 with comprehensive indexing and triggers
- **Search:** PostgreSQL Full-Text Search
- **Image Processing:** Sharp library for optimization and WebP conversion
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
createdb kupito
psql postgres
```

In psql:
```sql
CREATE USER kupito WITH PASSWORD 'kupito123';
ALTER DATABASE kupito OWNER TO kupito;
GRANT ALL PRIVILEGES ON DATABASE kupito TO kupito;
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
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito

# Database Connection Pooling (optional)
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# Authentication
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
FRONTEND_URL=http://localhost:3000

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
SMTP_FROM=noreply@kupito.mk
```

### Frontend (`frontend/.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://kupito.mk

# Google Search Console Verification (optional)
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-verification-code

# Google Analytics Measurement ID (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Production Notes

⚠️ **Important:** In production, you **must** set `JWT_SECRET` and `DB_PASSWORD` to secure values. The application will throw an error if `JWT_SECRET` is missing in production mode.

---

## 4. Architecture

### Project Structure

```
Kupito/
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
│   │   ├── brands/   # Brands and models
│   │   ├── admin/    # Admin panel
│   │   └── scripts/  # Utility scripts
├── docs/             # Documentation
└── docker-compose.yml # Database configuration
```

### Key Features

- **Image Processing:** Automatic compression, resizing (max 1920px width), conversion to WebP format (85% quality)
- **Adaptive Quality:** Different quality levels for different contexts (60% for cards, 75% for detail pages, 85% for full-size)
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
```

### Favorites

```http
GET    /api/favorites                 # Get user's favorites
POST   /api/favorites/:id             # Add to favorites
DELETE /api/favorites/:id             # Remove from favorites
GET    /api/favorites/check/:id       # Check if listing is in favorites
```

### Upload

```http
POST /api/upload/image                # Upload and optimize image
GET  /api/upload/image/:filename      # Get optimized image version
                                     # Query params: ?quality=X&width=Y
```

### Admin

```http
GET   /api/admin/users                # Get all users
GET   /api/admin/listings             # Get all listings
GET   /api/admin/stats                # Get statistics
PATCH /api/admin/listings/:id/status  # Change listing status
PATCH /api/admin/users/:id/toggle-status # Enable/disable user
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

**Vehicles Table:**
- `brand_id`, `model_id`, `brand_id + model_id` (composite)
- `year`, `fuel` (partial), `transmission` (partial)
- `body_type`, `mileage_km` (partial), `engine_displ_l` (partial)

**Users Table:**
- `phone` (partial), `type`, `active`, `email` (unique)

#### Triggers

1. **Auto-update `last_updated_at`** - Updates timestamp on listing modifications
2. **Auto-increment views counter** - Increments views when view is recorded
3. **Cleanup listing views** - Removes view records when listing is deleted
4. **Cleanup favorites** - Removes favorite records when listing is deleted

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
export DB_USERNAME=kupito
export DB_PASSWORD=your_password
export DB_NAME=kupito
export BACKUP_DIR=/var/backups/kupito
export KEEP_DAYS=30

./backend/scripts/backup-database.sh
```

#### Automated Backups (Cron)

```bash
# Daily backup at 2 AM
0 2 * * * source /etc/kupito/backup.env && /path/to/kupito/backend/scripts/backup-database.sh >> /var/log/kupito-backup.log 2>&1
```

Backups are saved to `backend/backups/` by default with format: `kupito_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`

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
- Phone number format validation
- Email validation
- VIN length validation (17 characters)
- SMS code validation (6 digits, numeric only)

#### Error Handling
- Global exception filter
- Error logging without exposing details to users
- Unified error messages

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
**Frontend Components:** ✅ Core components tested (ListingCard, SearchFilters, ListingForm, AuthProvider)

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

# Check and manage
npm run check-brands
npm run check-models
npm run delete-all-brands
npm run cleanup-brands
npm run sync-carquery
```

### Database Scripts

```bash
# Seeding
npm run seed
npm run reset-and-seed
npm run seed:vin
npm run seed:vehicles

# Management
npm run clear-database
npm run update-titles
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
- Comprehensive metadata (title, description, keywords)
- Open Graph tags for social media sharing
- Twitter Cards
- Canonical URLs
- Dynamic meta tags for listings

#### Structured Data (Schema.org)
- **Organization Schema** - Business entity information
- **WebSite Schema** - Site structure with SearchAction
- **Vehicle Schema** - Vehicle-specific information for listings
- **Product Schema** - Product information alongside Vehicle schema
- **BreadcrumbList Schema** - Navigation structure

#### Technical SEO
- **Robots.txt** - Proper crawling instructions
- **Sitemap.xml** - Dynamic sitemap with all active listings (revalidated hourly)
- **Image optimization** - WebP format, lazy loading, proper alt text
- **Performance** - Compression, security headers, optimized image sizes

### Google Search Console Setup

1. Go to https://search.google.com/search-console
2. Add property: `https://kupito.mk`
3. Choose verification method: **HTML tag**
4. Copy verification code and add to `NEXT_PUBLIC_GOOGLE_VERIFICATION` in `.env.local`
5. Restart server and verify
6. Submit sitemap: `https://kupito.mk/sitemap.xml`

### Google Analytics Setup

1. Go to https://analytics.google.com/
2. Create account: "Kupito"
3. Create property: "Kupito Website"
4. Create data stream: Web → `https://kupito.mk`
5. Copy Measurement ID (format: `G-XXXXXXXXXX`)
6. Add to `NEXT_PUBLIC_GA_ID` in `.env.local`
7. Component `GoogleAnalytics.tsx` is already created and integrated

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

See `CLOUDFLARE_SETUP.md` for detailed instructions.

---

## 11. Performance Optimizations

### Database Optimizations
- Comprehensive indexing strategy with partial and composite indexes
- Triggers for automatic updates and cleanup
- Connection pooling (min 5, max 20 connections)
- Full-text search support with GIN indexes (if pg_trgm available)

### Frontend Optimizations
- React.memo, useMemo, useCallback for component memoization
- Bundle optimization (webpack splitChunks, lazy loading)
- Image optimization with adaptive quality
- Lazy loading for images
- Skeleton loaders for improved UX

### Redis Optimizations
- SCAN instead of KEYS for better performance
- Batch operations
- Proper TTL management

### Code Quality
- TypeScript strict mode enabled in backend
- CI/CD automation
- Automated bundle analysis

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
- API check: http://localhost:4000 (should show "Kupito API v1.0")

---

## Additional Resources

- **API Documentation:** Swagger available at `/api` endpoint (when running)
- **Project README:** See `README.md` in project root
- **Deployment Guide:** See `DEPLOYMENT.md` for production deployment
- **TODO List:** See `TODO.md` for project tasks

---

**Last Updated:** 2025-01-XX
**Version:** 1.6


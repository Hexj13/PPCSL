# Technical Specification (TS)

Project: Platform for selling new and used cars
Version: 1.2
Date: 2025-11-01

---

## 1. Purpose

Create a simple, free website for posting listings for new and used cars in Macedonia. Users can independently add, edit, pause, and close their listings.

## 2. Core Principles

* Fully free service, no payments, subscriptions, or paid options.
* Two user types: **Individual** and **Business**.
* Individual users can have a maximum of **3 active listings** simultaneously.
* Business users can have a maximum of **20 active listings** simultaneously.
* Listings have three statuses: **Active**, **Paused**, **Closed**.
* Users can manually close listings.
* Listings are automatically closed after **5 months** (approximately 150 days) since the last update.

## 3. Core Features

### Catalog and Search

* **Extended search filters:**
  * Brand and model (with dynamic model loading)
  * Year range (min/max)
  * Price range (min/max) with currency support (MKD, EUR)
  * Mileage range (min/max)
  * City (with searchable dropdown)
  * Fuel type (Petrol, Diesel, Electric, Hybrid, LPG)
  * Transmission (Manual, Automatic, CVT)
  * Body type (Sedan, Hatchback, SUV, Coupe, Convertible, Wagon, Van, Pickup, etc.)
  * Engine displacement range (min/max in liters)
  * Color
  * Doors (2-5)
  * Title (text search)
* **Sorting options:**
  * By date (newest/oldest)
  * By price (low/high)
  * By year (newest/oldest)
* **Pagination:** Numbered pagination with configurable page size (default: 20, max: 100)

### Listing Card

* Car photos (up to 20 images)
* **Image optimization:** Automatic compression, resizing (max 1920px width), conversion to WebP format (85% quality)
* **Adaptive quality:** Different quality levels for different contexts:
  * Listing cards (homepage): 60% quality, max 800px width
  * Listing detail page: 75% quality, max 1200px width
  * Thumbnails: 70% quality, max 400px width
  * Full-size modal view: Original quality (85%)
* Basic specifications: year, engine displacement, mileage, fuel type, transmission, body type, color, doors, city
* **Urgent flag:** Mark listings as urgent (displayed prominently)
* **VIN number:** Optional 17-character VIN code
* **Rich text description:** HTML-formatted description using rich text editor
* Seller contact information
* **Currency support:** MKD, EUR

### Listing Publication

* **Multi-step form:** Basic data → Photos → Publication
* **Image upload:**
  * Supported formats: JPG, JPEG, PNG, GIF, WebP (all converted to WebP on upload)
  * Max file size: 10MB per image
  * Max images per listing: 20 (minimum: 2)
  * Automatic optimization and compression (converted to WebP, 85% quality)
  * Upload via `/api/upload/image` endpoint (JWT required)
* **Active listing limits validation** on publish
* Ability to pause or close a listing
* Automatic closing after 5 months of inactivity (based on `last_updated_at` field)
* **Date refresh feature:** Users can refresh `last_updated_at` for all active listings with 48-hour cooldown period

### User Registration and Authentication

* **User types:**
  * Individual: Phone required, email optional
  * Business: Email required
* **Registration fields:**
  * Type (Individual/Business)
  * Email (required for Business, optional for Individual)
  * Phone (required for Individual, validated format: +country_code + number)
  * Password (min 8 chars, must contain uppercase, lowercase, special character)
  * First name / Last name (for Individual)
  * Company name (for Business)
  * Email notifications preference
  * Social media contact options: Viber, WhatsApp, Telegram
  * Terms and conditions acceptance (required)
* **SMS Verification:**
  * Required for both Individual and Business users during registration
  * 6-digit code verification on separate page (`/verify-phone`)
  * Phone verification status stored in database (`phoneVerified` field)
  * Real SMS delivery via Twilio API
  * Codes stored in Redis with 10-minute TTL
  * Automatic phone number normalization (adds +389 for Macedonian numbers)
  * Test mode: if Twilio not configured, code is logged to console
  * Frontend validation: 10 attempts per code resend, 3 code resends maximum
  * Backend IP-based brute force protection: 40 attempts per IP, 1-hour block
* **Authentication:**
  * Login with email or phone number
  * JWT-based authentication
  * Password hashing with bcrypt (10 rounds)
* **Password Reset:**
  * Password reset via phone number only
  * 3-step flow: request reset → verify SMS code → set new password
  * SMS code sent via Twilio API (6-digit code)
  * Codes stored in Redis with 10-minute TTL (separate from verification codes)
  * Frontend validation: 10 verification attempts per code, cooldown period for resend
  * Backend IP-based brute force protection: 40 attempts per IP, 1-hour block
  * Code is cleared from Redis after successful password reset
  * Password reset page at `/reset-password` with three states: phone input, code verification, new password
* **User profile:** Get current user info via `/api/auth/me`

### Favorites

* Add and remove listings from favorites
* Check if listing is in favorites
* For guests, favorites are stored locally (localStorage via Zustand persist)
* For authenticated users, favorites are stored on the server
* Favorites list with full listing details (including vehicle and user info)
* Automatic sync when user logs in

### VIN Functionality

* **VIN search:** Find previous listings by the same VIN number
* **VIN display:** Shows historical closed listings for the same vehicle
* **Privacy protection:** VIN search results exclude price and seller contact information
* Only closed listings are shown in VIN search results
* Results sorted by update date (newest first)

### Admin Panel

* **Access control:** Admin-only access (JWT + AdminGuard)
* **User management:**
  * View all users
  * View user statistics
  * View user's listings
  * Enable/disable users (toggle active status)
  * Search users by ID, email, phone, first name, last name, or company name
  * Filter users by role (Individual, Business, Admin)
* **Listing management:**
  * View all listings
  * View listing statistics
  * Filter by status (Active, Paused, Closed)
  * Search by listing ID or creator name/email/company
  * Change listing status manually (publish/pause/close buttons)
  * Unified listing card component with detailed vehicle information
  * Display user information (name, company, email, phone) on listing cards
* **Statistics:** User and listing statistics dashboard
* **Tabs interface:** Separate views for listings and users

### Brands and Models

* **Brands API:** Get all available car brands
* **Models API:** Get models by brand ID or brand name
* **Add Models API:** Add new models to existing brands
* **Management Scripts:** Utility scripts for managing brands and models
* Dynamic model loading based on selected brand
* Searchable brand and model dropdowns
* Support for historical models, rare models, and Grand versions
* 79+ brands with 774+ models in database

### Cities

* **Cities API:** Get all available cities in Macedonia
* Bilingual support: Macedonian and English names
* Searchable city dropdown in filters and forms

## 4. Architecture

* **Frontend:** Next.js 14 (SSR for SEO), React 18, TailwindCSS, Zustand (state management)
* **Backend:** Node.js (NestJS), REST API, PostgreSQL, Redis, S3-compatible storage (planned)
* **Database:** PostgreSQL 15 with TypeORM
* **Search:** PostgreSQL Full-Text Search and custom query builder
* **Image processing:** Sharp library for optimization and WebP conversion
* **File storage:** Local file system (`/uploads`) with plans for S3 migration
* **Authentication:** JWT tokens, Passport.js
* **Task scheduling:** NestJS Schedule module (cron jobs)
* **Monitoring:** Sentry (planned), basic metrics

## 5. API Endpoints

### Authentication
```http
POST /api/auth/register              # Register new user
POST /api/auth/login                 # Login (email or phone)
GET  /api/auth/me                    # Get current user profile
POST /api/auth/send-sms              # Send SMS verification code
POST /api/auth/verify-phone          # Verify phone number (JWT required)
POST /api/auth/verify-sms            # Verify SMS code (IP-based brute force protection)
POST /api/auth/request-password-reset # Request password reset (send SMS code)
POST /api/auth/verify-reset-code     # Verify password reset code (IP-based brute force protection)
POST /api/auth/reset-password         # Reset password with verified code
```

### Listings
```http
GET    /api/listings                              # List listings (with extensive filters)
GET    /api/listings/:id                          # Get listing details
POST   /api/listings                              # Create listing
PATCH  /api/listings/:id                          # Update listing
POST   /api/listings/:id/publish                  # Activate (with limit check)
POST   /api/listings/:id/pause                    # Pause listing
POST   /api/listings/:id/close                    # Close listing
GET    /api/listings/my                           # Get user's listings
GET    /api/listings/user/:userId/active          # Get user's active listings
GET    /api/listings/vin/:vin                     # Find listings by VIN
POST   /api/listings/refresh-dates                # Refresh all user's listing dates
```

### Favorites
```http
GET    /api/favorites                    # Get user's favorites list
POST   /api/favorites/:id                # Add to favorites
DELETE /api/favorites/:id                # Remove from favorites
GET    /api/favorites/check/:id          # Check if listing is in favorites
```

### Upload
```http
POST /api/upload/image                    # Upload and optimize image (JWT required)
GET  /api/upload/image/:filename          # Get optimized image version
                                         # Query params: ?quality=X&width=Y
                                         # Example: /api/upload/image/abc.webp?quality=60&width=800
```

### Brands
```http
GET   /api/brands                      # Get all brands
GET   /api/brands/:id/models           # Get models by brand ID
GET   /api/brands/name/:name/models    # Get models by brand name
POST  /api/brands/name/:name/models    # Add models to existing brand
DELETE /api/brands/all                # Delete all brands (admin only)
```

### Cities
```http
GET /api/cities     # Get all cities
```

### Admin
```http
GET   /api/admin/users                    # Get all users
GET   /api/admin/listings                 # Get all listings
GET   /api/admin/stats                    # Get statistics
PATCH /api/admin/listings/:id/status      # Change listing status
GET   /api/admin/users/:id/listings       # Get user's listings
PATCH /api/admin/users/:id/toggle-status  # Enable/disable user
```

## 6. Data Schema (detailed)

### Users
* `id` (UUID, primary key)
* `type` (enum: 'Individual', 'Business', 'Admin')
* `email` (string, unique, nullable - required for Business)
* `password` (hashed with bcrypt)
* `phone` (string, nullable - required for Individual, format validated)
* `firstName` (string, nullable)
* `lastName` (string, nullable)
* `companyName` (string, nullable)
* `active` (boolean, default: true)
* `emailNotifications` (boolean, default: false)
* `viber` (boolean, default: false)
* `whatsapp` (boolean, default: false)
* `telegram` (boolean, default: false)
* `phoneVerified` (boolean, default: false)
* `created_at` (timestamp)

### Listings
* `id` (UUID, primary key)
* `user_id` (UUID, foreign key to users)
* `title` (string)
* `price` (decimal 12,2)
* `currency` (enum: 'MKD', 'EUR', 'USD')
* `city` (string)
* `status` (enum: 'Active', 'Paused', 'Closed')
* `description` (text, nullable, HTML)
* `vehicle_id` (UUID, foreign key to vehicles, nullable)
* `images` (array of strings, URLs)
* `urgent` (boolean, default: false)
* `vin` (string, 17 chars, nullable)
* `last_updated_at` (timestamp, used for auto-closing)
* `created_at` (timestamp)
* `updated_at` (timestamp)

### Vehicles
* `id` (UUID, primary key)
* `brand_id` (UUID, foreign key to brands)
* `model_id` (UUID, foreign key to vehicle_models)
* `year` (integer)
* `engine_displ_l` (decimal 4,2, nullable)
* `mileage_km` (integer, nullable)
* `fuel` (enum: 'Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG', nullable)
* `transmission` (enum: 'Manual', 'Automatic', 'CVT', nullable)
* `body_type` (enum: various types)
* `color` (string, nullable)
* `doors` (integer, nullable)

### Favorites
* `id` (UUID, primary key)
* `user_id` (UUID, foreign key to users)
* `listing_id` (UUID, foreign key to listings)
* `created_at` (timestamp)
* Unique constraint on (user_id, listing_id)

### Brands
* `id` (UUID, primary key)
* `name` (string, unique)

### Vehicle Models
* `id` (UUID, primary key)
* `brand_id` (UUID, foreign key to brands)
* `name` (string)

## 7. Status Behavior

| Status | Description                                               |
| ------ | --------------------------------------------------------- |
| Active | Listing is active and displayed in the catalog            |
| Paused | Temporarily hidden by the user                            |
| Closed | Closed manually or automatically after 5 months           |

## 8. Retention and Automatic Closing

* Automatic closing occurs after 5 months (approximately 150 days) since the last update (`last_updated_at`).
* Background task (cron) checks listings daily at midnight and sets them to `Closed` status.
* Users can manually activate, pause, or close listings.
* **Date refresh feature:** Users can refresh `last_updated_at` for all active listings at once, but only once per 48 hours (prevents abuse).

## 9. Image Processing

* **Upload:** Via `/api/upload/image` endpoint (JWT required)
* **File restrictions:**
  * Formats: JPG, JPEG, PNG, GIF, WebP (all converted to WebP on upload)
  * Max size: 10MB per file
* **Automatic processing on upload:**
  * Resize if width > 1920px (maintains aspect ratio)
  * Convert to WebP format (all formats are converted)
  * Compress to 85% quality with WebP encoder (effort: 4)
  * Store in `/uploads` directory with UUID filename and `.webp` extension
* **Optimized image endpoint:** `GET /api/upload/image/:filename`
  * Query parameters:
    * `quality` (1-100, default: 85): Image quality percentage
    * `width` (optional): Maximum width in pixels (maintains aspect ratio)
  * Returns WebP image with specified quality and width
  * Cached for 1 year (immutable)
  * Used for adaptive quality delivery:
    * Homepage listing cards: quality=60, width=800
    * Listing detail page: quality=75, width=1200
    * Thumbnails: quality=70, width=400
    * Full-size modal: Original quality (direct `/uploads/` URL)
* **Storage:** Local file system with static file serving (`/uploads/*`) and dynamic optimization endpoint
* **Benefits:**
  * WebP format provides 25-35% better compression than JPEG
  * Adaptive quality reduces bandwidth and improves page load times
  * Better SEO performance with faster image loading

## 10. Search and Filtering

* **Search parameters:**
  * `brand_id`, `model_id` (UUIDs)
  * `year_gte`, `year_lte` (year range)
  * `price_gte`, `price_lte` (price range)
  * `mileage_gte`, `mileage_lte` (mileage range)
  * `city` (string, case-insensitive partial match)
  * `fuel` (enum: fuel types)
  * `transmission` (enum: transmission types)
  * `body_type` (enum: body types)
  * `engine_displ_l_gte`, `engine_displ_l_lte` (engine displacement range)
  * `color` (string, case-insensitive)
  * `doors` (integer: 2-5)
  * `currency` (enum: 'MKD', 'EUR')
  * `title` (string, text search)
  * `page` (integer, default: 1)
  * `limit` (integer, default: 20, max: 100)
  * `sortBy` (string: 'created_at', 'price', 'year')
  * `sortOrder` ('ASC' | 'DESC', default: 'DESC')
* **Query example:**
```
GET /api/listings?brand_id=xxx&year_gte=2018&price_lte=12000&city=Skopje&fuel=Petrol&page=1&sortBy=price&sortOrder=ASC
```

## 11. Region and Localization

* **Country:** Macedonia
* **Currency:** Primary MKD, with EUR support
* **Interface language:** Macedonian (user-facing text), English (technical/developer)
* **Cities:** Bilingual support (Macedonian and English names)

## 12. UI/UX

* **Responsive design:** Mobile-first approach with TailwindCSS
* **Homepage:** Grid of listing cards with photo, price, year, and engine displacement
* **Listing card:** Compact display with key information
* **Listing detail page:**
  * Image gallery with modal view
  * Full specifications
  * Rich text description
  * Seller contact information
  * Social media contact buttons (if available)
  * VIN history section (if VIN provided)
  * Favorite button
* **Search and filters:** Collapsible filter panel with extensive options
* **User dashboard:** My listings page with status management and date refresh
* **Admin panel:** Tab-based interface with search and filtering
* **Minimum clicks to contact:** Direct access to seller information

## 13. Security Features

* **Password requirements:**
  * Minimum 8 characters
  * At least one uppercase letter
  * At least one lowercase letter
  * At least one special character
* **Authentication:**
  * JWT tokens with expiration
  * Password hashing with bcrypt (10 rounds)
  * Protected routes with guards (JwtAuthGuard, AdminGuard)
* **SMS Verification:**
  * Required during registration for both user types
  * Frontend: 10 attempts per code, 3 code resends maximum (40 total attempts)
  * Backend: IP-based brute force protection (40 attempts per IP, 1-hour block)
  * Automatic cleanup of expired IP blocks (hourly cron job)
* **IP-based Brute Force Protection:**
  * Maximum 40 failed verification attempts per IP address
  * 1-hour block after exceeding limit
  * Automatic unblocking after block period expires
  * IP detection from `x-forwarded-for`, `x-real-ip`, or direct connection
  * `trust proxy` enabled for proper IP detection behind proxies
* **Input validation:**
  * Class-validator for DTOs
  * Phone number format validation
  * Email validation
  * VIN length validation (17 characters)
  * SMS code validation (6 digits, numeric only)
* **File upload security:**
  * MIME type validation
  * File size limits
  * Authentication required
* **Data privacy:**
  * VIN search results exclude sensitive information (price, contact details)

## 14. Testing

### Unit Tests
* **Backend:** Jest-based unit tests for services and controllers
* **Frontend:** Jest + React Testing Library for components and utilities
* **Coverage:** Services, utilities, and core business logic

### Integration Tests
* **Contract Testing:** Integration tests validate API endpoints against Swagger/OpenAPI specification
* **Framework:** Jest + Supertest + jest-openapi
* **Location:** `backend/src/test/*.integration.ts`
* **Purpose:**
  * Verify API responses match documented Swagger schema
  * Ensure request/response formats are correct
  * Validate authentication and authorization
  * Check error handling follows documented contract
* **Running Tests:**
  ```bash
  # Backend unit tests
  cd backend && npm test
  
  # Backend integration tests
  cd backend && npm run test:integration
  
  # Frontend tests
  cd frontend && npm test
  ```
* **CI/CD:** All tests run automatically in GitHub Actions on push and pull requests
* **Requirements:**
  * PostgreSQL database (for integration tests)
  * Redis (optional, for SMS verification features)

### Test Structure
* **Backend Unit Tests:** `*.spec.ts` files alongside source files
* **Backend Integration Tests:** `backend/src/test/*.integration.ts`
* **Frontend Tests:** `*.test.ts` files in component and utility directories

## 15. Release Plan

* **M1:** Catalog, listing card, publication, limits, statuses, favorites, basic search
* **M2:** Extended filters, VIN functionality, image optimization, admin panel, auto-closing, SEO
* **M3:** Rich text editor, date refresh, social media integration, enhanced admin features

## 16. Acceptance Criteria

* [ ] Individual users cannot have >3 active listings
* [ ] Business users cannot have >20 active listings
* [ ] Listings transition to `Closed` after 5 months without update
* [ ] Manual closing works correctly
* [ ] Search and sorting return correct data with all filters
* [ ] Favorites are saved and deleted correctly (localStorage for guests, server for users)
* [ ] VIN search functionality works correctly
* [ ] Date refresh functionality works with 48-hour cooldown
* [ ] Image upload and optimization works correctly
* [ ] User registration validation works for both user types
* [ ] Admin panel access control works correctly
* [ ] All API endpoints require proper authentication where needed

---

**Version 1.2 reflects:** Extended search filters, VIN functionality, image optimization (WebP conversion with adaptive quality), rich text descriptions, date refresh feature, social media integration, enhanced user registration, comprehensive admin panel, brands/models/cities APIs, optimized image delivery endpoint.

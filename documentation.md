# Technical Specification (TS)

Project: Platform for selling new and used cars
Version: 1.2
Date: 2025-11-01

---

## 1. Purpose

Create a simple, free website for posting listings for new and used cars in North Macedonia. Users can independently add, edit, pause, and close their listings.

## 2. Core Principles

* Fully free service, no payments, subscriptions, or paid options.
* Two user types: **Individual** and **Business**.
* Individual users can have a maximum of **5 active listings** simultaneously.
* Business users can have a maximum of **50 active listings** simultaneously.
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

* Car photos (up to 50 images)
* **Image optimization:** Automatic compression, resizing (max 1920px width), quality optimization (85%)
* Basic specifications: year, engine displacement, mileage, fuel type, transmission, body type, color, doors, city
* **Urgent flag:** Mark listings as urgent (displayed prominently)
* **VIN number:** Optional 17-character VIN code
* **Rich text description:** HTML-formatted description using rich text editor
* Seller contact information
* **Currency support:** MKD, EUR

### Listing Publication

* **Multi-step form:** Basic data → Photos → Publication
* **Image upload:**
  * Supported formats: JPG, JPEG, PNG, GIF, WebP
  * Max file size: 10MB per image
  * Automatic optimization and compression
  * Upload via `/api/upload/image` endpoint
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
* **Authentication:**
  * Login with email or phone number
  * JWT-based authentication
  * Password hashing with bcrypt (10 rounds)
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
* **Listing management:**
  * View all listings
  * View listing statistics
  * Filter by status (Active, Paused, Closed)
  * Search by listing ID or creator name/email
  * Change listing status manually
* **Statistics:** User and listing statistics dashboard
* **Tabs interface:** Separate views for listings and users

### Brands and Models

* **Brands API:** Get all available car brands
* **Models API:** Get models by brand ID or brand name
* Dynamic model loading based on selected brand
* Searchable brand and model dropdowns

### Cities

* **Cities API:** Get all available cities in North Macedonia
* Bilingual support: Macedonian and English names
* Searchable city dropdown in filters and forms

## 4. Architecture

* **Frontend:** Next.js 14 (SSR for SEO), React 18, TailwindCSS, Zustand (state management)
* **Backend:** Node.js (NestJS), REST API, PostgreSQL, Redis, S3-compatible storage (planned)
* **Database:** PostgreSQL 15 with TypeORM
* **Search:** PostgreSQL Full-Text Search and custom query builder
* **Image processing:** Sharp library for optimization
* **File storage:** Local file system (`/uploads`) with plans for S3 migration
* **Authentication:** JWT tokens, Passport.js
* **Task scheduling:** NestJS Schedule module (cron jobs)
* **Monitoring:** Sentry (planned), basic metrics

## 5. API Endpoints

### Authentication
```http
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login (email or phone)
GET  /api/auth/me           # Get current user profile
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
POST /api/upload/image     # Upload and optimize image (JWT required)
```

### Brands
```http
GET /api/brands                      # Get all brands
GET /api/brands/:id/models           # Get models by brand ID
GET /api/brands/name/:name/models    # Get models by brand name
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
  * Formats: JPG, JPEG, PNG, GIF, WebP
  * Max size: 10MB per file
* **Automatic processing:**
  * Resize if width > 1920px (maintains aspect ratio)
  * Convert to JPEG format
  * Compress to 85% quality with mozjpeg
  * Store in `/uploads` directory with UUID filename
* **Storage:** Local file system with static file serving (`/uploads/*`)

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

* **Country:** North Macedonia
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
* **Input validation:**
  * Class-validator for DTOs
  * Phone number format validation
  * Email validation
  * VIN length validation (17 characters)
* **File upload security:**
  * MIME type validation
  * File size limits
  * Authentication required
* **Data privacy:**
  * VIN search results exclude sensitive information (price, contact details)

## 14. Release Plan

* **M1:** Catalog, listing card, publication, limits, statuses, favorites, basic search
* **M2:** Extended filters, VIN functionality, image optimization, admin panel, auto-closing, SEO
* **M3:** Rich text editor, date refresh, social media integration, enhanced admin features

## 15. Acceptance Criteria

* [ ] Individual users cannot have >5 active listings
* [ ] Business users cannot have >50 active listings
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

**Version 1.2 reflects:** Extended search filters, VIN functionality, image optimization, rich text descriptions, date refresh feature, social media integration, enhanced user registration, comprehensive admin panel, brands/models/cities APIs.

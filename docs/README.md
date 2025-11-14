# Kupito - Car Marketplace for Macedonia

Platform for selling new and used cars in Macedonia.

## Documentation Structure

This directory contains **general project documentation**. For component-specific documentation, see:
- **Backend documentation:** [`../backend/docs/`](../backend/docs/)
- **Frontend documentation:** [`../frontend/docs/`](../frontend/docs/)

## Quick Start

```bash
npm run install:all          # Install dependencies
docker-compose up -d         # Start database
cd backend && npm run start:dev  # Start backend (in one terminal)
cd frontend && npm run dev   # Start frontend (in another terminal)
```

**Frontend:** http://localhost:3000 | **Backend:** http://localhost:4000

<details>
<summary><b>Installation Guide</b></summary>

### Requirements
- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Steps

1. **Clone and install dependencies:**
```bash
npm run install:all
```

2. **Configure environment variables:**

Create `backend/.env` (see environment variables section in [TECHNICAL.md](./TECHNICAL.md#3-environment-variables)):
```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Twilio SMS Configuration (required for SMS verification)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

# Redis Configuration (optional, defaults to localhost:6379)
REDIS_HOST=localhost
REDIS_PORT=6379
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

3. **Start database:**
```bash
docker-compose up -d
```

4. **Setup database tables:**
```bash
cd backend
npm run build
npm run migration:run
```

**Important:** The latest migration includes database optimizations (indexes, triggers). Always run migrations in production.

Or use TypeORM sync (development only):
```bash
cd backend && npm run start:dev
```

5. **Start development servers:**
```bash
npm run dev  # Runs both frontend and backend
```

</details>

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
  - Registration date format validation (MM.YYYY, month must be 2 digits)
- Extended search and filtering with advanced filters
- Sort functionality (by date, popularity, price, year) with URL parameter synchronization
- Multi-select dropdowns with search, categories, and action buttons
- Optimized dropdown components with Set-based lookups for performance
- **Saved filters:** Save up to 20 filter sets per user with custom names, edit and delete saved filters, apply saved filters with one click
- Listing limits (100 for Individuals, 100 for Business)
- Listing statuses (Active, Paused, Closed)
- Automatic listing closure after 5 months
- Custom 404 and error pages
- Favorites (for authenticated users and guests)
- VIN search functionality
- Image upload with automatic WebP conversion and adaptive quality optimization
- Admin panel for management

</details>

<details>
<summary><b>Project Structure</b></summary>

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
- `GET /api/auth/me` - Current user
- `POST /api/auth/send-sms` - Send SMS verification code
- `POST /api/auth/verify-phone` - Verify phone number (JWT required)
- `POST /api/auth/verify-sms` - Verify SMS code (with IP-based brute force protection)

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
- `GET /api/listings/vin/:vin` - Find listings by VIN
- `POST /api/listings/refresh-dates` - Refresh all user's listing dates

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

- Automatic listing closure after 5 months (cron job runs daily at midnight)
- Active listing limit validation on publish
- Favorites stored in localStorage for guests and on server for authenticated users
- **Saved filters:** Users can save up to 20 filter sets with custom names, edit and delete them, apply with one click
- PostgreSQL Full-Text Search for search functionality
- **Database optimizations:** Comprehensive indexing, triggers for data integrity, connection pooling
- **Health monitoring:** Health check endpoint with database and Redis connectivity checks
- **Automated backups:** Database backup scripts with cron support for production
- **Code quality:** TypeScript strict mode, CI/CD automation, bundle optimization
- **Performance:** Frontend memoization, Redis cache optimization, lazy loading
- **Analytics:** Google Analytics integration
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

For more details, see [Technical Documentation](TECHNICAL.md#8-testing).

## Documentation

### General Documentation

- **[Technical Documentation](TECHNICAL.md)** - Complete technical documentation (architecture, API, database, security, testing, scripts, SEO)
- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment instructions (VPS, cPanel, SSH setup, staging)
- **[Render.com Deployment Guide](RENDER.md)** - Complete guide for deploying on Render.com
- **[TODO List](TODO.md)** - All project tasks and todos ⚠️ **IMPORTANT**

### Backend Documentation

- **[Backend Documentation](../backend/docs/README.md)** - Backend-specific documentation
  - **[Scripts Guide](../backend/docs/SCRIPTS.md)** - Scripts organization and usage
  - **[Testing Guide](../backend/docs/TESTING.md)** - Integration testing documentation

### Frontend Documentation

- **[Frontend Documentation](../frontend/docs/README.md)** - Frontend-specific documentation
  - **[Design System](../frontend/docs/DESIGN_SYSTEM.md)** - Design system and UI components
  - **[Storybook Guide](../frontend/docs/STORYBOOK.md)** - Storybook setup guide

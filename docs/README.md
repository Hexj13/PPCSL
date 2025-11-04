# Kupito - Car Marketplace for North Macedonia

Platform for selling new and used cars in North Macedonia.

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

Create `backend/.env` (see `ENV_EXAMPLE.md`):
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

- **Frontend:** Next.js 14, React, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Storage:** S3-compatible storage (planned)

</details>

<details>
<summary><b>Core Features</b></summary>

- User registration and authentication (Individual and Business)
- SMS verification during registration (with IP-based brute force protection)
- Phone number verification stored in database
- Create, edit, and publish listings
- Extended search and filtering
- Listing limits (5 for Individuals, 50 for Business)
- Listing statuses (Active, Paused, Closed)
- Automatic listing closure after 5 months
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
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `POST /api/auth/verify-phone` - Verify phone number (JWT required)
- `POST /api/auth/verify-sms` - Verify SMS code (with IP-based brute force protection)

### Listings
- `GET /api/listings` - List listings (with filters)
- `GET /api/listings/:id` - Listing details
- `POST /api/listings` - Create listing
- `PATCH /api/listings/:id` - Update listing
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

</details>

<details>
<summary><b>Implementation Features</b></summary>

- Automatic listing closure after 5 months (cron job runs daily at midnight)
- Active listing limit validation on publish
- Favorites stored in localStorage for guests and on server for authenticated users
- PostgreSQL Full-Text Search for search functionality
- Image optimization (resize, compress, convert to WebP with adaptive quality)
- Responsive design with TailwindCSS
- VIN search with privacy protection
- Date refresh feature with 48-hour cooldown

</details>

## Documentation

- **[Technical Specification](TECH_DOCS.md)** - Complete project documentation
- **[Setup Guide](SETUP.md)** - Detailed setup instructions
- **[Restart Guide](RESTART.md)** - How to restart the project
- **[Environment Variables](ENV_EXAMPLE.md)** - Environment configuration
- **[Optimization Analysis](OPTIMIZATION_ANALYSIS.md)** - Performance optimization analysis

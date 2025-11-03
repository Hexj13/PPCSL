# Kupito - Car Marketplace for North Macedonia

Platform for selling new and used cars in North Macedonia.

## Technologies

- **Frontend:** Next.js 14, React, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Storage:** S3-compatible storage (for future implementation)

## Installation

### Requirements

- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Installation Steps

1. Clone the repository and install dependencies:
```bash
npm run install:all
```

2. Configure environment variables:

Create `backend/.env` file (see `ENV_EXAMPLE.md`):
```
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

Create `frontend/.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

3. Start database and Redis:
```bash
docker-compose up -d
```

4. Wait for database startup (about 10 seconds), then create tables:
```bash
cd backend
npm run build
npm run migration:run
```

Or if using TypeORM synchronization (in development mode):
```bash
cd backend
npm run start:dev
```

5. Start the project in development mode:
```bash
npm run dev
```

Frontend will be available at http://localhost:3000  
Backend API will be available at http://localhost:4000

## Core Features

- ✅ User registration and authentication (Individual and Business)
- ✅ Create, edit, and publish listings
- ✅ Search and filter listings
- ✅ Listing limits (5 for Individuals, 50 for Business)
- ✅ Listing statuses (Active, Paused, Closed)
- ✅ Automatic listing closure after 5 months
- ✅ Favorites (for authenticated users and guests)
- ✅ Admin panel for management

## Project Structure

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
│   │   └── admin/    # Admin panel
├── documentation.md  # Technical specification
└── docker-compose.yml # Database configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

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

### Admin Panel
- `GET /api/admin/users` - All users list
- `GET /api/admin/listings` - All listings list
- `GET /api/admin/stats` - Statistics
- `PATCH /api/admin/listings/:id/status` - Change listing status
- `GET /api/admin/users/:id/listings` - User's listings
- `PATCH /api/admin/users/:id/toggle-status` - Enable/disable user

## Implementation Features

- Automatic listing closure after 5 months (cron job runs daily at midnight)
- Active listing limit validation on publish
- Favorites stored in localStorage for guests and on server for authenticated users
- PostgreSQL Full-Text Search for search functionality
- Responsive design with TailwindCSS

## License

MIT

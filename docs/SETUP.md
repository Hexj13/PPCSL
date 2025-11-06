# Project Setup Instructions

## Issue: Docker daemon not running

If you see the error `Cannot connect to the Docker daemon`, follow these steps:

### Option 1: Start Docker Desktop

1. Open Docker Desktop application on your Mac
2. Wait for full startup (icon in menu bar will turn green)
3. Then run:
```bash
docker-compose up -d
```

### Option 2: Install PostgreSQL and Redis locally

If Docker is unavailable, you can install databases locally:

#### Installing PostgreSQL (macOS)

```bash
# Via Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database and user
createdb kupito
psql postgres
```

In psql, execute:
```sql
CREATE USER kupito WITH PASSWORD 'kupito123';
ALTER DATABASE kupito OWNER TO kupito;
GRANT ALL PRIVILEGES ON DATABASE kupito TO kupito;
\q
```

#### Installing Redis (macOS)

```bash
# Via Homebrew
brew install redis
brew services start redis
```

After this, use existing settings in `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito
```

### Option 3: Use only PostgreSQL (without Redis)

Redis is not critical for the application in the current version. You can run the project without it, but some features may not work optimally.

## After starting the database

1. Go to the backend folder:
```bash
cd backend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Build backend and run migrations (for production or to apply database optimizations):
```bash
npm run build
npm run migration:run
```

Or start in development mode (TypeORM will automatically create tables with `synchronize: true`):
```bash
npm run start:dev
```

**Note:** For production, always use migrations. The latest migration includes database optimizations (indexes, triggers, connection pooling).

4. In a new terminal, start frontend:
```bash
cd frontend
npm install
npm run dev
```

## Verification

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API check: http://localhost:4000 (should return "Kupito API v1.0")

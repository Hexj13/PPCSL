# PPCSL

Platform for Posting Car Sale Listings - core application framework for car marketplace platforms.

## 📚 Documentation

All documentation is located in the [`docs/`](./docs/) folder:

### General Documentation
- **[README.md](./docs/README.md)** - Detailed project documentation
- **[TECHNICAL.md](./docs/TECHNICAL.md)** - Complete technical documentation (includes CI/CD, Google Ads setup)
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment guide (VPS, cPanel, Render.com, SSH setup)
- **[MULTI_REPOSITORY_ARCHITECTURE.md](./docs/MULTI_REPOSITORY_ARCHITECTURE.md)** - Multi-repository architecture guide (includes PPCSL overview and pre-migration checklist)
- **[LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md)** - Local development guide for working with multi-repository architecture
- **[SEO_AUDIT.md](./docs/SEO_AUDIT.md)** - SEO audit and Google Search Console issues
- **[TODO.md](./docs/TODO.md)** - All project tasks and TODOs

### Backend Documentation
- **[Backend README](./backend/docs/README.md)** - Backend-specific documentation
- **[Scripts Guide](./backend/docs/SCRIPTS.md)** - Backend utility scripts documentation
- **[Testing Guide](./backend/docs/TESTING.md)** - Integration testing documentation

### Frontend Documentation
- **[Frontend README](./frontend/docs/README.md)** - Frontend-specific documentation
- **[Design System](./frontend/docs/DESIGN_SYSTEM.md)** - Design system and UI components
- **[Storybook Guide](./frontend/docs/STORYBOOK.md)** - Storybook setup guide

## 🚀 Quick Start

### Option 1: Run Both Servers Together (Recommended)

```bash
# Install all dependencies (root, frontend, backend)
npm run install:all

# Start Docker containers (PostgreSQL + Redis)
docker-compose up -d

# Run both frontend and backend together
npm run dev
```

**Frontend:** http://localhost:3000 | **Backend:** http://localhost:4000

### Option 2: Run Servers Separately

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
PPCSL/
├── backend/          # NestJS backend API
│   ├── src/
│   │   ├── scripts/  # Utility scripts (brands, seeding, management)
│   │   ├── brands/   # Brands and models
│   │   ├── upload/   # File upload service (with watermark support)
│   │   └── ...
│   ├── assets/
│   │   └── watermark/ # Watermark assets (logo.png)
│   └── docs/         # Backend-specific documentation
├── frontend/         # Next.js frontend
│   ├── ui/           # Design system components
│   └── docs/         # Frontend-specific documentation
├── docs/             # General project documentation
└── docker-compose.yml
```

## 🛠️ Utility Scripts

For working with brands and models (run from `backend/` directory):

```bash
cd backend

# Add brands and models
npm run add-brands
npm run add-historical  # Historical models
npm run add-grand       # Grand versions
npm run add-models      # Add models to existing brand
npm run add-french-models   # French brands
npm run add-german-models   # German brands
npm run add-italian-models  # Italian brands
npm run add-japanese-models # Japanese brands
npm run add-american-models # American brands
npm run add-commercial-models # Commercial vehicles

# Check
npm run check-brands    # Brand count
npm run check-models    # Models statistics
npm run check-citroen   # Check Citroen models
npm run check-duplicates # Check for duplicates

# Management
npm run cleanup-brands # Cleanup and synchronization
npm run seed:all-brands # Seed all brands and models (optimized)
```

For more information about scripts, see [backend/docs/SCRIPTS.md](./backend/docs/SCRIPTS.md).

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests:** Jest-based tests for services and components
- **Integration Tests:** API contract tests against Swagger specification
- **Frontend Tests:** 188 tests across 13 test suites (components, utilities, API, server API)
- **Backend Tests:** 266 tests across 20 test suites
- **CI/CD:** Automated testing in GitHub Actions

```bash
# Backend unit tests
cd backend && npm test

# Backend integration tests (requires database)
cd backend && npm run test:integration

# Frontend tests
cd frontend && npm test
```

**Test Coverage:**
- ✅ All critical backend services and controllers
- ✅ All critical frontend components (ListingCard, SearchFilters, ListingForm, ListingGrid, AuthProvider)
- ✅ Server-side data fetching functions (with production/development cache settings)
- ✅ Utility functions and API clients
- ✅ 188 frontend tests across 13 test suites
- ✅ 266 backend tests across 20 test suites

For detailed documentation, see [documentation](./docs/).

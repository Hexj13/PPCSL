# Kupito

Car marketplace platform.

## 📚 Documentation

All documentation is located in the [`docs/`](./docs/) folder:

- **[README.md](./docs/README.md)** - Detailed project documentation
- **[SETUP.md](./docs/SETUP.md)** - Installation and configuration instructions
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment guide (step-by-step instructions)
- **[TECH_DOCS.md](./docs/TECH_DOCS.md)** - Technical documentation
- **[SCRIPTS.md](./docs/SCRIPTS.md)** - Utility scripts documentation
- **[ENV_EXAMPLE.md](./docs/ENV_EXAMPLE.md)** - Environment variables example
- **[OPTIMIZATION_ANALYSIS.md](./docs/OPTIMIZATION_ANALYSIS.md)** - Optimization analysis
- **[OPTIMIZATION_PROGRESS.md](./docs/OPTIMIZATION_PROGRESS.md)** - Optimization progress report
- **[TODO.md](./docs/TODO.md)** - All project tasks and TODOs
- **[DATABASE_OPTIMIZATIONS.md](./docs/DATABASE_OPTIMIZATIONS.md)** - Database optimizations (indexes, triggers, connection pooling)
- **[RESTART.md](./docs/RESTART.md)** - Restart instructions

## 🚀 Quick Start

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
Kupito/
├── backend/          # NestJS backend API
│   └── src/
│       ├── scripts/  # Utility scripts (brands, seeding, management)
│       ├── brands/   # Brands and models
│       └── ...
├── frontend/         # Next.js frontend
├── docs/             # Documentation
└── docker-compose.yml
```

## 🛠️ Utility Scripts

For working with brands and models:

```bash
# Add brands and models
npm run add-brands
npm run add-historical  # Historical models
npm run add-grand       # Grand versions
npm run add-models      # Add models to existing brand

# Check
npm run check-brands    # Brand count
npm run check-models    # Models statistics

# Management
npm run cleanup-brands # Cleanup and synchronization
```

For more information about scripts, see [SCRIPTS.md](./docs/SCRIPTS.md).

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests:** Jest-based tests for services and components
- **Integration Tests:** API contract tests against Swagger specification
- **CI/CD:** Automated testing in GitHub Actions

```bash
# Backend unit tests
cd backend && npm test

# Backend integration tests (requires database)
cd backend && npm run test:integration

# Frontend tests
cd frontend && npm test
```

For detailed documentation, see [documentation](./docs/).

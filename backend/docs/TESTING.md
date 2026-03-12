# Интеграционные тесты

This directory contains integration tests that validate API endpoints against the Swagger/OpenAPI specification.

## Overview

Integration tests verify that:
- API endpoints return responses matching the Swagger schema
- Request/response formats are correct
- Authentication and authorization work as expected
- Error handling follows the documented contract

## Setup

The tests use:
- **Jest** - Test runner
- **Supertest** - HTTP assertions
- **jest-openapi** - Swagger schema validation

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run integration tests in watch mode
npm run test:integration:watch

# Run specific test file
npm run test:integration -- src/test/auth.integration.ts
```

## Test Structure

- `src/test/setup-integration.ts` - Test app setup and Swagger document generation
- `src/test/jest-integration.setup.ts` - Jest configuration for integration tests
- `src/test/*.integration.ts` - Individual test files for each API module

## Requirements

- Database must be running and accessible
- Auth tests (`auth.integration.ts`) use a shared helper `registerTestUser(request)` that registers with unique phone and email and retries on 400 (e.g. phone already exists) and 429 (rate limit), so shared or persistent DB does not cause failures
- Test database should be configured via environment variables:
  - `DB_HOST` (default: localhost)
  - `DB_PORT` (default: 5432)
  - `DB_USERNAME` (default: ppcsl)
  - `DB_PASSWORD` (default: ppcsl123)
  - `DB_NAME` (default: ppcsl)

## Writing New Tests

1. Create a new file: `src/test/[module].integration.ts`
2. Import `getTestRequest` from `setup-integration.ts`
3. Use `expect(response).toSatisfyApiSpec()` to validate responses

Example:

```typescript
import { getTestRequest } from './setup-integration';

describe('My API Integration Tests', () => {
  const request = getTestRequest();

  it('should match OpenAPI schema', async () => {
    const response = await request.get('/api/endpoint').expect(200);
    expect(response).toSatisfyApiSpec();
  });
});
```


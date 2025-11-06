# Staging Environment Configuration

This document describes the staging environment setup and features that should NOT be available in production.

## Staging-Specific Features

### 1. OTP Code Bypass (000000)

**Status:** ✅ Implemented

**Description:** On staging and development environments, the OTP code `000000` is accepted for SMS verification, bypassing the actual SMS sending.

**Implementation:**
- Backend: `backend/src/auth/services/sms.service.ts`
- Works for both registration verification and password reset
- Only active when `NODE_ENV=stage` or `NODE_ENV=development`

**⚠️ Production:** This feature is automatically disabled in production (`NODE_ENV=production`)

### 2. Swagger API Documentation

**Status:** ✅ Implemented

**Description:** Swagger UI is available at `/api/docs` endpoint for API documentation and testing.

**Implementation:**
- Backend: `backend/src/main.ts`
- Only enabled when `NODE_ENV !== 'production'`

**⚠️ Production:** Swagger is automatically disabled in production

### 3. Storybook

**Status:** ✅ Available (separate server)

**Description:** Storybook is a development tool for UI component development and testing. It runs on a separate server (port 6006 by default).

**Access:**
- Development: `npm run storybook` or `npm run storybook:dev`
- Staging: Should be accessible if deployed separately
- Production: Should NOT be deployed or accessible

**⚠️ Production:** Storybook should not be built or deployed in production builds

## Features That Should NOT Be in Production

### 1. Database Synchronization

**Status:** ✅ Protected

**Description:** TypeORM `synchronize` option automatically creates/updates database schema.

**Current Protection:**
- `synchronize: process.env.NODE_ENV !== 'production'`
- Automatically disabled in production

**⚠️ Production:** Always use migrations, never enable synchronize

### 2. Database Logging

**Status:** ✅ Protected

**Description:** SQL query logging for debugging.

**Current Protection:**
- `logging: process.env.NODE_ENV === 'development'`
- Only enabled in development

**⚠️ Production:** Disabled by default, should remain disabled

### 3. Default Database Credentials

**Status:** ✅ Protected

**Description:** Fallback to default database password in non-production environments.

**Current Protection:**
- Uses `kupito123` only when `NODE_ENV !== 'production'`
- Production requires explicit `DB_PASSWORD` environment variable

**⚠️ Production:** Must set secure `DB_PASSWORD` environment variable

### 4. Default JWT Secret

**Status:** ✅ Protected

**Description:** Fallback JWT secret for development.

**Current Protection:**
- Warns in non-test environments
- Throws error in production if `JWT_SECRET` is not set

**⚠️ Production:** Must set secure `JWT_SECRET` environment variable

### 5. Test/Seed Scripts

**Status:** ✅ Protected

**Description:** Database seeding and test data scripts.

**Implementation:**
- All stage scripts are located in `backend/src/scripts/stage/`
- All stage scripts include environment guard that blocks execution in production
- Production-safe scripts are in `backend/src/scripts/production/`

**Stage Scripts (Blocked in Production):**
- `npm run seed` - Seed test data
- `npm run seed:vin` - Seed VIN test data
- `npm run seed:vehicles` - Seed vehicle data
- `npm run clear-database` - Clear all database data
- `npm run reset-users` - Reset user data
- `npm run make-admin` - Create admin user
- All other stage scripts (see `backend/src/scripts/README.md`)

**Production Scripts (Safe for Production):**
- `npm run update-titles` - Update listing titles

**⚠️ Production:** Stage scripts automatically exit with error if attempted to run in production

### 6. Admin Panel Routes

**Status:** ⚠️ Protected by Authentication

**Description:** Admin panel accessible at `/admin` route.

**Current Protection:**
- Protected by `AdminGuard` - requires Admin user type
- Frontend redirects non-admin users

**⚠️ Production:** Should remain accessible but only to authenticated Admin users

### 7. Design System Page

**Status:** ✅ Protected

**Description:** Design system documentation page at `/design-system`.

**Implementation:**
- Automatically returns 404 page in production
- Only accessible in stage/development environments
- Alternative to Storybook for quick component reference

**⚠️ Production:** Automatically hidden, returns 404 page

### 8. Console Logging

**Status:** ✅ Optimized

**Description:** Console logging throughout the application.

**Current Behavior:**
- Application startup logs only in non-production
- SMS test mode logs only when Twilio is not configured
- Email test mode logs only when SMTP is not configured
- Error logging (console.error) remains for production debugging
- Warning logs (console.warn) remain for important warnings

**⚠️ Production:** 
- Startup messages are suppressed
- Test mode logs should not occur (Twilio/SMTP should be configured)
- Error and warning logs remain for monitoring

### 9. Test Mode Indicators

**Status:** ✅ Verified

**Description:** Any UI elements or messages indicating test/staging mode.

**Verification:**
- No test mode badges or indicators in UI
- No "STAGING" or "DEVELOPMENT" labels visible to users
- No test mode messages in user-facing components

**⚠️ Production:** No test mode indicators found in UI

### 10. Error Pages

**Status:** ✅ Implemented

**Description:** Custom error pages for better user experience.

**Implementation:**
- `frontend/app/not-found.tsx` - 404 page for not found routes
  - Features: Eye of Providence symbol, gray secondary text, single "Кон почетна" button
- `frontend/app/error.tsx` - Error boundary page for application errors
  - Features: Error icon, gray secondary text, "Обиди се повторно" and "Кон почетна" buttons
- Both pages have consistent design with gray secondary text and simplified navigation

**⚠️ Production:** Error pages are available in all environments

## Environment Variables

### Required for Staging

```env
NODE_ENV=stage
```

### Required for Production

```env
NODE_ENV=production
JWT_SECRET=<strong-secret>
DB_PASSWORD=<secure-password>
```

## Checklist Before Production Deployment

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is set to a strong, random value
- [ ] `DB_PASSWORD` is set to a secure password
- [ ] Database `synchronize` is disabled (automatic)
- [ ] Database `logging` is disabled (automatic)
- [ ] Swagger is disabled (automatic)
- [ ] OTP bypass (000000) is disabled (automatic)
- [ ] Storybook is not deployed
- [ ] Seed scripts are blocked (automatic protection)
- [ ] Test data is removed from database
- [ ] All console.log statements reviewed
- [ ] Error messages don't expose internal details
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Security headers are enabled (helmet)
- [ ] Admin panel access is restricted
- [ ] Design system page is hidden (automatic 404 in production)

## Notes

- Most protections are automatic based on `NODE_ENV`
- Manual review required for scripts and UI elements
- Storybook is a separate build/deployment concern
- Always test staging environment before production deployment


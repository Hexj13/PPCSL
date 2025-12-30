# Promotion Feature Deployment Guide

## Production Checklist

### 1. Run Database Migrations

**Important:** Migrations must be executed **before** deploying new code to avoid errors when working with new fields.

Run the following migrations in order:

```bash
# Migration 1: Add promotion fields to listings table
npm run migration:run

# Or via TypeORM CLI directly:
cd backend
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

**Migrations:**
- `1778000000000-AddPromotedField.ts` - adds `is_promoted`, `promoted_until`, `promoted_started_at`, `promoted_paused_at` fields to `listings` table
- `1778000000001-CreatePromotionHistory.ts` - creates `promotion_history` table for storing promotion history

**Verification after migrations:**
```sql
-- Check for new fields in listings
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'listings' 
AND column_name IN ('is_promoted', 'promoted_until', 'promoted_started_at', 'promoted_paused_at');

-- Check for promotion_history table
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'promotion_history';
```

### 2. Add Environment Variables

Add the following variables to `backend/.env` on production:

```env
# Control access to promotion feature
# Possible values: disabled, admin, all
# Default: disabled (recommended for initial deployment)
PROMOTION_ACCESS=disabled

# Maximum number of active promotions per user
# Protection against abuse and system overload
# Default: 10
MAX_PROMOTIONS_PER_USER=10

# Secret key for cron job authentication
# Used to protect endpoints called by cron tasks
# Must be a long random key (minimum 32 characters)
# If CRON_SECRET already exists, use the existing one
CRON_SECRET=your-secret-key-here-minimum-32-characters
```

**Configuration recommendations:**

1. **For initial deployment:**
   ```env
   PROMOTION_ACCESS=disabled
   ```
   This will disable the feature for all users but allow you to verify everything works correctly.

2. **For admin testing:**
   ```env
   PROMOTION_ACCESS=admin
   ```
   Only administrators will be able to use the promotion feature.

3. **For full activation:**
   ```env
   PROMOTION_ACCESS=all
   ```
   All authenticated users will be able to promote their listings.

### 3. Configure Cron Job (Optional)

To automatically disable expired promotions, configure a cron job:

```bash
# Example cron job (run every hour)
0 * * * * curl -X POST https://your-domain.com/api/listings/cron/disable-expired-promotions \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Important:** 
- Replace `YOUR_CRON_SECRET` with the value from the `CRON_SECRET` environment variable
- Replace `https://your-domain.com` with the actual production URL

### 4. Post-Deployment Verification

1. **Check API functionality:**
   ```bash
   # Check promotion access endpoint
   curl https://your-domain.com/api/listings/promotion-access
   
   # Should return JSON with fields: access, enabled, isAdmin, canPromote
   ```

2. **Check logs:**
   - Ensure there are no errors on application startup
   - Verify that migrations were applied successfully

3. **Check UI:**
   - On "My Listings" page, verify presence of buttons and filters (if `PROMOTION_ACCESS=all` or `admin`)
   - Verify visual highlighting of promoted listings (works for all users)

### 5. Rollback (If Something Goes Wrong)

If issues arise:

1. **Rollback migrations (if necessary):**
   ```bash
   cd backend
   npm run migration:revert
   # Repeat for each migration in reverse order
   ```

2. **Disable the feature:**
   ```env
   PROMOTION_ACCESS=disabled
   ```
   Restart the application.

3. **Code rollback:**
   Rollback deployment to previous version through your deployment system.

---

## Action Steps (Quick Version)

1. ✅ **Run migrations** (`npm run migration:run`)
2. ✅ **Add environment variables** to `backend/.env`
3. ✅ **Deploy new code**
4. ✅ **Verify functionality** (API, UI, logs)
5. ✅ **Configure cron job** (optional)

---

**Created:** 2025-01-XX  
**Version:** 1.0

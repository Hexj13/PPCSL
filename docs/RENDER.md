# Render.com Deployment Guide

Complete guide for deploying Kupito backend on Render.com.

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Database Setup](#2-database-setup)
3. [Backend Service Setup](#3-backend-service-setup)
4. [Environment Variables](#4-environment-variables)
5. [Build Configuration](#5-build-configuration)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Prerequisites

- Render.com account
- GitHub repository with Kupito code
- PostgreSQL database (can be created on Render.com)

---

## 2. Database Setup

### Create PostgreSQL Database on Render.com

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `kupito-db` (or your preferred name)
   - **Database:** `kupito` (or your preferred name)
   - **User:** Auto-generated (or custom)
   - **Region:** Choose closest to your backend service
   - **PostgreSQL Version:** 14+ (recommended)
3. Click **Create Database**
4. **⚠️ Important:** Save the connection string and credentials shown after creation

### Database Connection Details

After creation, Render will show:
- **Internal Database URL** (for services in same region)
- **External Database URL** (for external connections)
- **Host**
- **Port** (usually 5432)
- **Database name**
- **Username**
- **Password**

**Note:** Use **Internal Database URL** if backend service is in the same region, or parse the URL to get individual connection parameters.

---

## 3. Backend Service Setup

### Create Web Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Select repository: `Hexj13/Kupito` (or your fork)
4. Configure service:

#### Basic Settings

- **Name:** `kupito-backend`
- **Region:** Same as database (recommended)
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `npm run start:prod`

#### Advanced Settings

- **Auto-Deploy:** `Yes` (deploys on every push to main)
- **Health Check Path:** `/health` (optional)

---

## 4. Environment Variables

### Required Variables

Add these in Render Dashboard → Your Service → **Environment**:

#### Database Configuration

```env
DB_HOST=<your-database-host>
DB_PORT=5432
DB_USERNAME=<your-database-username>
DB_NAME=<your-database-name>
DB_PASSWORD=<your-database-password>
```

**Or use connection string:**

If Render provides a connection string, you can parse it or use individual variables:
- Format: `postgresql://username:password@host:port/database`

#### Application Configuration

```env
NODE_ENV=production
PORT=10000
```

**Note:** Render automatically sets `PORT` environment variable. Your app should use `process.env.PORT || 4000`.

#### Authentication (REQUIRED)

```env
JWT_SECRET=<generate-secure-random-key>
```

**Generate JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use online generator: https://randomkeygen.com/

#### CORS Configuration

```env
FRONTEND_URL=https://your-frontend-domain.com
```

Replace with your actual frontend URL (e.g., `https://kupito.mk` or your Render frontend service URL).

### Optional Variables

#### Database Connection Pooling

```env
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000
```

#### Redis Configuration (Optional)

If using Redis for caching:

```env
REDIS_HOST=<redis-host>
REDIS_PORT=6379
```

**Note:** Create Redis instance on Render if needed, or use external Redis service.

#### Twilio SMS Configuration (Optional)

If using SMS verification:

```env
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_MESSAGING_SERVICE_SID=<your-twilio-messaging-service-sid>
```

#### SMTP Email Configuration (Optional)

If using email verification:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com
```

---

## 5. Build Configuration

### Build Settings

Render automatically detects Node.js projects. Ensure:

1. **Root Directory:** Set to `backend` in service settings
2. **Build Command:** `npm ci && npm run build`
3. **Start Command:** `npm run start:prod`

### Build Process

Render will:
1. Clone repository
2. Run `npm ci` (installs dependencies)
3. Run `npm run build` (compiles TypeScript)
4. Start with `npm run start:prod` (runs `node dist/main.js`)

### Database Migrations

After first deployment, run migrations:

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:

```bash
npm run migration:run
```

Or add as build step (not recommended for production):

```bash
npm ci && npm run build && npm run migration:run
```

**⚠️ Warning:** Only run migrations manually or via separate script, not in build command.

### Loading Brands and Models (REQUIRED)

After migrations, you need to load brands and models into the database. The application requires brands to function properly.

1. Go to Render Dashboard → Your Service → **Shell**
2. Run one of these commands:

**Option 1: Basic brands (recommended for production):**
```bash
npm run add-brands
```

This will load the most common brands and models used in the application.

**Option 2: Full vehicle database:**
```bash
npm run seed:vehicles
```

This loads a comprehensive list of brands and models (takes longer).

**Option 3: Basic seed (for testing):**
```bash
npm run seed
```

This creates minimal test data including brands, models, users, and listings.

**⚠️ Important:** 
- Run migrations first (`npm run migration:run`)
- Then load brands (`npm run add-brands` or `npm run seed:vehicles`)
- Without brands, the `/api/brands` endpoint will return an empty array

---

## 6. Troubleshooting

### Build Fails: "nest: not found"

**Status:** ✅ Fixed

This was resolved by:
- Moving `@nestjs/cli` to `dependencies`
- Using `npx nest build` in build script

### Build Fails: TypeScript Errors in Test Files

**Status:** ✅ Fixed

This was resolved by:
- Excluding `src/test` directory in `tsconfig.json`
- Excluding `*.spec.ts`, `*.test.ts`, `*.integration.ts` files
- Moving `@types/express` and `@types/multer` to `dependencies`

### Application Starts but Can't Connect to Database

**Problem:** `ECONNREFUSED` errors in logs

**Solutions:**

1. **Check Environment Variables:**
   - Verify all database variables are set correctly
   - Check for typos in variable names
   - Ensure values match database credentials

2. **Check Database Status:**
   - Go to Render Dashboard → Your Database
   - Verify database is running (status should be "Available")
   - Check if database is paused (free tier databases pause after inactivity)

3. **Verify Connection Details:**
   - Use **Internal Database URL** if backend and database are in same region
   - Use **External Database URL** if connecting from different region
   - Parse connection string to get individual parameters:
     ```
     postgresql://user:password@host:port/database
     ```

4. **Check Network Access:**
   - Ensure database allows connections from your service
   - On Render, internal services can connect automatically
   - External connections may require IP whitelisting

5. **Test Connection:**
   - Use Render Shell to test:
     ```bash
     psql $DATABASE_URL
     ```
   - Or use connection string directly:
     ```bash
     psql postgresql://user:password@host:port/database
     ```

### Application Crashes on Startup

**Check Logs:**

1. Go to Render Dashboard → Your Service → **Logs**
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - Port already in use (shouldn't happen on Render)
   - Missing migrations

### Health Check Fails

If you set up health check path `/health`:

1. Verify endpoint exists in your code
2. Check logs for errors
3. Ensure service is running

### Environment Variables Not Applied

1. **Verify in Dashboard:**
   - Go to Environment tab
   - Check all variables are listed
   - Ensure no typos in variable names

2. **Redeploy:**
   - After adding/changing variables, service should auto-redeploy
   - If not, manually trigger deploy

3. **Check Variable Names:**
   - Must match exactly (case-sensitive)
   - No spaces or special characters
   - Use underscores, not hyphens

### Database Migrations Not Running

**Manual Migration:**

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:
   ```bash
   npm run migration:run
   ```

**Or add to package.json script:**

Create a deploy script that runs migrations:

```json
"deploy": "npm run migration:run && npm run start:prod"
```

Then set Start Command to: `npm run deploy`

**⚠️ Warning:** Only do this if migrations are idempotent and safe to run multiple times.

---

## 7. Post-Deployment Checklist

After deployment, follow these steps in order:

### Step 1: Verify Service Status

- [ ] Service status is "Live" in Render Dashboard
- [ ] Database is running and accessible
- [ ] Redis is running (if used)
- [ ] No build errors in logs

### Step 2: Run Database Migrations

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:

```bash
npm run migration:run
```

**Expected output:** Should show all migrations executed successfully.

- [ ] Migrations completed without errors
- [ ] No "relation does not exist" errors

### Step 3: Load Brands and Models

**IMPORTANT:** This is required for the application to work properly.

1. In Render Shell, run:

```bash
npm run seed:all-brands
```

This will load all brands and models from all scripts (Italian, American, German, Japanese, French brands).

**Alternative (if seed:all-brands fails):**
```bash
npm run add-brands
npm run add-italian-models
npm run add-american-models
npm run add-german-models
npm run add-japanese-models
npm run add-french-models
```

- [ ] Brands and models loaded successfully
- [ ] Check brands count: `npm run check-brands` (should show ~55+ brands)

### Step 4: Verify Environment Variables

Check that all required variables are set:

- [ ] `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- [ ] `REDIS_HOST`, `REDIS_PORT` (if using Redis)
- [ ] `JWT_SECRET`
- [ ] `FRONTEND_URL`
- [ ] `NODE_ENV=production`
- [ ] `PORT` (usually auto-set by Render)
- [ ] `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` (for SMS)
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (for email)

### Step 5: Test API Endpoints

Test critical endpoints:

```bash
# Health check
curl https://your-backend.onrender.com/health

# Brands (should return array, not empty)
curl https://your-backend.onrender.com/api/brands

# Should return JSON with brands array
```

- [ ] Health check endpoint works
- [ ] `/api/brands` returns brands (not empty array)
- [ ] API responds correctly
- [ ] CORS is configured for frontend URL

### Step 6: Check Logs

1. Go to Render Dashboard → Your Service → **Logs**
2. Check for:
   - No `ECONNREFUSED` errors (database connection)
   - No `ECONNRESET` errors (Redis connection)
   - No TypeORM errors
   - Application started successfully

- [ ] No database connection errors
- [ ] No Redis connection errors (if using Redis)
- [ ] Application started successfully
- [ ] No critical errors in logs

### Step 7: Test Critical Features

Test that core functionality works:

- [ ] User registration works
- [ ] User login works
- [ ] SMS verification works (if configured)
- [ ] Email verification works (if configured)
- [ ] Listings can be created
- [ ] Brands and models are available in forms

### Step 8: Monitor Performance

- [ ] Check service metrics (CPU, Memory)
- [ ] Response times are acceptable
- [ ] No memory leaks
- [ ] Service stays awake (if paid tier)

### Quick Verification Script

You can run this in Render Shell to verify everything:

```bash
# Check brands count
npm run check-brands

# Check models stats
npm run check-models

# Should show:
# - Brands: ~55+
# - Models: 1000+
```

---

## 8. Useful Render.com Features

### Manual Deploy

Trigger manual deployment:
- Render Dashboard → Your Service → **Manual Deploy** → **Deploy latest commit**

### Rollback

Rollback to previous deployment:
- Render Dashboard → Your Service → **Deploys** → Select previous deploy → **Rollback**

### Logs

View real-time logs:
- Render Dashboard → Your Service → **Logs**
- Filter by log level (Info, Warning, Error)

### Shell Access

Access service shell:
- Render Dashboard → Your Service → **Shell**
- Useful for running migrations, debugging, etc.

### Metrics

Monitor service:
- Render Dashboard → Your Service → **Metrics**
- View CPU, Memory, Request metrics

---

## 9. Cost Optimization

### Free Tier Limitations

- **Services:** Sleep after 15 minutes of inactivity
- **Databases:** Pause after 90 days of inactivity (PostgreSQL)
- **Bandwidth:** Limited

### Paid Tier Benefits

- Services stay awake
- Databases don't pause
- More resources
- Better performance

---

## 10. Security Best Practices

1. **Never commit `.env` files** to repository
2. **Use strong JWT_SECRET** (minimum 32 characters, random)
3. **Use strong database passwords**
4. **Enable HTTPS** (automatic on Render)
5. **Set NODE_ENV=production**
6. **Review CORS settings** (only allow your frontend domain)
7. **Regularly update dependencies**
8. **Monitor logs** for suspicious activity

---

**Last Updated:** 2025-11-12


---
title: Deployment
owner: platform
tags:
  - type/guide
  - domain/ops
  - scope/core
  - status/active
---

# Platform deployment

Complete deployment guide for the PPCSL platform on different hosting environments.

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [VPS Deployment (Ubuntu/Debian)](#2-vps-deployment-ubuntudebian)
3. [Render.com Deployment](#3-rendercom-deployment)
4. [Namecheap Domain Setup](#4-namecheap-domain-setup)
5. [SSH Setup](#5-ssh-setup)
6. [Staging Environment](#6-staging-environment)
7. [Troubleshooting](#7-troubleshooting)

**Note:** For CI/CD workflows and automated deployment pipelines, see [technical.md](../architecture/technical.md#13-cicd-configuration) section 13.

---

## 1. Quick Start

### Deployment Options

This guide covers deployment on:

- **VPS (Ubuntu/Debian)** - Full control, recommended for production
- **Render.com** - Cloud platform, good for automatic deployments

---

## 2. VPS Deployment (Ubuntu/Debian)

### Prerequisites

- Ubuntu/Debian server with root access
- Domain name pointing to server IP
- SSH access to server

### Step 1: Server Preparation

#### Connect to Server

```bash
ssh root@your-server-ip
```

#### Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### Step 2: Install Required Software

#### Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x.x or higher
```

#### PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Redis (Optional but Recommended)

```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### PM2

```bash
sudo npm install -g pm2
pm2 startup systemd
# Follow the command PM2 shows
```

#### Git

```bash
sudo apt install -y git
```

### Step 3: Database Setup

#### Create Database and User

```bash
sudo -u postgres psql
```

In PostgreSQL console:

```sql
CREATE USER ppcsl WITH PASSWORD 'your_secure_password';
CREATE DATABASE ppcsl OWNER ppcsl;
GRANT ALL PRIVILEGES ON DATABASE ppcsl TO ppcsl;
\q
```

**⚠️ Important:** Record this password for `.env` file.

### Step 4: Clone and Setup Project

#### Create Project Directory

```bash
sudo mkdir -p /var/www
cd /var/www
# Or use home directory: cd ~ && mkdir -p projects && cd projects
```

#### Clone Repository

```bash
git clone https://github.com/your-username/ppcsl.git
cd ppcsl
```

#### Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 5: Environment Variables

#### Backend `.env`

```bash
cd /var/www/ppcsl/backend
nano .env
```

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ppcsl
DB_PASSWORD=your_secure_password_from_step_3
DB_NAME=ppcsl

# Database Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=0
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000

# Authentication (REQUIRED! Generate secure key)
JWT_SECRET=your_very_long_random_secret_key_minimum_32_characters

# CORS Configuration
FRONTEND_URL=https://your-domain.com

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

# Infocar partner (optional; for signed report URL)
INFOCAR_SECRET_KEY=<secret-from-infocar>

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com
# Details: ../operations/smtp-email-setup.md (EN), ../operations/smtp-email-setup-ru.md (RU)

# Watermark Configuration (optional)
WATERMARK_DOMAIN=your-domain.com
# If not set, domain will be extracted from FRONTEND_URL
```

**Generate JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Frontend `.env.local`

```bash
cd /var/www/ppcsl/frontend
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
# Or if API on same domain:
# NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

#### Set Permissions

```bash
chmod 600 /var/www/ppcsl/backend/.env
chmod 600 /var/www/ppcsl/frontend/.env.local
```

### Step 6: Build Application

#### Build Backend

```bash
cd /var/www/ppcsl/backend
npm run build
npm run migration:run:prod
```

#### Build Frontend

```bash
cd /var/www/ppcsl/frontend
npm run build
```

#### Create Uploads Directory

```bash
mkdir -p /var/www/ppcsl/backend/uploads
chmod 755 /var/www/ppcsl/backend/uploads
```

#### Create Watermark Assets Directory

```bash
mkdir -p /var/www/ppcsl/backend/assets/watermark
chmod 755 /var/www/ppcsl/backend/assets/watermark
# Copy logo.png from frontend/public/logo.png to backend/assets/watermark/logo.png
cp /var/www/ppcsl/frontend/public/logo.png /var/www/ppcsl/backend/assets/watermark/logo.png
```

**Note:** The watermark logo file is required for automatic watermarking of uploaded images. If the file is missing, images will be uploaded without watermark (with a warning in logs).

### Step 7: Configure Nginx

#### Backend API Configuration

```bash
sudo nano /etc/nginx/sites-available/ppcsl-api
```

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    access_log /var/log/nginx/ppcsl-api-access.log;
    error_log /var/log/nginx/ppcsl-api-error.log;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/ppcsl/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Frontend Configuration

```bash
sudo nano /etc/nginx/sites-available/ppcsl-frontend
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    access_log /var/log/nginx/ppcsl-frontend-access.log;
    error_log /var/log/nginx/ppcsl-frontend-error.log;
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Enable Configurations

```bash
sudo ln -s /etc/nginx/sites-available/ppcsl-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/ppcsl-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot --nginx -d api.your-domain.com
sudo certbot renew --dry-run
```

### Step 9: PM2 Configuration

#### Backend PM2 Config

```bash
cd /var/www/ppcsl/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: "ppcsl-backend",
      script: "dist/main.js",
      cwd: "/var/www/ppcsl/backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/pm2/ppcsl-backend-error.log",
      out_file: "/var/log/pm2/ppcsl-backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
```

#### Frontend PM2 Config

```bash
cd /var/www/ppcsl/frontend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: "ppcsl-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/ppcsl/frontend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/pm2/ppcsl-frontend-error.log",
      out_file: "/var/log/pm2/ppcsl-frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
```

#### Start Applications

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

cd /var/www/ppcsl/backend
pm2 start ecosystem.config.js

cd /var/www/ppcsl/frontend
pm2 start ecosystem.config.js

pm2 save
pm2 status
```

### Step 10: Database Backups

See [technical.md](../architecture/technical.md#database) section for backup setup.

---

## 3. Render.com Deployment

Complete guide for deploying PPCSL backend on Render.com.

### 3.1. Prerequisites

- Render.com account
- GitHub repository with PPCSL code
- PostgreSQL database (can be created on Render.com)

### 3.2. Database Setup

#### Create PostgreSQL Database on Render.com

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `ppcsl-db` (or your preferred name)
   - **Database:** `ppcsl` (or your preferred name)
   - **User:** Auto-generated (or custom)
   - **Region:** Choose closest to your backend service
   - **PostgreSQL Version:** 14+ (recommended)
3. Click **Create Database**
4. **⚠️ Important:** Save the connection string and credentials shown after creation

#### Database Connection Details

After creation, Render will show:

- **Internal Database URL** (for services in same region)
- **External Database URL** (for external connections)
- **Host, Port, Database name, Username, Password**

**Note:** Use **Internal Database URL** if backend service is in the same region.

### 3.3. Backend Service Setup

#### Create Web Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Select repository: `Hexj13/kupito.club` (platform repository with submodule)
4. Configure service:

**Basic Settings:**

- **Name:** `ppcsl-backend`
- **Region:** Same as database (recommended)
- **Branch:** `main`
- **Root Directory:** (leave empty)
- **Runtime:** `Node`
- **Build Command:** `git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && git submodule update --init --recursive && npm ci && npm run prepare:build && cd core/backend && ONNXRUNTIME_NODE_INSTALL=skip npm ci && npm run build`
- **Start Command:** `cd core/backend && npm run start:prod`
- **Pre-Deploy Command (recommended):** `cd core/backend && npm run migration:run:prod` — run migrations before each deploy so schema and code stay aligned (see platform [production-deployment.md](../../../docs/deployment/production-deployment.md)).

**Advanced Settings:**

- **Auto-Deploy:** `Yes` (deploys on every push to main)
- **Health Check Path:** `/health` (optional)

**Important:** You must add `GITHUB_PAT` environment variable with a Personal Access Token that has `repo` scope to access the private PPCSL submodule.

### 3.4. Environment Variables

#### Required Variables

Add these in Render Dashboard → Your Service → **Environment**:

**Database Configuration:**

```env
DB_HOST=<your-database-host>
DB_PORT=5432
DB_USERNAME=<your-database-username>
DB_NAME=<your-database-name>
DB_PASSWORD=<your-database-password>
```

**Application Configuration:**

```env
NODE_ENV=production
PORT=10000
ONNXRUNTIME_NODE_INSTALL=skip
```

**Note:** Render automatically sets `PORT` environment variable. Your app should use `process.env.PORT || 4000`. `ONNXRUNTIME_NODE_INSTALL=skip` can also be set inline in the Build Command (`ONNXRUNTIME_NODE_INSTALL=skip npm ci`); it prevents `onnxruntime-node` from downloading optional GPU binaries from NuGet during install (plate masking uses CPU only).

**Authentication (REQUIRED):**

```env
JWT_SECRET=<generate-secure-random-key>
```

**Generate JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**CORS Configuration:**

```env
FRONTEND_URL=https://your-frontend-domain.com
API_URL=https://your-backend-domain.onrender.com
```

#### AWS S3 Configuration (REQUIRED for production)

**⚠️ Important:** On Render.com, the file system is ephemeral. Files saved to disk are lost on restart or redeploy. You **must** use S3 for file storage in production.

**Required variables:**

```env
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
AWS_S3_BUCKET_NAME=ppcsl-uploads
AWS_REGION=eu-north-1
```

**Optional (if using CloudFront CDN):**

```env
AWS_CLOUDFRONT_URL=https://cdn.kupito.club
```

**Setup instructions:**

1. Create S3 bucket in AWS Console
2. Configure CORS for S3 bucket
3. Configure Bucket Policy for public read access
4. Create IAM user for S3 access
5. Create Access Key and save credentials
6. (Optional) Setup CloudFront CDN for faster delivery

**CloudFront image optimization caching (optional but recommended):**

To cache optimized images (resized/recompressed by the backend) at the CDN edge,
add a second origin and behavior to your existing CloudFront distribution:

1. Origins → Create origin:
   - Origin domain: your API server host (e.g. `kupito-backend.onrender.com`)
   - Protocol: HTTPS only
   - Name: `kupito-api`
2. Behaviors → Create behavior:
   - Path pattern: `/api/upload/image/*`
   - Origin: `kupito-api`
   - Viewer protocol: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD
   - Cache policy: CachingOptimized (or custom with All query strings in cache key)
   - Origin request policy: AllViewerExceptHostHeader
   - Compress objects: Yes
3. Set frontend env: `NEXT_PUBLIC_IMAGE_CDN_URL=https://api.kupito.club`

The backend already returns `Cache-Control: public, max-age=31536000, immutable`
for optimized images, so CloudFront will cache them for up to one year.

**Cloudflare Cache Rule for image delivery (recommended when API is proxied through Cloudflare):**

Without an explicit rule, Cloudflare often serves `GET /api/upload/image/*` as **DYNAMIC** (no edge cache), so every browser request hits the origin and competes with other API traffic. Add a Cache Rule so optimized listing images are cached at the edge.

1. Cloudflare Dashboard → select the zone for `api.kupito.club` (or the zone that proxies the API hostname).
2. **Caching** → **Cache Rules** → **Create rule**.
3. **Rule name:** e.g. `Cache optimized listing images`.
4. **When incoming requests match:** Custom filter expression, for example:
   - `(http.host eq "api.kupito.club" and starts_with(http.request.uri.path, "/api/upload/image/"))`
5. **Then:**
   - **Cache eligibility:** Eligible for cache.
   - **Edge TTL:** Respect origin cache-control header (origin sends `max-age=31536000, immutable`).
   - **Browser TTL:** Respect origin or match edge (browser should honor origin `Cache-Control`).
   - **Cache key:** Include **all** query string parameters (or at least `quality` and `width`) so different resize URLs do not collide.
   - If the UI offers **Respect strong ETags:** enable it (the API sets an `ETag` on image responses).
6. Save and deploy the rule.

**Verify:** run twice:

```bash
curl -sI "https://api.kupito.club/api/upload/image/<uuid>.webp?quality=65&width=640"
```

The second response should show `cf-cache-status: HIT` (after the first `MISS`/`DYNAMIC` depending on rollout). Most image traffic should then be served from the edge, reducing origin CPU and avoiding accidental overlap with API rate limits.

**CloudFront CORS for `/uploads/*` (recommended for S3 origin assets):**

Browser `fetch` diagnostics and future `fetch`-based image flows need a successful CORS preflight on the static CDN host. On the CloudFront distribution that serves `AWS_CLOUDFRONT_URL` (e.g. `cdn.kupito.club`):

1. Behaviors → select or create behavior with path pattern `/uploads/*` (or the path your S3 origin uses for listing images).
2. Allowed HTTP methods: **GET, HEAD, OPTIONS** (OPTIONS is required for preflight).
3. Attach a **Response headers policy** that returns CORS headers, for example AWS managed **CORS-With-Preflight** (`5cc3b908-e619-4b99-88e5-2cf7f45965bd`) or a custom policy with at least:
   - `Access-Control-Allow-Origin: https://kupito.club` (and staging origins if needed)
   - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`
   - `Access-Control-Max-Age: 600`
4. Invalidate `/uploads/*` after changes.
5. Verify: `curl -X OPTIONS -H "Origin: https://kupito.club" -H "Access-Control-Request-Method: HEAD" "https://cdn.kupito.club/uploads/<any>.webp"` should return **200** or **204** with `Access-Control-Allow-Origin` present.

Sentry image diagnostics use the backend `HEAD` proxy (`/api/diagnostics/image-status`) and do not depend on this CORS policy, but other client-side `fetch` calls to the CDN will.

### 3.5. Build Configuration

**Build Settings:**

1. **Root Directory:** Leave empty
2. **Build Command:** `git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && git submodule update --init --recursive && npm ci && npm run prepare:build && cd core/backend && ONNXRUNTIME_NODE_INSTALL=skip npm ci && npm run build`
3. **Start Command:** `cd core/backend && npm run start:prod`
4. **Pre-Deploy Command (recommended):** `cd core/backend && npm run migration:run:prod`

### 3.6. Database Migrations

On Render, prefer **Pre-Deploy Command** above so migrations run on every deploy. For first deployment or manual recovery, run migrations in Shell:

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:

```bash
cd core/backend && npm run migration:run:prod
```

### 3.7. Loading Brands and Models (REQUIRED)

After migrations, you need to load brands and models into the database.

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:

```bash
cd core/backend && npm run seed:all-brands:prod
```

This will load all brands and models and automatically clear the Redis cache.

### 3.8. Create Admin User

**IMPORTANT:** Create an admin user to access the admin panel.

1. In Render Shell, run:

```bash
cd core/backend && npm run make-admin:prod -- --email your-email@example.com --password your-secure-password
```

### 3.9. Setting Up Cron Jobs

The application has built-in cron logic for closing old listings and expiring promotions. On Render's free tier, services can sleep after inactivity, so these tasks may not run on schedule.

**Solution: Use an external cron service** (e.g. Render Cron Jobs, cron-job.org) to call the HTTP endpoints.

1. **Set Environment Variable in Backend Service:**
   - Add: `CRON_SECRET=<generate-secure-random-key>`

2. **Create cron jobs** (one per endpoint):

   **Close old listings** (daily at midnight UTC):
   - **URL:** `POST https://your-backend.onrender.com/api/listings/cron/close-old`
   - **Header:** `x-cron-secret: <CRON_SECRET>`
   - **Schedule:** `0 0 * * *`

   **Expire promotions** (hourly; resets `is_promoted` for listings with `promoted_until` in the past):
   - **URL:** `POST https://your-backend.onrender.com/api/listings/cron/expire-promotions`
   - **Header:** `x-cron-secret: <CRON_SECRET>`
   - **Schedule:** `0 * * * *` (every hour)

   **Exchange rates** (if using the cron endpoint instead of the in-app schedule):
   - **URL:** `POST https://your-backend.onrender.com/api/exchange-rates/cron/fetch`
   - **Header:** `x-cron-secret: <CRON_SECRET>`
   - **Schedule:** e.g. `30 2 * * *` (daily at 02:30 UTC)

   Example with curl (Render Cron Job or shell):

   ```bash
   curl -X POST https://your-backend.onrender.com/api/listings/cron/close-old -H "x-cron-secret: $CRON_SECRET"
   curl -X POST https://your-backend.onrender.com/api/listings/cron/expire-promotions -H "x-cron-secret: $CRON_SECRET"
   ```

3. **Prometheus metrics** (internal scraper only):

   - **URL:** `GET https://your-backend.onrender.com/metrics`
   - **Header:** `x-cron-secret: <CRON_SECRET>`
   - **Schedule:** per your monitoring stack (e.g. every 30–60s)
   - The endpoint is protected by `CronSecretGuard`; unauthenticated requests receive 401. Do not expose `/metrics` on a public ingress without the secret.

### 3.9a. Partner parser state (persistent disk)

If you run **CipAuto** or **999.md** import CLI from Render Shell, the parser keeps a JSON registry, PLP snapshot, and run reports on disk. The default app filesystem is **ephemeral** on deploy unless you use a **Render persistent disk**.

1. Attach a disk to `kupito-backend` (Render → **Disk** → **Add Disk**) and note the **mount path** (for example `/var/data`).
2. Add an environment variable on the same **backend web service**: **`PARSING_RUNTIME_DIR=<mount path>`** (must match the mount path exactly). Admin Parsing (manual runs and scheduler) spawns parser CLIs on that host and resolves catalog `plpDataPath` values relative to this root, so the variable must be set on the service—not only in one-off Render Shell sessions.
3. After deploy, parser state is written under:
   - `<mount>/cipauto/cipauto-registry.json`, `cipauto-current-plp.json`, `reports/`
   - `<mount>/999md/999md-registry.json`, `current-plp/`, `reports/`

On first deploy after this change, copy an existing `cipauto-registry.json` into the new location or run `npm run cipauto:seed-registry -- --env prod <userId>` once. See `docs/parsing/cipauto-import.md`.

### 3.10. Telegram support bot (optional)

Bug-report bot: users write to the bot in Telegram; messages are forwarded to a support chat. Requires Redis (for rate limit).

**Environment variables (backend):**

- `TELEGRAM_BOT_TOKEN` — token from [@BotFather](https://t.me/BotFather)
- `TELEGRAM_SUPPORT_CHAT_ID` — ID of the group/channel for reports (e.g. `-1001234567890`). Add the bot to the group and get the ID (e.g. with [@userinfobot](https://t.me/userinfobot)).

**Webhook registration (after API is deployed and reachable):**

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://api.your-domain.com/api/telegram/webhook"
```

Use POST (GET returns 404). To remove: `curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"`.

**Behaviour:** POST `/api/telegram/webhook` receives Telegram updates. Replies to the user are in Romanian + Russian (one message, separator `—`). Rate limit: 20 messages per hour per user (Redis key `telegram:ratelimit:{userId}`). If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_SUPPORT_CHAT_ID` are not set, the bot does nothing and the webhook still returns 200.

### 3.11. Frontend Service Setup (if deployed separately)

If you deploy the frontend as a separate service on Render.com:

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `kupito-frontend`

- **Root Directory:** leave empty
- **Build Command:** `git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && git submodule update --init --recursive && npm run prepare:build && cd core/frontend && npm ci && npm run build`
- **Start Command:** `cd core/frontend && npm start`

**Environment Variables:**

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
```

### 3.12. Troubleshooting

**Application Not Starting:**

- Check logs in Render Dashboard → Your Service → **Logs**
- Check environment variables are set correctly
- Verify database is running and accessible

**502 Bad Gateway:**

- Check application is running
- Check ports are open
- Check Nginx/proxy configuration

**Database Connection Failed:**

- Check PostgreSQL is running
- Verify password in environment variables
- Use Internal Database URL if services are in same region

**Environment Variables Not Applied:**

- Verify in Dashboard → Environment tab
- Redeploy after adding/changing variables
- Check variable names match exactly (case-sensitive)

### 3.13. Post-Deployment Checklist

After deployment:

- [ ] Service status is "Live" in Render Dashboard
- [ ] Database is running and accessible
- [ ] Migrations executed successfully
- [ ] Brands and models loaded
- [ ] Admin user created
- [ ] Health check endpoint works (`/health`)
- [ ] API endpoints respond correctly
- [ ] CORS is configured for frontend URL
- [ ] S3 is configured and working
- [ ] No critical errors in logs

---

## 4. Namecheap Domain Setup

### Prerequisites

- Namecheap account
- Domain registered with Namecheap
- Render.com service deployed

### Step 1: Configure DNS Records

1. Login to Namecheap account
2. Go to **Domain List** → Select your domain → **Manage**
3. Go to **Advanced DNS** tab
4. Add/Update DNS records:

#### For Backend API (if using subdomain)

Add A Record or CNAME:

- **Type:** A Record (or CNAME if using subdomain)
- **Host:** `api` (or your preferred subdomain)
- **Value:** Render.com service IP or hostname
- **TTL:** Automatic (or 30 min)

#### For Frontend

Add A Record or CNAME:

- **Type:** A Record (or CNAME)
- **Host:** `@` (for root domain) or `www` (for www subdomain)
- **Value:** Render.com service IP or hostname
- **TTL:** Automatic (or 30 min)

### Step 2: SSL Certificate

Render.com automatically provisions SSL certificates via Let's Encrypt when you:

1. Add custom domain in Render Dashboard
2. Configure DNS records correctly
3. Wait for DNS propagation (can take up to 48 hours)

### Step 3: Verify Domain

1. In Render Dashboard → Your Service → **Settings** → **Custom Domains**
2. Add your domain (e.g., `your-domain.com`)
3. Render will show DNS configuration instructions
4. Update DNS records in Namecheap as shown
5. Wait for SSL certificate to be issued automatically

### Step 4: Update Environment Variables

After domain is configured, update environment variables:

**Backend:**

```env
FRONTEND_URL=https://your-domain.com
```

**Frontend:**

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## 5. SSH Setup

### Generate SSH Key (Local Mac)

```bash
ssh-keygen -t rsa -b 2048 -f ~/.ssh/ppcsl_key
cat ~/.ssh/ppcsl_key.pub
```

### Add Key to Server

1. Copy your public key:

```bash
cat ~/.ssh/ppcsl_key.pub
```

2. Add the public key to your server's `~/.ssh/authorized_keys` file:

```bash
# On the server
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "your-public-key-content" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Connect to Server

```bash
ssh -i ~/.ssh/ppcsl_key yourusername@your-server.com
```

### SSH Config (Optional)

```bash
nano ~/.ssh/config
```

```
Host your-server
    HostName your-server-ip-or-domain
    User your-username
    IdentityFile ~/.ssh/ppcsl_key
```

Now connect with: `ssh your-server`

### Alternative Ports

If port 22 doesn't work, try:

```bash
ssh -i ~/.ssh/ppcsl_key -p 2222 yourusername@your-server.com
ssh -i ~/.ssh/ppcsl_key -p 2200 yourusername@your-server.com
```

---

## 6. Staging Environment

### Staging-Specific Features

#### OTP Code Bypass (000000)

- **Status:** ✅ Implemented
- **Description:** Fixed OTP `000000` bypasses SMS verification on verify endpoints when allowed by `auth/infrastructure/services/sms-test-code.utils.ts`
- **Environment:**
  - `NODE_ENV=development` or `NODE_ENV=stage` — always allowed
  - `NODE_ENV=test` — only when `ALLOW_SMS_TEST_CODE=true` or `1` (integration tests; set in `jest-integration.setup.ts`)
- **⚠️ Production:** Never allowed; `ALLOW_SMS_TEST_CODE` in production fails env validation at startup

#### Swagger API Documentation

- **Status:** ✅ Implemented
- **URL:** `/api/docs`
- **Environment:** Only when `NODE_ENV !== 'production'`
- **⚠️ Production:** Automatically disabled

#### Design System Page

- **Status:** ✅ Protected
- **URL:** `/design-system`
- **Environment:** Renders a not-found state in production
- **⚠️ Production:** Automatically hidden

### Production Checklist

Before deploying to production:

- [ ] `NODE_ENV=production` is set
- [ ] `JWT_SECRET` is set to strong random value
- [ ] `DB_PASSWORD` is set to secure password
- [ ] Database `synchronize` is disabled (automatic)
- [ ] Swagger is disabled (automatic)
- [ ] OTP bypass is disabled (automatic)
- [ ] Design system page is hidden (automatic)
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Security headers are enabled

---

## 7. Troubleshooting

### Application Not Starting

1. Check logs:

```bash
pm2 logs ppcsl-backend --err
pm2 logs ppcsl-frontend --err
```

2. Check environment variables:

```bash
cat backend/.env
```

3. Check database is running:

```bash
sudo systemctl status postgresql
```

### 502 Bad Gateway

1. Check application is running:

```bash
pm2 status
```

2. Check ports are open:

```bash
sudo netstat -tlnp | grep :4000
sudo netstat -tlnp | grep :3000
```

3. Check Nginx logs:

```bash
sudo tail -f /var/log/nginx/ppcsl-api-error.log
```

### Database Connection Failed

1. Check PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

2. Test connection:

```bash
sudo -u postgres psql -d ppcsl -U ppcsl
```

3. Verify password in `.env` file

### SSL Certificate Issues

1. Check DNS records:

```bash
nslookup your-domain.com
```

2. Renew certificate manually:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Render.com Specific Issues

#### Application Not Starting

1. Check logs in Render Dashboard → Your Service → **Logs**
2. Verify Node.js version is 20+
3. Check build command completed successfully
4. Verify environment variables are set correctly

#### Database Connection Issues

1. Verify database credentials in environment variables
2. Check password is correct
3. Use Internal Database URL if services are in same region
4. Verify database is running in Render Dashboard

#### Custom Domain Issues

1. Verify DNS records are configured correctly in Namecheap
2. Wait for DNS propagation (can take up to 48 hours)
3. Check SSL certificate status in Render Dashboard
4. Verify domain is added in Render Dashboard → Settings → Custom Domains

---

## Useful Commands

### PM2 Management

```bash
pm2 list
pm2 logs ppcsl-backend
pm2 restart ppcsl-backend
pm2 stop ppcsl-backend
pm2 delete ppcsl-backend
pm2 monit
```

### Nginx Management

```bash
sudo systemctl restart nginx
sudo nginx -t
sudo tail -f /var/log/nginx/ppcsl-api-error.log
```

### Update Code

```bash
cd /var/www/ppcsl
git pull origin main
cd backend && npm install && npm run build && pm2 restart kupito-backend
cd ../frontend && npm install && npm run build && pm2 restart kupito-frontend
```

### Database Migrations

```bash
cd /var/www/ppcsl/backend
npm run migration:run:prod
npm run migration:revert:prod
```

---

## Pre-Deployment Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL installed and running
- [ ] Redis installed (optional)
- [ ] Nginx installed and running
- [ ] PM2 installed
- [ ] Project cloned/uploaded
- [ ] Dependencies installed
- [ ] `backend/.env` created and filled
- [ ] `frontend/.env.local` created and filled
- [ ] `JWT_SECRET` generated and set
- [ ] Database password set
- [ ] Database created
- [ ] Migrations executed
- [ ] Backend built
- [ ] Frontend built
- [ ] `uploads` directory created
- [ ] Nginx configurations created and enabled
- [ ] DNS records configured
- [ ] SSL certificates installed
- [ ] Applications started via PM2 (or Render.com)
- [ ] PM2 saved (`pm2 save`)
- [ ] Site opens in browser
- [ ] Health check endpoint works (`/health`)
- [ ] Database backups configured

---

**Last Updated:** 2026-01-16

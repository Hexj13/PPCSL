# Deployment Guide

Complete deployment guide for the Kupito platform on different hosting environments.

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [VPS Deployment (Ubuntu/Debian)](#2-vps-deployment-ubuntudebian)
3. [cPanel Deployment (Shared Hosting)](#3-cpanel-deployment-shared-hosting)
4. [SSH Setup](#4-ssh-setup)
5. [Staging Environment](#5-staging-environment)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Quick Start

### Deployment Options

This guide covers deployment on:
- **VPS (Ubuntu/Debian)** - Full control, recommended for production
- **cPanel (Shared Hosting)** - Easy setup, good for small projects
- **Render.com** - Cloud platform, good for automatic deployments

### For cPanel (mkhost.com)

```bash
# 1. Access cPanel
https://luna.mk-host.mk/cpanel

# 2. Create database in cPanel → MySQL Databases
#    Record full names with prefix (e.g., kupitomk_kupito)

# 3. Clone project
cd ~/public_html
git clone https://github.com/your-username/kupito.git
cd kupito

# 4. Configure .env files
# backend/.env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_USERNAME=kupitomk_user
DB_PASSWORD=your_password
DB_NAME=kupitomk_kupito
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL=https://kupito.mk

# frontend/.env.local
NEXT_PUBLIC_API_URL=https://kupito.mk/api
NEXT_PUBLIC_SITE_URL=https://kupito.mk

# 5. Build and deploy
cd backend && npm install --production && npm run build && npm run migration:run
cd ../frontend && npm install --production && npm run build

# 6. Setup Node.js apps in cPanel
# Backend: Root=~/public_html/kupito/backend, URL=/api, Startup=dist/main.js
# Frontend: Root=~/public_html/kupito/frontend, URL=/, Startup=node_modules/next/dist/bin/next, Args=start

# 7. SSL: cPanel → SSL/TLS Status → Run AutoSSL
```

**Full instructions:** See [cPanel Deployment](#3-cpanel-deployment-shared-hosting) section below.

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
CREATE USER kupito WITH PASSWORD 'your_secure_password';
CREATE DATABASE kupito OWNER kupito;
GRANT ALL PRIVILEGES ON DATABASE kupito TO kupito;
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
git clone https://github.com/your-username/kupito.git
cd kupito
```

#### Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 5: Environment Variables

#### Backend `.env`

```bash
cd /var/www/kupito/backend
nano .env
```

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=your_secure_password_from_step_3
DB_NAME=kupito

# Database Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

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

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@your-domain.com

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
cd /var/www/kupito/frontend
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
chmod 600 /var/www/kupito/backend/.env
chmod 600 /var/www/kupito/frontend/.env.local
```

### Step 6: Build Application

#### Build Backend

```bash
cd /var/www/kupito/backend
npm run build
npm run migration:run
```

#### Build Frontend

```bash
cd /var/www/kupito/frontend
npm run build
```

#### Create Uploads Directory

```bash
mkdir -p /var/www/kupito/backend/uploads
chmod 755 /var/www/kupito/backend/uploads
```

#### Create Watermark Assets Directory

```bash
mkdir -p /var/www/kupito/backend/assets/watermark
chmod 755 /var/www/kupito/backend/assets/watermark
# Copy logo.png from frontend/public/logo.png to backend/assets/watermark/logo.png
cp /var/www/kupito/frontend/public/logo.png /var/www/kupito/backend/assets/watermark/logo.png
```

**Note:** The watermark logo file is required for automatic watermarking of uploaded images. If the file is missing, images will be uploaded without watermark (with a warning in logs).

### Step 7: Configure Nginx

#### Backend API Configuration

```bash
sudo nano /etc/nginx/sites-available/kupito-api
```

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    access_log /var/log/nginx/kupito-api-access.log;
    error_log /var/log/nginx/kupito-api-error.log;
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
        alias /var/www/kupito/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Frontend Configuration

```bash
sudo nano /etc/nginx/sites-available/kupito-frontend
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    access_log /var/log/nginx/kupito-frontend-access.log;
    error_log /var/log/nginx/kupito-frontend-error.log;
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
sudo ln -s /etc/nginx/sites-available/kupito-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/kupito-frontend /etc/nginx/sites-enabled/
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
cd /var/www/kupito/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'kupito-backend',
      script: 'dist/main.js',
      cwd: '/var/www/kupito/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/kupito-backend-error.log',
      out_file: '/var/log/pm2/kupito-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

#### Frontend PM2 Config

```bash
cd /var/www/kupito/frontend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'kupito-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/kupito/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/kupito-frontend-error.log',
      out_file: '/var/log/pm2/kupito-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

#### Start Applications

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

cd /var/www/kupito/backend
pm2 start ecosystem.config.js

cd /var/www/kupito/frontend
pm2 start ecosystem.config.js

pm2 save
pm2 status
```

### Step 10: Database Backups

See [TECHNICAL.md](./TECHNICAL.md#database) section for backup setup.

---

## 3. cPanel Deployment (Shared Hosting)

### Prerequisites

- cPanel access (e.g., mkhost.com)
- Domain configured
- Node.js 20+ available in cPanel

### Step 1: Access cPanel

1. Open: **https://luna.mk-host.mk/cpanel** or **https://kupito.mk/cpanel**
2. Login with credentials from hosting provider

### Step 2: Create Database

1. In cPanel find **"MySQL Databases"** or **"PostgreSQL Databases"**
2. Create database: `kupito`
3. Create user with secure password
4. **⚠️ Important:** Record full names with prefix:
   - Database: `kupitomk_kupito`
   - User: `kupitomk_user`
   - Password: (your password)

### Step 3: Upload Project

#### Option A: Via Git (Recommended)

If SSH is available:

```bash
cd ~/public_html
git clone https://github.com/your-username/kupito.git
cd kupito
```

#### Option B: Via File Manager

1. In cPanel open **"File Manager"**
2. Go to `public_html` directory
3. Upload ZIP archive and extract

#### Option C: Via SFTP

Use FTP client (FileZilla, WinSCP) with cPanel credentials.

### Step 4: Environment Variables

#### Backend `.env`

```bash
cd ~/public_html/kupito/backend
nano .env
```

```env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupitomk_user
DB_PASSWORD=your_password_from_step_2
DB_NAME=kupitomk_kupito
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL=https://kupito.mk
```

#### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=https://kupito.mk/api
NEXT_PUBLIC_SITE_URL=https://kupito.mk
```

### Step 5: Build Project

```bash
# Backend
cd ~/public_html/kupito/backend
npm install --production
npm run build
npm run migration:run

# Frontend
cd ~/public_html/kupito/frontend
npm install --production
npm run build

# Create uploads directory
mkdir -p ~/public_html/kupito/backend/uploads
chmod 755 ~/public_html/kupito/backend/uploads

# Create watermark assets directory
mkdir -p ~/public_html/kupito/backend/assets/watermark
chmod 755 ~/public_html/kupito/backend/assets/watermark
# Copy logo.png from frontend/public/logo.png to backend/assets/watermark/logo.png
cp ~/public_html/kupito/frontend/public/logo.png ~/public_html/kupito/backend/assets/watermark/logo.png
```

### Step 6: Configure Node.js Apps in cPanel

#### Backend Application

1. In cPanel find **"Node.js"** or **"Setup Node.js App"**
2. Click **"Create Application"**
3. Configure:
   - **Node.js version:** 20.x or higher
   - **Application mode:** Production
   - **Application root:** `/home/kupitomk/public_html/kupito/backend`
   - **Application URL:** `/api`
   - **Application startup file:** `dist/main.js`
4. Add environment variables from `.env` file
5. Click **"Create"**

#### Frontend Application

1. Create another Node.js application
2. Configure:
   - **Application root:** `/home/kupitomk/public_html/kupito/frontend`
   - **Application URL:** `/` (root domain)
   - **Application startup file:** `node_modules/next/dist/bin/next`
   - **Application arguments:** `start`
3. Add environment variables from `.env.local`
4. Click **"Create"**

### Step 7: SSL Certificate

1. In cPanel find **"SSL/TLS Status"**
2. Click **"Run AutoSSL"**
3. Wait a few minutes for certificate installation

### Step 8: Verify Deployment

- Frontend: https://kupito.mk
- Backend API: https://kupito.mk/api
- Health check: https://kupito.mk/api/health

---

## 4. SSH Setup

### Enable SSH Access in cPanel

1. Login to cPanel: https://luna.mk-host.mk/cpanel
2. Find **"SSH Access"** section (in Security or Advanced)
3. Click **"Enable SSH Access"** or **"Manage SSH Access"**
4. Follow instructions (may require email confirmation)

### Generate SSH Key (Local Mac)

```bash
ssh-keygen -t rsa -b 2048 -f ~/.ssh/kupito_key
cat ~/.ssh/kupito_key.pub
```

### Add Key to cPanel

1. In cPanel → **"SSH Access"** → **"Manage SSH Keys"**
2. Click **"Import Key"**
3. Paste public key content
4. Name: `kupito_key`
5. Click **"Import"** then **"Authorize"**

### Connect to Server

```bash
ssh -i ~/.ssh/kupito_key kupitomk@luna.mk-host.mk
```

### SSH Config (Optional)

```bash
nano ~/.ssh/config
```

```
Host kupito
    HostName luna.mk-host.mk
    User kupitomk
    IdentityFile ~/.ssh/kupito_key
```

Now connect with: `ssh kupito`

### Alternative Ports

If port 22 doesn't work, try:

```bash
ssh -i ~/.ssh/kupito_key -p 2222 kupitomk@luna.mk-host.mk
ssh -i ~/.ssh/kupito_key -p 2200 kupitomk@luna.mk-host.mk
```

---

## 5. Staging Environment

### Staging-Specific Features

#### OTP Code Bypass (000000)

- **Status:** ✅ Implemented
- **Description:** On staging/development, OTP code `000000` bypasses SMS verification
- **Environment:** Only when `NODE_ENV=stage` or `NODE_ENV=development`
- **⚠️ Production:** Automatically disabled in production

#### Swagger API Documentation

- **Status:** ✅ Implemented
- **URL:** `/api/docs`
- **Environment:** Only when `NODE_ENV !== 'production'`
- **⚠️ Production:** Automatically disabled

#### Design System Page

- **Status:** ✅ Protected
- **URL:** `/design-system`
- **Environment:** Returns 404 in production
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

## 6. Troubleshooting

### Application Not Starting

1. Check logs:
```bash
pm2 logs kupito-backend --err
pm2 logs kupito-frontend --err
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
sudo tail -f /var/log/nginx/kupito-api-error.log
```

### Database Connection Failed

1. Check PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

2. Test connection:
```bash
sudo -u postgres psql -d kupito -U kupito
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

### cPanel Specific Issues

#### Node.js App Not Starting

1. Check logs in cPanel → Node.js → View Logs
2. Verify Node.js version is 20+
3. Check `dist/main.js` exists
4. Verify environment variables

#### Database Connection Issues

1. Verify database and user names include prefix
2. Check password is correct
3. Ensure user has privileges on database
4. Verify database exists in cPanel

---

## Useful Commands

### PM2 Management

```bash
pm2 list
pm2 logs kupito-backend
pm2 restart kupito-backend
pm2 stop kupito-backend
pm2 delete kupito-backend
pm2 monit
```

### Nginx Management

```bash
sudo systemctl restart nginx
sudo nginx -t
sudo tail -f /var/log/nginx/kupito-api-error.log
```

### Update Code

```bash
cd /var/www/kupito
git pull origin main
cd backend && npm install && npm run build && pm2 restart kupito-backend
cd ../frontend && npm install && npm run build && pm2 restart kupito-frontend
```

### Database Migrations

```bash
cd /var/www/kupito/backend
npm run migration:run
npm run migration:revert
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
- [ ] Applications started via PM2 (or cPanel)
- [ ] PM2 saved (`pm2 save`)
- [ ] Site opens in browser
- [ ] Health check endpoint works (`/health`)
- [ ] Database backups configured

---

## 7. Render.com Deployment

Complete guide for deploying Kupito backend on Render.com.

### 7.1. Prerequisites

- Render.com account
- GitHub repository with Kupito code
- PostgreSQL database (can be created on Render.com)

### 7.2. Database Setup

#### Create PostgreSQL Database on Render.com

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `kupito-db` (or your preferred name)
   - **Database:** `kupito` (or your preferred name)
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

### 7.3. Backend Service Setup

#### Create Web Service

1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. Select repository: `Hexj13/kupito.club` (platform repository with submodule)
4. Configure service:

**Basic Settings:**
- **Name:** `kupito-backend`
- **Region:** Same as database (recommended)
- **Branch:** `main`
- **Root Directory:** (leave empty)
- **Runtime:** `Node`
- **Build Command:** `git config --global credential.helper store && echo "https://x-access-token:${GITHUB_PAT}@github.com" > ~/.git-credentials && git submodule update --init --recursive && cd core/backend && npm ci && npm run build`
- **Start Command:** `cd core/backend && npm run start:prod`

**Advanced Settings:**
- **Auto-Deploy:** `Yes` (deploys on every push to main)
- **Health Check Path:** `/health` (optional)

**Important:** You must add `GITHUB_PAT` environment variable with a Personal Access Token that has `repo` scope to access the private PPCSL submodule.

### 7.4. Environment Variables

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
```

**Note:** Render automatically sets `PORT` environment variable. Your app should use `process.env.PORT || 4000`.

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
AWS_S3_BUCKET_NAME=kupito-uploads
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

### 7.5. Build Configuration

**Build Settings:**
1. **Root Directory:** Set to `backend` in service settings
2. **Build Command:** `npm ci && npm run build`
3. **Start Command:** `npm run start:prod`

### 7.6. Database Migrations

After first deployment, run migrations:

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:
```bash
npm run migration:run
```

### 7.7. Loading Brands and Models (REQUIRED)

After migrations, you need to load brands and models into the database.

1. Go to Render Dashboard → Your Service → **Shell**
2. Run:
```bash
npm run seed:all-brands
```

This will load all brands and models and automatically clear the Redis cache.

### 7.8. Create Admin User

**IMPORTANT:** Create an admin user to access the admin panel.

1. In Render Shell, run:
```bash
npm run make-admin:prod -- --email your-email@example.com --password your-secure-password
```

### 7.9. Setting Up Cron Jobs

The application has a built-in cron job that automatically closes listings older than 5 months (non-promoted listings only; promoted listings close automatically after promotion expires). However, on Render's free tier, services can sleep after inactivity.

**Solution: Use Render Cron Job Service**

1. **Set Environment Variable in Backend Service:**
   - Add: `CRON_SECRET=<generate-secure-random-key>`

2. **Create Cron Job in Render Dashboard:**
   - Go to Render Dashboard → Your Project → **"CREATE NEW"** → **Cron Job**
   - Configure:
     - **Name:** `close-old-listings`
     - **Schedule:** `0 0 * * *` (runs daily at midnight UTC)
     - **Command:** 
       ```bash
       curl -X POST https://your-backend.onrender.com/api/listings/cron/close-old -H "x-cron-secret: $CRON_SECRET"
       ```
     - **Environment:** Same environment as your backend service

### 7.10. Frontend Service Setup (if deployed separately)

If you deploy the frontend as a separate service on Render.com:

1. Go to Render Dashboard → **New** → **Static Site** (recommended for Next.js) or **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `kupito-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `.next` (for Static Site)

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain.com
```

### 7.11. Troubleshooting

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

### 7.12. Post-Deployment Checklist

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

**Last Updated:** 2025-01-XX

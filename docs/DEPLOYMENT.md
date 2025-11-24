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

**Last Updated:** 2025-01-XX

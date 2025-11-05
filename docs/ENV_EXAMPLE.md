# Environment Variables Configuration

This document describes the required environment variables for the Kupito application.

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito

# Authentication
JWT_SECRET=your-secret-key-change-in-production

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Redis Configuration (optional, defaults to localhost:6379)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid
```

### Variable Descriptions

- **PORT**: Port number for the backend server (default: 4000)
- **NODE_ENV**: Environment mode (`development`, `production`, or `test`)
- **DB_HOST**: PostgreSQL database host address
- **DB_PORT**: PostgreSQL database port number (default: 5432)
- **DB_USERNAME**: PostgreSQL database username
- **DB_PASSWORD**: PostgreSQL database password
- **DB_NAME**: PostgreSQL database name
- **JWT_SECRET**: Secret key for JWT token signing (⚠️ **REQUIRED in production**)
- **FRONTEND_URL**: Frontend application URL for CORS configuration
- **REDIS_HOST**: Redis server host address (default: localhost)
- **REDIS_PORT**: Redis server port number (default: 6379)
- **TWILIO_ACCOUNT_SID**: Twilio Account SID for SMS service
- **TWILIO_AUTH_TOKEN**: Twilio Auth Token for SMS service
- **TWILIO_MESSAGING_SERVICE_SID**: Twilio Messaging Service SID

### Production Notes

⚠️ **Important**: In production, you **must** set `JWT_SECRET` and `DB_PASSWORD` to secure values. The application will throw an error if `JWT_SECRET` is missing in production mode.

## Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Variable Descriptions

- **NEXT_PUBLIC_API_URL**: Backend API base URL (must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser)

### Production Configuration

For production, update `NEXT_PUBLIC_API_URL` to your production backend URL:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Quick Setup

1. Copy the example values above
2. Create `backend/.env` with backend variables
3. Create `frontend/.env.local` with frontend variables
4. Update values for your environment (especially for production)
5. Ensure `.env` files are listed in `.gitignore` (they should be by default)

## Security Reminders

- ✅ Never commit `.env` files to version control
- ✅ Use strong, randomly generated secrets in production
- ✅ Different secrets for each environment (development, staging, production)
- ✅ Restrict database access with proper credentials
- ✅ Use HTTPS in production

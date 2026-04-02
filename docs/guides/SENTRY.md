---
title: Sentry setup and monitoring
owner: platform
tags:
  - type/guide
  - domain/ops
  - scope/core
  - status/active
---

# Sentry — setup and error monitoring

## Created

23 January 2026

## Related documents

- **[logging.md](./logging.md)** — Structured payloads, request correlation, sanitization, LogTape go/no-go
- **[ga4-events.md](../analytics/ga4-events.md)** — GA4 events and architecture (errors in Sentry)
- **[platform-guide.md](./platform-guide.md#6-analytics-and-monitoring-configuration-ga-gtm-sentry)** — GA, GTM, Sentry configuration for platforms

## Overview

Sentry is a platform for application error and performance monitoring. This document describes setting up Sentry to track errors on the frontend and backend.

## Why use Sentry

### Advantages over GA4 exception events

- **Detailed error information**: full stack traces, execution context
- **Error grouping**: automatic grouping of similar errors
- **Notifications**: instant alerts for critical errors
- **Error history**: full error occurrence history
- **User context**: user, browser, device information
- **Performance monitoring**: performance tracking
- **Release tracking**: errors by application version

### What to track

- JavaScript errors on the client
- Unhandled promise rejections
- API request errors
- Server errors (NestJS)
- Validation errors
- Critical application errors

## Installation and setup

### 1. Create project in Sentry

1. Go to https://sentry.io
2. Create an account or sign in
3. Create a new project:
   - **Platform**: Next.js (for frontend)
   - **Platform**: Node.js (for backend)
4. Copy the DSN (Data Source Name) for each project

### 2. Install packages

#### Frontend (Next.js)

```bash
cd core/frontend
npm install @sentry/nextjs
```

#### Backend (NestJS)

```bash
cd core/backend
npm install @sentry/node @sentry/profiling-node
```

### 3. Environment variables

#### Frontend (.env.local)

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-frontend-project
SENTRY_AUTH_TOKEN=your-auth-token
```

#### Backend (.env)

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

## Frontend integration

### 1. Sentry initialization

Create `core/frontend/sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
```

Create `core/frontend/sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});
```

Server uses 0.2 (20% of transactions) to reduce memory usage: at 100% tracing every health check and request creates a full trace, which on memory-limited hosts (e.g. Render.com) can cause OOM without real traffic.

Create `core/frontend/sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Update next.config.js

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... existing config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
  },
);
```

### 3. Global error handler

Update `core/frontend/app/layout.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      Sentry.captureException(event.error, {
        tags: {
          errorType: 'unhandled',
        },
        extra: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      Sentry.captureException(event.reason, {
        tags: {
          errorType: 'unhandledRejection',
        },
        extra: {
          reason: event.reason,
        },
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // ... rest of layout
}
```

### 4. API error handling

Update the interceptor in `core/frontend/lib/api/api-client.ts` (or another module in `lib/api/`):

```typescript
import * as Sentry from '@sentry/nextjs';

// In error handling
try {
  // ... API request
} catch (error) {
  // Log to Sentry for critical errors
  if (error.response?.status >= 500) {
    Sentry.captureException(error, {
      tags: {
        apiError: true,
        statusCode: error.response?.status,
      },
      extra: {
        url: error.config?.url,
        method: error.config?.method,
        response: error.response?.data,
      },
    });
  }
  throw error;
}
```

### 5. User context

Add to `core/frontend/lib/store/store.ts` (auth store):

```typescript
import * as Sentry from '@sentry/nextjs';

// On successful auth
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
});

// On logout
Sentry.setUser(null);
```

## Backend integration

### 1. Sentry initialization

Create `core/backend/src/common/sentry.config.ts`:

```typescript
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [new ProfilingIntegration()],
});
```

### 2. Update main.ts

```typescript
import * as Sentry from '@sentry/node';

// At top of file, before creating app
import './common/sentry.config';

async function bootstrap() {
  // ... rest of bootstrap
}
```

### 3. Update HttpExceptionFilter

Update `core/backend/src/common/filters/http-exception.filter.ts`:

```typescript
import * as Sentry from '@sentry/node';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // ... existing code

  catch(exception: unknown, host: ArgumentsHost) {
    // ... existing logic

    // Send to Sentry for critical errors
    if (status >= 500) {
      Sentry.captureException(exception, {
        tags: {
          httpStatus: status,
          httpMethod: request.method,
          httpPath: request.url,
        },
        extra: {
          requestBody: request.body,
          queryParams: request.query,
          user: request.user, // if auth present
        },
      });
    }

    // ... rest of catch
  }
}
```

### 4. Request context

Create an interceptor to add context:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    Sentry.configureScope((scope) => {
      scope.setTag('httpMethod', request.method);
      scope.setTag('httpPath', request.url);
      if (request.user) {
        scope.setUser({
          id: request.user.id,
          email: request.user.email,
        });
      }
    });

    return next.handle();
  }
}
```

Add to `app.module.ts`:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';

providers: [
  // ... existing providers
  {
    provide: APP_INTERCEPTOR,
    useClass: SentryInterceptor,
  },
],
```

## Notification setup

### 1. Email notifications

1. In Sentry: Settings → Notifications
2. Configure notifications for:
   - New errors
   - Critical errors (>= 500)
   - Sudden error rate increase

### 2. Integrations

- **Slack**: team notifications
- **Discord**: Slack alternative
- **PagerDuty**: critical incidents
- **Email**: basic notifications

## Error filtering

### Ignoring known errors

#### Frontend

```typescript
Sentry.init({
  // ... other options
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Non-Error promise rejection captured'],
  beforeSend(event, hint) {
    // Filter by error type
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error && error.message.includes('specific error')) {
        return null; // Ignore
      }
    }
    return event;
  },
});
```

#### Backend

```typescript
Sentry.init({
  // ... other options
  ignoreErrors: ['ValidationError', 'UnauthorizedException'],
  beforeSend(event, hint) {
    // Filter by status
    if (event.tags?.httpStatus && event.tags.httpStatus < 500) {
      return null; // Ignore client errors
    }
    return event;
  },
});
```

## Release tracking

### Release setup

#### Frontend (package.json)

```json
{
  "scripts": {
    "build": "next build",
    "sentry:sourcemaps": "sentry-cli sourcemaps inject --org=your-org --project=your-project .next && next build"
  }
}
```

#### Backend (release)

```typescript
Sentry.init({
  // ... other options
  release: process.env.SENTRY_RELEASE || '1.0.0',
});
```

## Performance monitoring

### Enabling Performance Monitoring

#### Frontend

```typescript
Sentry.init({
  // ... other options
  tracesSampleRate: 0.2,
  integrations: [Sentry.browserTracingIntegration()],
});
```

On the server (sentry.server.config.ts) 0.1–0.2 is recommended to reduce memory; on the client you can use up to 1.0 if needed.

#### Backend

```typescript
Sentry.init({
  // ... other options
  tracesSampleRate: 1.0,
  integrations: [new ProfilingIntegration()],
});
```

## Testing

### Verify integration

1. **Test error on frontend:**

```typescript
// In a test component
const testError = () => {
  throw new Error('Test Sentry error');
};
```

2. **Test error on backend:**

```typescript
// In a test controller
@Get('test-error')
testError() {
  throw new Error('Test Sentry error');
}
```

3. **Check in Sentry:**
   - Go to Issues
   - Confirm the error appeared
   - Check details: stack trace, context, user

## Best practices

### 1. Error context

- Always add context when sending errors
- Include user info when authenticated
- Add request/action metadata

### 2. Error grouping

- Use fingerprint for custom grouping
- Configure grouping rules in Sentry

### 3. Privacy

- Do not send sensitive data (passwords, tokens)
- Use `beforeSend` to filter data
- Configure Data Scrubbing in Sentry

### 4. Performance

- Use sampling to reduce load
- Configure rate limiting
- Monitor Sentry impact on performance

## Integration with GA4

Sentry and GA4 complement each other:

- **Sentry**: detailed error tracking, stack traces, context
- **GA4**: overall error stats, engagement metrics

No need to duplicate error tracking in GA4 when using Sentry.

## Links

- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [NestJS Integration](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

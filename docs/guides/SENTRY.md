# Sentry — настройка и мониторинг ошибок

## Дата создания

23 января 2026

## Связанные документы

- **[GA4_EVENTS.md](../analytics/GA4_EVENTS.md)** — события и архитектура GA4 (ошибки — в Sentry)
- **[PLATFORM_GUIDE.md](./PLATFORM_GUIDE.md#6-конфигурация-аналитики-и-мониторинга-ga-gtm-sentry)** — конфигурация GA, GTM, Sentry для платформ

## Обзор

Sentry - это платформа для мониторинга ошибок и производительности приложений. Документ описывает настройку Sentry для отслеживания ошибок на фронтенде и бэкенде проекта.

## Зачем нужен Sentry

### Преимущества перед GA4 exception events

- **Детальная информация об ошибках**: полные stack traces, контекст выполнения
- **Группировка ошибок**: автоматическая группировка похожих ошибок
- **Уведомления**: мгновенные уведомления о критических ошибках
- **История ошибок**: полная история возникновения ошибок
- **Контекст пользователя**: информация о пользователе, браузере, устройстве
- **Performance monitoring**: отслеживание производительности
- **Release tracking**: отслеживание ошибок по версиям приложения

### Что отслеживать

- JavaScript ошибки на клиенте
- Unhandled promise rejections
- Ошибки API запросов
- Ошибки на сервере (NestJS)
- Ошибки валидации
- Критические ошибки приложения

## Установка и настройка

### 1. Создание проекта в Sentry

1. Перейти на https://sentry.io
2. Создать аккаунт или войти
3. Создать новый проект:
   - **Platform**: Next.js (для фронтенда)
   - **Platform**: Node.js (для бэкенда)
4. Скопировать DSN (Data Source Name) для каждого проекта

### 2. Установка пакетов

#### Фронтенд (Next.js)

```bash
cd core/frontend
npm install @sentry/nextjs
```

#### Бэкенд (NestJS)

```bash
cd core/backend
npm install @sentry/node @sentry/profiling-node
```

### 3. Настройка переменных окружения

#### Фронтенд (.env.local)

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-frontend-project
SENTRY_AUTH_TOKEN=your-auth-token
```

#### Бэкенд (.env)

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

## Интеграция на фронтенде

### 1. Инициализация Sentry

Создать файл `core/frontend/sentry.client.config.ts`:

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

Создать файл `core/frontend/sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});
```

На сервере используется 0.2 (20% транзакций), чтобы снизить потребление памяти: при 100% трейсинге каждый health check и запрос создаёт полный trace, что на хостингах с ограниченной памятью (например Render.com) может приводить к OOM без реального трафика.

Создать файл `core/frontend/sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Обновление next.config.js

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // ... существующая конфигурация
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

### 3. Глобальный обработчик ошибок

Обновить `core/frontend/app/layout.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Обработка unhandled errors
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

    // Обработка unhandled promise rejections
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

  // ... остальной код
}
```

### 4. Обработка ошибок API

Обновить `core/frontend/lib/api/api.ts` (или перехватчик в `lib/api/`):

```typescript
import * as Sentry from '@sentry/nextjs';

// В функции обработки ошибок
try {
  // ... API запрос
} catch (error) {
  // Логирование в Sentry для критических ошибок
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

### 5. Контекст пользователя

Добавить в `core/frontend/lib/store/store.ts` (auth store):

```typescript
import * as Sentry from '@sentry/nextjs';

// При успешной авторизации
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
});

// При выходе
Sentry.setUser(null);
```

## Интеграция на бэкенде

### 1. Инициализация Sentry

Создать файл `core/backend/src/common/sentry.config.ts`:

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

### 2. Обновление main.ts

```typescript
import * as Sentry from '@sentry/node';

// В начале файла, до создания приложения
import './common/sentry.config';

async function bootstrap() {
  // ... остальной код
}
```

### 3. Обновление HttpExceptionFilter

Обновить `core/backend/src/common/filters/http-exception.filter.ts`:

```typescript
import * as Sentry from '@sentry/node';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  // ... существующий код

  catch(exception: unknown, host: ArgumentsHost) {
    // ... существующая логика

    // Отправка в Sentry для критических ошибок
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
          user: request.user, // если есть авторизация
        },
      });
    }

    // ... остальной код
  }
}
```

### 4. Контекст запроса

Создать interceptor для добавления контекста:

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

Добавить в `app.module.ts`:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';

providers: [
  // ... существующие провайдеры
  {
    provide: APP_INTERCEPTOR,
    useClass: SentryInterceptor,
  },
],
```

## Настройка уведомлений

### 1. Email уведомления

1. В Sentry: Settings → Notifications
2. Настроить уведомления для:
   - Новых ошибок
   - Критических ошибок (>= 500)
   - Резкого увеличения частоты ошибок

### 2. Интеграции

- **Slack**: для уведомлений команды
- **Discord**: альтернатива Slack
- **PagerDuty**: для критических инцидентов
- **Email**: базовые уведомления

## Фильтрация ошибок

### Игнорирование известных ошибок

#### Фронтенд

```typescript
Sentry.init({
  // ... другие настройки
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Non-Error promise rejection captured'],
  beforeSend(event, hint) {
    // Фильтрация по типу ошибки
    if (event.exception) {
      const error = hint.originalException;
      if (error instanceof Error && error.message.includes('specific error')) {
        return null; // Игнорировать
      }
    }
    return event;
  },
});
```

#### Бэкенд

```typescript
Sentry.init({
  // ... другие настройки
  ignoreErrors: ['ValidationError', 'UnauthorizedException'],
  beforeSend(event, hint) {
    // Фильтрация по статусу
    if (event.tags?.httpStatus && event.tags.httpStatus < 500) {
      return null; // Игнорировать клиентские ошибки
    }
    return event;
  },
});
```

## Release tracking

### Настройка релизов

#### Фронтенд (package.json)

```json
{
  "scripts": {
    "build": "next build",
    "sentry:sourcemaps": "sentry-cli sourcemaps inject --org=your-org --project=your-project .next && next build"
  }
}
```

#### Бэкенд

```typescript
Sentry.init({
  // ... другие настройки
  release: process.env.SENTRY_RELEASE || '1.0.0',
});
```

## Мониторинг производительности

### Включение Performance Monitoring

#### Фронтенд

```typescript
Sentry.init({
  // ... другие настройки
  tracesSampleRate: 0.2,
  integrations: [Sentry.browserTracingIntegration()],
});
```

На сервере (sentry.server.config.ts) рекомендуется 0.1–0.2 для снижения потребления памяти; на клиенте можно использовать до 1.0 при необходимости.

#### Бэкенд

```typescript
Sentry.init({
  // ... другие настройки
  tracesSampleRate: 1.0,
  integrations: [new ProfilingIntegration()],
});
```

## Тестирование

### Проверка интеграции

1. **Тестовая ошибка на фронтенде:**

```typescript
// В компоненте для тестирования
const testError = () => {
  throw new Error('Test Sentry error');
};
```

2. **Тестовая ошибка на бэкенде:**

```typescript
// В контроллере для тестирования
@Get('test-error')
testError() {
  throw new Error('Test Sentry error');
}
```

3. **Проверка в Sentry:**
   - Перейти в Issues
   - Убедиться, что ошибка появилась
   - Проверить детали: stack trace, контекст, пользователь

## Best Practices

### 1. Контекст ошибок

- Всегда добавлять контекст при отправке ошибок
- Включать информацию о пользователе (если авторизован)
- Добавлять метаданные о запросе/действии

### 2. Группировка ошибок

- Использовать fingerprint для кастомной группировки
- Настраивать правила группировки в Sentry

### 3. Приватность

- Не отправлять чувствительные данные (пароли, токены)
- Использовать `beforeSend` для фильтрации данных
- Настраивать Data Scrubbing в Sentry

### 4. Производительность

- Использовать sampling для снижения нагрузки
- Настраивать rate limiting
- Мониторить влияние Sentry на производительность

## Интеграция с GA4

Sentry и GA4 дополняют друг друга:

- **Sentry**: детальное отслеживание ошибок, stack traces, контекст
- **GA4**: общая статистика ошибок, метрики вовлеченности

Не нужно дублировать отслеживание ошибок в GA4, если используется Sentry.

## Полезные ссылки

- [Sentry Documentation](https://docs.sentry.io/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [NestJS Integration](https://docs.sentry.io/platforms/javascript/guides/node/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)

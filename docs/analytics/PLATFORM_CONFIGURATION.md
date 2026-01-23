# Конфигурация аналитики и мониторинга для разных платформ

## Дата создания
23 января 2026

## Обзор

Документ описывает, как настроить Google Analytics и Sentry для разных платформ (Македония, Албания и т.д.) без хардкода в core.

## Принципы конфигурации

### ✅ Все через переменные окружения

Все настройки аналитики и мониторинга конфигурируются **только через переменные окружения**. В core нет хардкода platform-specific значений.

### ✅ Отдельные проекты для каждой платформы

Каждая платформа должна иметь:
- Отдельный Google Analytics проект (свой Measurement ID)
- Отдельный Sentry проект для Frontend (свой DSN)
- Отдельный Sentry проект для Backend (свой DSN)

Это обеспечивает:
- Изоляцию данных и статистики
- Независимый мониторинг ошибок
- Возможность настройки разных уведомлений

## Google Analytics

### Конфигурация

**Переменная окружения:**
```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Где используется:**
- `core/frontend/components/GoogleAnalytics.tsx` - читает `process.env.NEXT_PUBLIC_GA_ID`
- Нет хардкода - если переменная не задана, компонент не рендерится

**Проверка:**
```typescript
// ✅ Правильно - использует env переменную
const gaId = process.env.NEXT_PUBLIC_GA_ID;

// ❌ Неправильно - хардкод (такого нет в коде)
const gaId = 'G-KUPITO123';
```

### Настройка для новой платформы

1. Создать отдельный Google аккаунт для платформы
2. Создать новое свойство (Property) в Google Analytics
3. Получить Measurement ID (формат: `G-XXXXXXXXXX`)
4. Добавить в переменные окружения: `NEXT_PUBLIC_GA_ID=<Measurement ID>`

**Результат:** Каждая платформа будет отправлять события в свой GA4 проект.

## Sentry

### Конфигурация Frontend

**Переменные окружения:**
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-frontend-project
SENTRY_AUTH_TOKEN=your-auth-token
```

**Где используется:**
- `core/frontend/sentry.client.config.ts` - читает `process.env.NEXT_PUBLIC_SENTRY_DSN`
- `core/frontend/sentry.server.config.ts` - читает `process.env.NEXT_PUBLIC_SENTRY_DSN`
- `core/frontend/sentry.edge.config.ts` - читает `process.env.NEXT_PUBLIC_SENTRY_DSN`
- `next.config.js` - использует `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` для source maps

**Проверка:**
```typescript
// ✅ Правильно - использует env переменную
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // ...
});

// ❌ Неправильно - хардкод (такого нет в коде)
Sentry.init({
  dsn: 'https://kupito@sentry.io/123',
  // ...
});
```

### Конфигурация Backend

**Переменные окружения:**
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

**Где используется:**
- `core/backend/src/common/sentry.config.ts` - читает `process.env.SENTRY_DSN`
- `core/backend/src/common/filters/http-exception.filter.ts` - использует Sentry для логирования ошибок

**Проверка:**
```typescript
// ✅ Правильно - использует env переменную
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
  // ...
});

// ❌ Неправильно - хардкод (такого нет в коде)
Sentry.init({
  dsn: 'https://kupito-backend@sentry.io/123',
  // ...
});
```

### Настройка для новой платформы

1. Создать аккаунт/организацию в Sentry (или использовать существующую)
2. Создать Frontend проект (Platform: Next.js)
3. Создать Backend проект (Platform: Node.js)
4. Получить DSN для каждого проекта
5. Добавить в переменные окружения:
   - Frontend: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
   - Backend: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`

**Результат:** Каждая платформа будет отправлять ошибки в свой Sentry проект.

## Пример конфигурации для разных платформ

### Македония (kupito.club)

**Frontend (.env.local):**
```env
NEXT_PUBLIC_GA_ID=G-MK12345678
NEXT_PUBLIC_SENTRY_DSN=https://mk-frontend@sentry.io/123456
SENTRY_ORG=kupito
SENTRY_PROJECT=kupito-frontend
```

**Backend (.env):**
```env
SENTRY_DSN=https://mk-backend@sentry.io/789012
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

### Албания (autoshqip.al)

**Frontend (.env.local):**
```env
NEXT_PUBLIC_GA_ID=G-AL87654321
NEXT_PUBLIC_SENTRY_DSN=https://al-frontend@sentry.io/345678
SENTRY_ORG=autoshqip
SENTRY_PROJECT=autoshqip-frontend
```

**Backend (.env):**
```env
SENTRY_DSN=https://al-backend@sentry.io/901234
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

## Проверка отсутствия хардкода

### Google Analytics

**Файл:** `core/frontend/components/GoogleAnalytics.tsx`

```typescript
// ✅ Правильно - только env переменная
const gaId = process.env.NEXT_PUBLIC_GA_ID;

// Проверка: нет захардкоженных значений
// grep -r "G-[A-Z0-9]" core/frontend/components/GoogleAnalytics.tsx
// Результат: только process.env.NEXT_PUBLIC_GA_ID
```

### Sentry

**Файлы:**
- `core/frontend/sentry.*.config.ts`
- `core/backend/src/common/sentry.config.ts`

```typescript
// ✅ Правильно - только env переменные
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // или process.env.SENTRY_DSN для backend
  // ...
});

// Проверка: нет захардкоженных DSN
// grep -r "https://.*@.*sentry.io" core/
// Результат: только в документации, не в коде
```

## Чеклист для новой платформы

### Google Analytics
- [ ] Создан отдельный Google аккаунт
- [ ] Создано новое свойство в GA4
- [ ] Получен Measurement ID
- [ ] Добавлена переменная `NEXT_PUBLIC_GA_ID` в env
- [ ] Проверено, что события отправляются в правильный проект

### Sentry
- [ ] Создана организация в Sentry (или выбрана существующая)
- [ ] Создан Frontend проект (Next.js)
- [ ] Создан Backend проект (Node.js)
- [ ] Получены DSN для обоих проектов
- [ ] Добавлены переменные окружения:
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` (Frontend)
  - [ ] `SENTRY_DSN` (Backend)
  - [ ] `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (для source maps)
- [ ] Настроены уведомления в Sentry (опционально)
- [ ] Проверено, что ошибки отправляются в правильный проект

## Важные замечания

1. **Не использовать один проект для нескольких платформ:**
   - ❌ Плохо: Македония и Албания используют один GA4 проект
   - ✅ Хорошо: Каждая платформа имеет свой GA4 проект

2. **Переменные окружения обязательны:**
   - Если `NEXT_PUBLIC_GA_ID` не задана, Google Analytics не будет работать
   - Если `NEXT_PUBLIC_SENTRY_DSN` не задана, Sentry не будет работать
   - Это нормально - каждая платформа должна настроить свои переменные

3. **Нет fallback значений:**
   - Core не содержит дефолтных значений для аналитики
   - Это гарантирует, что каждая платформа явно настроит свои сервисы

4. **Проверка в CI/CD:**
   - В CI/CD можно проверить наличие обязательных переменных
   - Если переменные отсутствуют, билд может падать с понятной ошибкой

## Связанные документы

- **[GA4_EVENTS_ANALYSIS.md](./GA4_EVENTS_ANALYSIS.md)** - Анализ событий Google Analytics 4
- **[SENTRY_SETUP.md](./SENTRY_SETUP.md)** - Детальная инструкция по настройке Sentry
- **[PLAN_ALBANIA_PLATFORM.md](../platform-plans/PLAN_ALBANIA_PLATFORM.md)** - План развертывания платформы Албании

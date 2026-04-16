---
title: QA automation onboarding (RU)
owner: platform
tags:
  - type/guide
  - domain/testing
  - scope/core
  - status/active
---

# Онбординг QA-автоматизатора (RU)

Этот документ — стартовая точка для нового QA Automation Engineer в `kupito.club` и `PPCSL core`.

## 1) Что это за проект

1. Прочитайте [architecture-overview.md](../architecture/architecture-overview.md) — общая картина системы.
2. Прочитайте [multi-repository.md](../architecture/multi-repository.md) — как устроены `platform repo` и `core`.
3. Прочитайте [README платформы](../../../README.md) — что живет в `kupito.club`, что копируется в `core`.

## 2) Порядок изучения документации

Идите строго в этой последовательности:

1. [quick-start-ru.md](./quick-start-ru.md)
2. [local-development.md](./local-development.md)
3. [SCRIPTS.md](../../backend/docs/SCRIPTS.md)
4. [e2e-playwright-standards.md](./e2e-playwright-standards.md)
5. [e2e-test-architecture.md](../architecture/e2e-test-architecture.md)
6. [frontend e2e entrypoint](../../frontend/docs/e2e-playwright.md)
7. [backend integration tests](../../backend/docs/TESTING.md)
8. [linting.md](../engineering/linting.md)

## 3) Настройка локального окружения

Минимальные требования:

- Node.js 20+
- Docker Desktop
- Git

### 3.1 Клонирование и установка

```bash
git clone --recurse-submodules <repo-url>
cd kupito.club
npm install
cd core
npm run install:all
cd ..
```

### 3.2 Поднятие инфраструктуры

```bash
cd core
docker-compose up -d
cd ..
```

### 3.3 Переменные окружения

Создайте файлы из шаблонов:

- `core/backend/.env` на базе `core/backend/.env.example`
- `core/frontend/.env.local` на базе `core/frontend/.env.example`

### 3.4 Подготовка платформенных файлов

```bash
npm run prepare:build
```

### 3.5 Миграции и сидирование

```bash
cd core/backend
npm run build
npm run migration:run
cd ../..
npm run reset-and-seed
```

### 3.6 Запуск проекта

```bash
npm run dev
```

Доступ:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Swagger: `http://localhost:4000/api`

## 4) Тестовые данные для автотестов

Базовые тестовые данные создаются командой:

```bash
npm run reset-and-seed
```

Для E2E по умолчанию используются:

- `E2E_USER_LOGIN=admin@admin.com`
- `E2E_USER_PASSWORD=GGGgggTEST777`

Детали по скриптам и ограничениям смотрите в [SCRIPTS.md](../../backend/docs/SCRIPTS.md).

## 5) E2E (Playwright + Allure)

### 5.1 Установка браузера Playwright

```bash
cd core/frontend
npx playwright install chromium
```

### 5.2 Основные команды запуска

```bash
cd core/frontend
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

Allure:

```bash
cd core/frontend
npm run test:e2e:allure
npm run test:e2e:allure:open
```

### 5.3 Что обязательно соблюдать в E2E

- Архитектуру слоев из [e2e-test-architecture.md](../architecture/e2e-test-architecture.md)
- Стандарты тестов из [e2e-playwright-standards.md](./e2e-playwright-standards.md)
- Использование page objects, fixtures и `data-testid`-локаторов
- `test.step(...)` для ключевых действий и проверок
- P0 smoke как минимальный набор для релизной готовности

## 6) Unit и integration проверки

Frontend:

```bash
cd core/frontend
npm test
```

Backend:

```bash
cd core/backend
npm run test
npm run test:integration
```

Детали по backend integration — в [TESTING.md](../../backend/docs/TESTING.md).

## 7) Обязательная проверка перед PR

В корне `kupito.club`:

```bash
npm run release-check
```

Если нужно локально исправлять пакетами:

- правила и команды смотрите в [linting.md](../engineering/linting.md)

## 8) Быстрый чеклист первого рабочего дня

1. Поднять Docker и приложение локально.
2. Выполнить `npm run reset-and-seed`.
3. Запустить минимум один E2E тест.
4. Сгенерировать и открыть Allure отчет.
5. Запустить unit + integration тесты.
6. Прогнать `npm run release-check`.

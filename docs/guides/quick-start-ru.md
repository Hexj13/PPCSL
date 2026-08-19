---
title: Quick start (RU)
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Быстрый старт для локальной разработки

Инструкция подходит для запуска в любой стране: укажите код платформы в переменных `NEXT_PUBLIC_COUNTRY` и (для скриптов) `COUNTRY` (например, `md` для Молдовы).

## Вариант 1: Работа в PPCSL (core)

Если вы работаете в папке PPCSL:

### 1. Установка зависимостей

```bash
cd ~/PPCSL
npm run install:all
```

### 2. Запуск Docker контейнеров (PostgreSQL + Redis)

```bash
docker-compose up -d
```

**Проверка, что контейнеры запущены:**

```bash
docker ps
```

Должны быть видны контейнеры `kupito-postgres` и `kupito-redis`.

### 3. Настройка переменных окружения

**Создайте файл `backend/.env`:**

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ppcsl
DB_PASSWORD=ppcsl123
DB_NAME=ppcsl
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Twilio SMS Configuration (опционально для локальной разработки)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Infocar (опционально; для подписанной ссылки на отчёт)
# INFOCAR_SECRET_KEY=<секрет-от-infocar>
```

**Создайте файл `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_COUNTRY=<country>
```

Замените `<country>` на код страны платформы (например, `md` для Молдовы).

### 4. Запуск миграций базы данных

```bash
cd backend
npm run build
npm run migration:run
cd ..
```

### 5. Запуск проекта

**Вариант A: Запуск обоих серверов вместе (рекомендуется):**

```bash
npm run dev
```

**Вариант B: Запуск серверов отдельно:**

Терминал 1 (Backend):

```bash
cd backend
npm run start:dev
```

Терминал 2 (Frontend):

```bash
cd frontend
npm run dev
```

### Доступ к приложению

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **Swagger API Docs:** http://localhost:4000/api

---

## Вариант 2: Работа в kupito.club (с submodule)

Если вы работаете в папке kupito.club, где PPCSL подключен как submodule:

### 1. Инициализация submodule

```bash
cd /path/to/kupito.club
git submodule update --init --recursive
```

### 2. Подготовка файлов платформы для core

```bash
# Копирует locales, theme, config и assets в core
npm run prepare:build
```

### 3. Установка зависимостей

```bash
# Установка зависимостей корневого проекта
npm install

# Установка зависимостей core
cd core
npm run install:all
cd ..
```

### 4. Запуск Docker контейнеров

```bash
cd core
docker-compose up -d
cd ..
```

### 5. Настройка переменных окружения

**Создайте файл `core/backend/.env`:**

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ppcsl
DB_PASSWORD=ppcsl123
DB_NAME=ppcsl
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-twilio-messaging-service-sid

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Infocar (опционально; для подписанной ссылки на отчёт)
# INFOCAR_SECRET_KEY=<секрет-от-infocar>
```

**Создайте файл `core/frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_COUNTRY=<country>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Замените `<country>` на код страны платформы (например, `md` для Молдовы).

### 6. Запуск миграций базы данных

```bash
cd core/backend
npm run build
npm run migration:run
cd ../..
```

### 7. Запуск проекта

**Вариант A: Запуск обоих серверов вместе:**

```bash
cd core
npm run dev
```

**Вариант B: Запуск серверов отдельно:**

Терминал 1 (Backend):

```bash
cd core/backend
npm run start:dev
```

Терминал 2 (Frontend):

```bash
cd core/frontend
npm run dev
```

### Доступ к приложению

- **Frontend:** http://localhost:3000 (с переводами и темой платформы)
- **Backend:** http://localhost:4000

---

## Решение проблем

### Порт уже занят

Если порты 3000 или 4000 заняты:

```bash
# Использовать скрипт (если есть)
npm run kill-ports

# Или вручную:
lsof -ti:3000 | xargs kill -9
lsof -ti:4000 | xargs kill -9
```

### Docker не запускается

**Проверьте, запущен ли Docker Desktop:**

```bash
docker ps
```

Если ошибка "Cannot connect to the Docker daemon":

1. Откройте Docker Desktop
2. Дождитесь полного запуска
3. Попробуйте снова: `docker-compose up -d`

### База данных не подключается

**Проверьте, что контейнер PostgreSQL запущен:**

```bash
docker ps | grep postgres
```

**Проверьте логи:**

```bash
docker logs kupito-postgres
```

**Проверьте переменные окружения в `backend/.env`** - они должны совпадать с настройками в `docker-compose.yml`.

### Файлы локализации не загружаются (для kupito.club)

Убедитесь, что файлы переводов существуют в корневой директории:

```bash
ls locales/ro.json
ls locales/ru.json
ls locales/en.json
```

Файлы переводов загружаются напрямую из корневой директории.

Убедитесь, что файлы темы и конфигурации скопированы:

```bash
ls core/frontend/lib/theme/
ls core/frontend/lib/config/
```

Если файлов нет, выполните подготовку файлов заново:

```bash
npm run prepare:build
```

После копирования перезапустите dev сервер.

---

## Полезные команды

### Остановка Docker контейнеров

```bash
docker-compose down
```

### Просмотр логов Docker

```bash
docker-compose logs -f
```

### Пересборка проекта

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Очистка кэша Next.js

```bash
cd frontend
rm -rf .next
npm run dev
```

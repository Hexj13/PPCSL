# Инструкция по перезапуску проекта

## Полный перезапуск

### 1. Остановить все процессы (если запущены)

Если процессы запущены в терминале, нажмите `Ctrl+C` в каждом окне.

Или найдите и остановите процессы:
```bash
# Найти процессы на портах
lsof -ti:3000 | xargs kill -9 2>/dev/null  # Frontend
lsof -ti:4000 | xargs kill -9 2>/dev/null  # Backend
```

### 2. Установить/обновить зависимости (если нужно)

```bash
# В корне проекта
npm run install:all
```

Или отдельно:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Убедиться, что база данных запущена

```bash
docker-compose up -d
```

### 4. Создать папку для загрузок (если не создана)

```bash
mkdir -p backend/uploads
```

### 5. Запустить проект

**Вариант 1: Запустить оба сервера одновременно**
```bash
# В корне проекта
npm run dev
```

**Вариант 2: Запустить отдельно**

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

### 6. Проверить работу

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Проверка API: http://localhost:4000 (должен показать "Kupito API v1.0")

## Быстрый перезапуск (если уже запущено)

Если нужно просто перезапустить после изменений:

1. В терминале где запущен backend: `Ctrl+C`, затем `npm run start:dev`
2. В терминале где запущен frontend: `Ctrl+C`, затем `npm run dev`

Или просто используйте `npm run dev` в корне - он запустит оба сервера.


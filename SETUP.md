# Инструкция по запуску проекта

## Проблема: Docker daemon не запущен

Если вы видите ошибку `Cannot connect to the Docker daemon`, выполните следующие шаги:

### Вариант 1: Запустить Docker Desktop

1. Откройте приложение Docker Desktop на вашем Mac
2. Дождитесь полного запуска (иконка в строке меню станет зеленой)
3. Затем выполните:
```bash
docker-compose up -d
```

### Вариант 2: Установить PostgreSQL и Redis локально

Если Docker недоступен, можно установить базы данных локально:

#### Установка PostgreSQL (macOS)

```bash
# Через Homebrew
brew install postgresql@15
brew services start postgresql@15

# Создать базу данных и пользователя
createdb kupito
psql postgres
```

В psql выполните:
```sql
CREATE USER kupito WITH PASSWORD 'kupito123';
ALTER DATABASE kupito OWNER TO kupito;
GRANT ALL PRIVILEGES ON DATABASE kupito TO kupito;
\q
```

#### Установка Redis (macOS)

```bash
# Через Homebrew
brew install redis
brew services start redis
```

После этого используйте существующие настройки в `backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito
```

### Вариант 3: Использовать только PostgreSQL (без Redis)

Redis в текущей версии не критичен для работы приложения. Можно запустить проект без него, но некоторые функции могут не работать оптимально.

## После запуска базы данных

1. Перейдите в папку backend:
```bash
cd backend
```

2. Установите зависимости (если еще не установлены):
```bash
npm install
```

3. Запустите backend:
```bash
npm run start:dev
```

TypeORM автоматически создаст таблицы при первом запуске (в режиме разработки `synchronize: true`).

4. В новом терминале запустите frontend:
```bash
cd frontend
npm install
npm run dev
```

## Проверка работы

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Проверка API: http://localhost:4000 (должен вернуть "Kupito API v1.0")


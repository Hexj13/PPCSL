# Kupito - Автомобильная площадка для Северной Македонии

Площадка для продажи новых и подержанных автомобилей в Северной Македонии.

## Технологии

- **Frontend:** Next.js 14, React, TailwindCSS, Zustand
- **Backend:** NestJS, PostgreSQL, TypeORM, Redis
- **Хранилище:** S3-совместимое хранилище (для будущей реализации)

## Установка

### Требования

- Node.js 18+
- Docker и Docker Compose
- npm или yarn

### Шаги установки

1. Клонируйте репозиторий и установите зависимости:
```bash
npm run install:all
```

2. Настройте переменные окружения:

Создайте файл `backend/.env` (см. `ENV_EXAMPLE.md`):
```
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=kupito123
DB_NAME=kupito
JWT_SECRET=your-secret-key-change-in-production
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Создайте файл `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

3. Запустите базу данных и Redis:
```bash
docker-compose up -d
```

4. Дождитесь запуска базы данных (около 10 секунд), затем создайте таблицы:
```bash
cd backend
npm run build
npm run migration:run
```

Или если используете синхронизацию TypeORM (в режиме разработки):
```bash
cd backend
npm run start:dev
```

5. Запустите проект в режиме разработки:
```bash
npm run dev
```

Frontend будет доступен на http://localhost:3000  
Backend API будет доступен на http://localhost:4000

## Основные функции

- ✅ Регистрация и аутентификация пользователей (ФЛ и ЮЛ)
- ✅ Создание, редактирование, публикация объявлений
- ✅ Поиск и фильтрация объявлений
- ✅ Лимиты объявлений (5 для ФЛ, 50 для ЮЛ)
- ✅ Статусы объявлений (Active, Paused, Closed)
- ✅ Автоматическое закрытие объявлений через 90 дней
- ✅ Избранное (для авторизованных и гостей)
- ✅ Админ-панель для управления

## Структура проекта

```
Kupito/
├── frontend/          # Next.js приложение
│   ├── app/          # Страницы и маршруты
│   ├── components/   # React компоненты
│   └── lib/          # Утилиты и API клиенты
├── backend/          # NestJS API
│   ├── src/
│   │   ├── auth/     # Аутентификация
│   │   ├── users/    # Пользователи
│   │   ├── listings/ # Объявления
│   │   ├── favorites/# Избранное
│   │   └── admin/    # Админ-панель
├── documentation.md  # Техническое задание
└── docker-compose.yml # Конфигурация БД
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь

### Объявления
- `GET /api/listings` - Список объявлений (с фильтрами)
- `GET /api/listings/:id` - Детали объявления
- `POST /api/listings` - Создать объявление
- `PATCH /api/listings/:id` - Обновить объявление
- `POST /api/listings/:id/publish` - Опубликовать
- `POST /api/listings/:id/pause` - Приостановить
- `POST /api/listings/:id/close` - Закрыть
- `GET /api/listings/my` - Мои объявления

### Избранное
- `GET /api/favorites` - Список избранного
- `POST /api/favorites/:id` - Добавить в избранное
- `DELETE /api/favorites/:id` - Удалить из избранного

## Особенности реализации

- Автоматическое закрытие объявлений через 90 дней (cron задача запускается ежедневно в полночь)
- Проверка лимитов активных объявлений при публикации
- Избранное хранится в localStorage для гостей и на сервере для авторизованных пользователей
- PostgreSQL Full-Text Search для поиска
- Адаптивный дизайн с TailwindCSS

## Лицензия

MIT


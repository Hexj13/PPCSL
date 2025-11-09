# Быстрый старт: Деплой на kupito.mk

Краткая инструкция для быстрого деплоя на хостинг mkhost.com.

## 🚀 Быстрые шаги

### 1. Доступ к серверу

- **cPanel:** https://luna.mk-host.mk/cpanel или https://kupito.mk/cpanel
- **SSH:** `ssh kupitomk@luna.mk-host.mk` (если доступен)

### 2. База данных

1. cPanel → **MySQL Databases** (или PostgreSQL)
2. Создайте базу: `kupito`
3. Создайте пользователя с паролем
4. **Запишите полные имена** (с префиксом `kupitomk_`)

### 3. Загрузка проекта

```bash
cd ~/public_html
git clone https://github.com/ваш-username/kupito.git
cd kupito
```

Или через File Manager в cPanel загрузите ZIP и распакуйте.

### 4. Настройка .env файлов

**backend/.env:**
```env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_USERNAME=kupitomk_user
DB_PASSWORD=ваш_пароль
DB_NAME=kupitomk_kupito
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FRONTEND_URL=https://kupito.mk
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_URL=https://kupito.mk/api
NEXT_PUBLIC_SITE_URL=https://kupito.mk
```

### 5. Сборка и запуск

```bash
# Backend
cd backend
npm install --production
npm run build
npm run migration:run

# Frontend
cd ../frontend
npm install --production
npm run build
```

### 6. Настройка в cPanel

1. **Node.js** → **Create Application**
2. Backend:
   - Root: `~/public_html/kupito/backend`
   - URL: `/api`
   - Startup: `dist/main.js`
3. Frontend:
   - Root: `~/public_html/kupito/frontend`
   - URL: `/`
   - Startup: `node_modules/next/dist/bin/next`
   - Args: `start`

### 7. SSL сертификат

cPanel → **SSL/TLS Status** → **Run AutoSSL**

### 8. Проверка

- Frontend: https://kupito.mk
- Backend: https://kupito.mk/api
- Health: https://kupito.mk/api/health

---

## 📚 Подробная инструкция

См. [CPANEL_DEPLOYMENT.md](./CPANEL_DEPLOYMENT.md) для детальной инструкции.

## ⚠️ Важно

- Используйте PostgreSQL, если доступен (не MySQL)
- Генерируйте надежные пароли
- Не коммитьте `.env` файлы в Git
- Делайте бэкапы базы данных регулярно


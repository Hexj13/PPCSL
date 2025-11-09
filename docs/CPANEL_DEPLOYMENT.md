# Инструкция по развертыванию Kupito на хостинге с cPanel (mkhost.com)

Эта инструкция поможет вам развернуть сайт Kupito на хостинге mkhost.com с панелью управления cPanel.

## 📋 Содержание

1. [Подготовка и доступ к серверу](#1-подготовка-и-доступ-к-серверу)
2. [Настройка базы данных](#2-настройка-базы-данных)
3. [Загрузка проекта на сервер](#3-загрузка-проекта-на-сервер)
4. [Настройка переменных окружения](#4-настройка-переменных-окружения)
5. [Сборка проекта](#5-сборка-проекта)
6. [Настройка Node.js приложения](#6-настройка-nodejs-приложения)
7. [Настройка домена и SSL](#7-настройка-домена-и-ssl)
8. [Проверка работы](#8-проверка-работы)
9. [Решение проблем](#9-решение-проблем)

---

## 1. Подготовка и доступ к серверу

### 1.1 Доступ к cPanel

1. Откройте панель управления: **https://luna.mk-host.mk/cpanel**
2. Войдите используя данные, которые пришли вам на email
3. Или используйте прямой доступ: **https://kupito.mk/cpanel**

### 1.2 Доступ через SSH (если доступен)

Если у вас есть SSH доступ, подключитесь:

```bash
ssh kupitomk@luna.mk-host.mk
# или
ssh kupitomk@kupito.mk
```

**Где найти данные для SSH:**
- В письме от хостинга
- В cPanel → "Terminal" или "SSH Access"
- Обычно username: `kupitomk` или похожий

### 1.3 Проверка версии Node.js

В cPanel найдите раздел "Node.js" или "Setup Node.js App". Проверьте доступную версию Node.js (нужна версия 20+).

Если Node.js недоступен в cPanel, обратитесь в поддержку хостинга для установки.

---

## 2. Настройка базы данных

### 2.1 Создание базы данных через cPanel

1. В cPanel найдите раздел **"MySQL Databases"** или **"Базы данных MySQL"**
2. Создайте новую базу данных:
   - Имя базы: `kupitomk_kupito` (или `kupitomk_db` - префикс обычно добавляется автоматически)
   - Запишите полное имя базы данных
3. Создайте пользователя базы данных:
   - Имя пользователя: `kupitomk_user` (префикс добавляется автоматически)
   - Пароль: **сгенерируйте надежный пароль** (запишите его!)
4. Добавьте пользователя к базе данных с правами **ALL PRIVILEGES**

**Важно:** Запишите:
- Полное имя базы данных (например: `kupitomk_kupito`)
- Полное имя пользователя (например: `kupitomk_user`)
- Пароль пользователя

### 2.2 Альтернатива: PostgreSQL

Если ваш хостинг поддерживает PostgreSQL (что предпочтительнее для этого проекта):

1. В cPanel найдите **"PostgreSQL Databases"** или **"Базы данных PostgreSQL"**
2. Создайте базу данных и пользователя аналогично MySQL
3. Запишите все данные

**Примечание:** Если доступен только MySQL, потребуется адаптация проекта (но лучше использовать PostgreSQL).

---

## 3. Загрузка проекта на сервер

### Вариант A: Загрузка через File Manager (cPanel)

1. В cPanel откройте **"File Manager"**
2. Перейдите в директорию `public_html` (или `domains/kupito.mk/public_html`)
3. Загрузите файлы проекта:
   - Можно загрузить ZIP архив и распаковать его
   - Или использовать Git (если доступен)

### Вариант B: Загрузка через Git (рекомендуется)

Если у вас есть SSH доступ:

```bash
cd ~/public_html
# или
cd ~/domains/kupito.mk/public_html

# Клонируйте репозиторий
git clone https://github.com/ваш-username/kupito.git
# или
git clone git@github.com:ваш-username/kupito.git

cd kupito
```

### Вариант C: Загрузка через SFTP

Используйте FTP клиент (FileZilla, WinSCP) с данными:
- Хост: `luna.mk-host.mk` или `kupito.mk`
- Порт: `21` (FTP) или `22` (SFTP)
- Username: ваш cPanel username
- Пароль: ваш cPanel пароль

Загрузите файлы в `public_html/kupito/`

---

## 4. Настройка переменных окружения

### 4.1 Создание .env для backend

Через File Manager или SSH создайте файл `backend/.env`:

```bash
cd ~/public_html/kupito/backend
nano .env
```

Вставьте следующее (замените значения на свои):

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupitomk_user
DB_PASSWORD=ваш_пароль_из_шага_2.1
DB_NAME=kupitomk_kupito

# Database Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# Authentication (ОБЯЗАТЕЛЬНО! Сгенерируйте надежный ключ)
JWT_SECRET=ваш_очень_длинный_и_случайный_секретный_ключ_минимум_32_символа

# CORS Configuration
FRONTEND_URL=https://kupito.mk

# Redis Configuration (если доступен)
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ваш-twilio-account-sid
TWILIO_AUTH_TOKEN=ваш-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=ваш-twilio-messaging-service-sid

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш-email@gmail.com
SMTP_PASSWORD=ваш-пароль-приложения
SMTP_FROM=noreply@kupito.mk
```

**Как сгенерировать JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4.2 Создание .env.local для frontend

Создайте файл `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://kupito.mk/api
NEXT_PUBLIC_SITE_URL=https://kupito.mk
```

**Примечание:** Если API будет на поддомене `api.kupito.mk`, используйте:
```env
NEXT_PUBLIC_API_URL=https://api.kupito.mk
```

### 4.3 Защита .env файлов

Установите права доступа:

```bash
chmod 600 backend/.env
chmod 600 frontend/.env.local
```

---

## 5. Сборка проекта

### 5.1 Установка зависимостей

Через SSH или Terminal в cPanel:

```bash
cd ~/public_html/kupito/backend
npm install --production

cd ../frontend
npm install --production
```

### 5.2 Сборка backend

```bash
cd ~/public_html/kupito/backend
npm run build
```

### 5.3 Запуск миграций базы данных

```bash
cd ~/public_html/kupito/backend
npm run migration:run
```

### 5.4 Сборка frontend

```bash
cd ~/public_html/kupito/frontend
npm run build
```

### 5.5 Создание директории для загрузок

```bash
mkdir -p ~/public_html/kupito/backend/uploads
chmod 755 ~/public_html/kupito/backend/uploads
```

---

## 6. Настройка Node.js приложения

### 6.1 Настройка через cPanel Node.js Selector

1. В cPanel найдите раздел **"Node.js"** или **"Setup Node.js App"**
2. Нажмите **"Create Application"**
3. Заполните форму:
   - **Node.js version:** Выберите версию 20.x или выше
   - **Application mode:** Production
   - **Application root:** `/home/kupitomk/public_html/kupito/backend`
   - **Application URL:** `/api` (или создайте поддомен `api.kupito.mk`)
   - **Application startup file:** `dist/main.js`
   - **Passenger log file:** Оставьте по умолчанию
4. Нажмите **"Create"**

### 6.2 Настройка переменных окружения в cPanel

В настройках Node.js приложения добавьте переменные окружения:
- `NODE_ENV=production`
- И другие переменные из `backend/.env` (или загрузите .env файл)

### 6.3 Настройка frontend (Next.js)

Для Next.js приложения создайте отдельное Node.js приложение:

1. Создайте новое Node.js приложение в cPanel
2. Настройки:
   - **Application root:** `/home/kupitomk/public_html/kupito/frontend`
   - **Application URL:** `/` (корневой домен)
   - **Application startup file:** `node_modules/next/dist/bin/next`
   - **Application arguments:** `start`

### 6.4 Альтернатива: Использование PM2 (если доступен SSH)

Если у вас есть полный SSH доступ, можно использовать PM2:

```bash
# Установка PM2
npm install -g pm2

# Запуск backend
cd ~/public_html/kupito/backend
pm2 start dist/main.js --name kupito-backend

# Запуск frontend
cd ~/public_html/kupito/frontend
pm2 start npm --name kupito-frontend -- start

# Сохранение конфигурации
pm2 save
pm2 startup
```

---

## 7. Настройка домена и SSL

### 7.1 Проверка DNS записей

Убедитесь, что DNS записи настроены правильно:
- A запись для `kupito.mk` → IP адрес сервера
- A запись для `www.kupito.mk` → IP адрес сервера (опционально)
- A запись для `api.kupito.mk` → IP адрес сервера (если используете поддомен)

### 7.2 Установка SSL сертификата

В cPanel:

1. Найдите раздел **"SSL/TLS Status"** или **"SSL/TLS"**
2. Нажмите **"Run AutoSSL"** для автоматической установки Let's Encrypt сертификата
3. Или используйте **"Let's Encrypt"** для ручной установки

### 7.3 Настройка редиректа HTTP → HTTPS

В cPanel → **"Redirects"**:
- Создайте редирект с `http://kupito.mk` на `https://kupito.mk`
- Тип: Permanent (301)

---

## 8. Проверка работы

### 8.1 Проверка backend

Откройте в браузере:
- `https://kupito.mk/api` (должно показать "Kupito API v1.0")
- `https://kupito.mk/api/health` (health check)

Или через терминал:

```bash
curl https://kupito.mk/api
curl https://kupito.mk/api/health
```

### 8.2 Проверка frontend

Откройте в браузере:
- `https://kupito.mk`

Сайт должен открыться и работать.

### 8.3 Проверка логов

В cPanel → **"Node.js"** → выберите приложение → **"View Logs"**

Или через SSH:

```bash
# Логи backend
tail -f ~/public_html/kupito/backend/logs/*.log

# Логи frontend
tail -f ~/public_html/kupito/frontend/.next/trace
```

---

## 9. Решение проблем

### Проблема: Node.js приложение не запускается

1. Проверьте логи в cPanel → Node.js → View Logs
2. Убедитесь, что версия Node.js 20+
3. Проверьте, что файл `dist/main.js` существует
4. Проверьте переменные окружения

### Проблема: База данных не подключается

1. Проверьте правильность имени базы данных и пользователя (с префиксом!)
2. Проверьте пароль
3. Убедитесь, что пользователь имеет права на базу данных
4. Проверьте, что база данных создана в cPanel

### Проблема: 502 Bad Gateway

1. Проверьте, что Node.js приложение запущено в cPanel
2. Проверьте логи приложения
3. Убедитесь, что порт указан правильно
4. Проверьте, что файлы собраны (`npm run build`)

### Проблема: SSL сертификат не работает

1. Убедитесь, что DNS записи настроены правильно
2. Подождите 5-30 минут после настройки DNS
3. Запустите AutoSSL вручную в cPanel
4. Проверьте, что домен указывает на правильный IP

### Проблема: Next.js не работает

1. Убедитесь, что проект собран (`npm run build`)
2. Проверьте, что `NEXT_PUBLIC_API_URL` настроен правильно
3. Проверьте логи в cPanel
4. Убедитесь, что используется правильная версия Node.js

---

## 📝 Чеклист перед запуском

- [ ] Доступ к cPanel получен
- [ ] База данных создана и пользователь настроен
- [ ] Проект загружен на сервер
- [ ] Файл `backend/.env` создан и заполнен
- [ ] Файл `frontend/.env.local` создан и заполнен
- [ ] `JWT_SECRET` сгенерирован и установлен
- [ ] Пароль базы данных установлен
- [ ] Зависимости установлены (`npm install`)
- [ ] Backend собран (`npm run build`)
- [ ] Frontend собран (`npm run build`)
- [ ] Миграции выполнены (`npm run migration:run`)
- [ ] Директория `uploads` создана
- [ ] Node.js приложения настроены в cPanel
- [ ] SSL сертификат установлен
- [ ] DNS записи настроены
- [ ] Сайт открывается в браузере
- [ ] Health check endpoint работает (`/api/health`)

---

## 🎉 Готово!

Ваш сайт должен быть доступен по адресу `https://kupito.mk`!

Если что-то не работает, проверьте логи и следуйте разделу "Решение проблем" выше.

**Важные напоминания:**
- Регулярно делайте резервные копии базы данных (через cPanel → Backup)
- Следите за обновлениями безопасности
- Проверяйте логи на наличие ошибок
- Обновляйте зависимости периодически

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи в cPanel
2. Обратитесь в поддержку mkhost.com
3. Проверьте документацию: [DEPLOYMENT.md](./DEPLOYMENT.md) для VPS деплоя


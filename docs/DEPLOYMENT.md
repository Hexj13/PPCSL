# Подробная инструкция по развертыванию Kupito на продакшн сервере

Эта инструкция поможет вам развернуть сайт Kupito на вашем сервере после покупки домена и сервера.

## 📋 Содержание

1. [Подготовка сервера](#1-подготовка-сервера)
2. [Установка необходимого ПО](#2-установка-необходимого-по)
3. [Настройка базы данных](#3-настройка-базы-данных)
4. [Клонирование и настройка проекта](#4-клонирование-и-настройка-проекта)
5. [Настройка переменных окружения](#5-настройка-переменных-окружения)
6. [Сборка и запуск приложения](#6-сборка-и-запуск-приложения)
7. [Настройка веб-сервера (Nginx)](#7-настройка-веб-сервера-nginx)
8. [Настройка домена и SSL](#8-настройка-домена-и-ssl)
9. [Настройка автозапуска (PM2)](#9-настройка-автозапуска-pm2)
10. [Проверка работы](#10-проверка-работы)
11. [Полезные команды](#11-полезные-команды)
12. [Настройка автоматических бэкапов базы данных](#12-настройка-автоматических-бэкапов-базы-данных)

---

## 1. Подготовка сервера

### 1.1 Подключение к серверу

Откройте терминал на вашем компьютере и подключитесь к серверу по SSH:

```bash
ssh root@ваш-ip-адрес-сервера
```

Или, если у вас есть пользователь:

```bash
ssh ваш-пользователь@ваш-ip-адрес-сервера
```

**Где найти IP-адрес?** Обычно он приходит на email после покупки сервера, или его можно посмотреть в панели управления хостингом.

### 1.2 Обновление системы

После подключения обновите систему (для Ubuntu/Debian):

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 2. Установка необходимого ПО

### 2.1 Установка Node.js

Нам нужен Node.js версии 20 или выше. Установим его:

```bash
# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Проверка установки
node --version  # Должно показать v20.x.x или выше
npm --version   # Должно показать версию npm
```

### 2.2 Установка PostgreSQL

```bash
# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверка
sudo systemctl status postgresql
```

### 2.3 Установка Redis (опционально, но рекомендуется)

```bash
# Установка Redis
sudo apt install -y redis-server

# Запуск Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Проверка
sudo systemctl status redis-server
```

### 2.4 Установка Nginx

```bash
# Установка Nginx
sudo apt install -y nginx

# Запуск Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверка
sudo systemctl status nginx
```

### 2.5 Установка PM2 (для управления процессами Node.js)

```bash
# Установка PM2 глобально
sudo npm install -g pm2

# Настройка автозапуска PM2
pm2 startup systemd
# Выполните команду, которую PM2 покажет (обычно что-то вроде: sudo env PATH=...)
```

### 2.6 Установка Git

```bash
sudo apt install -y git
```

---

## 3. Настройка базы данных

### 3.1 Создание пользователя и базы данных PostgreSQL

```bash
# Переключение на пользователя postgres
sudo -u postgres psql
```

В консоли PostgreSQL выполните следующие команды (замените `ваш_пароль` на надежный пароль):

```sql
-- Создание пользователя
CREATE USER kupito WITH PASSWORD 'ваш_надежный_пароль';

-- Создание базы данных
CREATE DATABASE kupito OWNER kupito;

-- Выдача прав
GRANT ALL PRIVILEGES ON DATABASE kupito TO kupito;

-- Выход
\q
```

**⚠️ ВАЖНО:** Запишите этот пароль! Он понадобится в файле `.env`.

### 3.2 Настройка Redis (если установлен)

Redis обычно работает из коробки, но можно проверить:

```bash
# Проверка работы Redis
redis-cli ping
# Должно вернуть: PONG
```

---

## 4. Клонирование и настройка проекта

### 4.1 Создание директории для проекта

```bash
# Создаем директорию для проектов (если её нет)
sudo mkdir -p /var/www
cd /var/www

# Или создайте в домашней директории
cd ~
mkdir -p projects
cd projects
```

### 4.2 Клонирование репозитория

Если ваш код в Git (GitHub, GitLab и т.д.):

```bash
# Клонируем репозиторий
git clone https://github.com/ваш-username/kupito.git
# Или используйте SSH: git clone git@github.com:ваш-username/kupito.git

cd kupito
```

Если код не в Git, загрузите его на сервер через SFTP или скопируйте файлы.

### 4.3 Установка зависимостей

```bash
# Установка зависимостей для backend
cd backend
npm install

# Установка зависимостей для frontend
cd ../frontend
npm install
```

---

## 5. Настройка переменных окружения

### 5.1 Создание файла .env для backend

```bash
cd /var/www/kupito/backend  # или путь к вашему проекту
nano .env
```

Вставьте следующее содержимое (замените значения на свои):

```env
# Server Configuration
PORT=4000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=ваш_надежный_пароль_из_шага_3.1
DB_NAME=kupito

# Database Connection Pooling
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# Authentication (ОБЯЗАТЕЛЬНО! Сгенерируйте надежный ключ)
JWT_SECRET=ваш_очень_длинный_и_случайный_секретный_ключ_минимум_32_символа

# CORS Configuration (замените на ваш домен)
FRONTEND_URL=https://ваш-домен.com

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Twilio SMS Configuration (получите на https://www.twilio.com)
TWILIO_ACCOUNT_SID=ваш-twilio-account-sid
TWILIO_AUTH_TOKEN=ваш-twilio-auth-token
TWILIO_MESSAGING_SERVICE_SID=ваш-twilio-messaging-service-sid

# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=ваш-email@gmail.com
SMTP_PASSWORD=ваш-пароль-приложения
SMTP_FROM=noreply@ваш-домен.com
```

**Как сгенерировать JWT_SECRET:**

```bash
# В терминале выполните:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Скопируйте полученную строку и вставьте в `JWT_SECRET`.

**Сохранение файла в nano:**
- Нажмите `Ctrl + O` (сохранить)
- Нажмите `Enter` (подтвердить имя файла)
- Нажмите `Ctrl + X` (выйти)

### 5.2 Создание файла .env.local для frontend

```bash
cd /var/www/kupito/frontend
nano .env.local
```

Вставьте:

```env
NEXT_PUBLIC_API_URL=https://api.ваш-домен.com
```

Или, если API на том же домене:

```env
NEXT_PUBLIC_API_URL=https://ваш-домен.com/api
```

**Сохранение:** `Ctrl + O`, `Enter`, `Ctrl + X`

### 5.3 Настройка прав доступа к .env файлам

```bash
# Защита .env файлов от чтения другими пользователями
chmod 600 /var/www/kupito/backend/.env
chmod 600 /var/www/kupito/frontend/.env.local
```

---

## 6. Сборка и запуск приложения

### 6.1 Сборка backend

```bash
cd /var/www/kupito/backend

# Сборка проекта
npm run build

# Запуск миграций базы данных (ОБЯЗАТЕЛЬНО!)
npm run migration:run
```

### 6.2 Сборка frontend

```bash
cd /var/www/kupito/frontend

# Сборка проекта
npm run build
```

### 6.3 Создание директории для загрузок

```bash
# Создаем директорию для загруженных файлов
mkdir -p /var/www/kupito/backend/uploads
chmod 755 /var/www/kupito/backend/uploads
```

### 6.4 Тестовый запуск backend

```bash
cd /var/www/kupito/backend
npm run start:prod
```

Если всё работает, остановите процесс (`Ctrl + C`) и переходите к следующему шагу.

---

## 7. Настройка веб-сервера (Nginx)

### 7.1 Создание конфигурации для backend API

```bash
sudo nano /etc/nginx/sites-available/kupito-api
```

Вставьте следующее (замените `ваш-домен.com` на ваш домен):

```nginx
server {
    listen 80;
    server_name api.ваш-домен.com;  # или ваш-домен.com если API на том же домене

    # Логи
    access_log /var/log/nginx/kupito-api-access.log;
    error_log /var/log/nginx/kupito-api-error.log;

    # Максимальный размер загружаемого файла
    client_max_body_size 50M;

    # Проксирование на backend
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы (загруженные изображения)
    location /uploads/ {
        alias /var/www/kupito/backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Сохранение:** `Ctrl + O`, `Enter`, `Ctrl + X`

### 7.2 Создание конфигурации для frontend

```bash
sudo nano /etc/nginx/sites-available/kupito-frontend
```

Вставьте:

```nginx
server {
    listen 80;
    server_name ваш-домен.com www.ваш-домен.com;

    # Логи
    access_log /var/log/nginx/kupito-frontend-access.log;
    error_log /var/log/nginx/kupito-frontend-error.log;

    # Максимальный размер загружаемого файла
    client_max_body_size 50M;

    # Проксирование на frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Сохранение:** `Ctrl + O`, `Enter`, `Ctrl + X`

### 7.3 Активация конфигураций

```bash
# Создание символических ссылок
sudo ln -s /etc/nginx/sites-available/kupito-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/kupito-frontend /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Если всё ОК, перезапуск Nginx
sudo systemctl reload nginx
```

---

## 8. Настройка домена и SSL

### 8.1 Настройка DNS записей

Зайдите в панель управления вашего домена (где вы его покупали) и добавьте DNS записи:

**Вариант 1: API на поддомене**
- Тип: `A`
- Имя: `api`
- Значение: `IP-адрес-вашего-сервера`
- TTL: `3600` (или автоматически)

- Тип: `A`
- Имя: `@` (или оставьте пустым для основного домена)
- Значение: `IP-адрес-вашего-сервера`
- TTL: `3600`

**Вариант 2: Всё на одном домене**
- Тип: `A`
- Имя: `@`
- Значение: `IP-адрес-вашего-сервера`
- TTL: `3600`

Подождите 5-30 минут, пока DNS записи обновятся.

### 8.2 Установка SSL сертификата (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата для frontend
sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com

# Получение сертификата для API (если на поддомене)
sudo certbot --nginx -d api.ваш-домен.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

Certbot автоматически обновит конфигурацию Nginx для использования HTTPS.

### 8.3 Обновление переменных окружения после получения SSL

```bash
# Обновите FRONTEND_URL в backend/.env
cd /var/www/kupito/backend
nano .env
```

Измените:
```env
FRONTEND_URL=https://ваш-домен.com
```

Также обновите `NEXT_PUBLIC_API_URL` в `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://api.ваш-домен.com
```

---

## 9. Настройка автозапуска (PM2)

### 9.1 Создание конфигурации PM2 для backend

```bash
cd /var/www/kupito/backend
nano ecosystem.config.js
```

Вставьте:

```javascript
module.exports = {
  apps: [
    {
      name: 'kupito-backend',
      script: 'dist/main.js',
      cwd: '/var/www/kupito/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/kupito-backend-error.log',
      out_file: '/var/log/pm2/kupito-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

**Сохранение:** `Ctrl + O`, `Enter`, `Ctrl + X`

### 9.2 Создание конфигурации PM2 для frontend

```bash
cd /var/www/kupito/frontend
nano ecosystem.config.js
```

Вставьте:

```javascript
module.exports = {
  apps: [
    {
      name: 'kupito-frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/kupito/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/kupito-frontend-error.log',
      out_file: '/var/log/pm2/kupito-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
```

**Сохранение:** `Ctrl + O`, `Enter`, `Ctrl + X`

### 9.3 Создание директории для логов PM2

```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### 9.4 Запуск приложений через PM2

```bash
# Запуск backend
cd /var/www/kupito/backend
pm2 start ecosystem.config.js

# Запуск frontend
cd /var/www/kupito/frontend
pm2 start ecosystem.config.js

# Сохранение конфигурации PM2 (для автозапуска после перезагрузки)
pm2 save

# Проверка статуса
pm2 status

# Просмотр логов
pm2 logs kupito-backend
pm2 logs kupito-frontend
```

---

## 10. Проверка работы

### 10.1 Проверка backend

Откройте в браузере:
- `https://api.ваш-домен.com` (должно показать "Kupito API v1.0")
- `https://api.ваш-домен.com/health` (health check - проверка БД и Redis)

Или проверьте через терминал:

```bash
# Базовый статус
curl https://api.ваш-домен.com

# Health check (проверка всех сервисов)
curl https://api.ваш-домен.com/health
```

Health check возвращает JSON с информацией о статусе:
- `status`: "ok" (все работает), "degraded" (частичные проблемы), "down" (критические проблемы)
- `services.database`: "connected" или "disconnected"
- `services.redis`: "connected" или "disconnected"
- HTTP 200 - все работает, HTTP 503 - есть проблемы

### 10.2 Проверка frontend

Откройте в браузере:
- `https://ваш-домен.com`

Сайт должен открыться и работать.

### 10.3 Проверка процессов

```bash
# Проверка PM2
pm2 status

# Проверка Nginx
sudo systemctl status nginx

# Проверка PostgreSQL
sudo systemctl status postgresql

# Проверка Redis (если установлен)
sudo systemctl status redis-server
```

---

## 11. Полезные команды

### 11.1 Управление PM2

```bash
# Просмотр всех процессов
pm2 list

# Просмотр логов
pm2 logs kupito-backend
pm2 logs kupito-frontend

# Перезапуск приложения
pm2 restart kupito-backend
pm2 restart kupito-frontend

# Остановка приложения
pm2 stop kupito-backend

# Удаление из PM2
pm2 delete kupito-backend

# Мониторинг в реальном времени
pm2 monit
```

### 11.2 Управление Nginx

```bash
# Перезапуск Nginx
sudo systemctl restart nginx

# Проверка конфигурации
sudo nginx -t

# Просмотр логов
sudo tail -f /var/log/nginx/kupito-api-error.log
sudo tail -f /var/log/nginx/kupito-frontend-error.log
```

### 11.3 Обновление кода

```bash
cd /var/www/kupito

# Получение обновлений из Git
git pull origin main

# Обновление зависимостей backend
cd backend
npm install
npm run build
pm2 restart kupito-backend

# Обновление зависимостей frontend
cd ../frontend
npm install
npm run build
pm2 restart kupito-frontend
```

### 11.4 Работа с базой данных

```bash
# Подключение к базе данных
sudo -u postgres psql -d kupito

# Запуск миграций
cd /var/www/kupito/backend
npm run migration:run

# Откат последней миграции
npm run migration:revert
```

### 11.5 Просмотр логов

```bash
# Логи backend (PM2)
pm2 logs kupito-backend --lines 100

# Логи frontend (PM2)
pm2 logs kupito-frontend --lines 100

# Логи Nginx
sudo tail -f /var/log/nginx/kupito-api-access.log
sudo tail -f /var/log/nginx/kupito-frontend-error.log

# Логи системы
sudo journalctl -u nginx -f
```

---

## 🔧 Решение проблем

### Проблема: Приложение не запускается

1. Проверьте логи:
```bash
pm2 logs kupito-backend --err
pm2 logs kupito-frontend --err
```

2. Проверьте переменные окружения:
```bash
cd /var/www/kupito/backend
cat .env
```

3. Проверьте, что база данных запущена:
```bash
sudo systemctl status postgresql
```

### Проблема: 502 Bad Gateway

1. Проверьте, что приложение запущено:
```bash
pm2 status
```

2. Проверьте, что порты открыты:
```bash
sudo netstat -tlnp | grep :4000
sudo netstat -tlnp | grep :3000
```

3. Проверьте логи Nginx:
```bash
sudo tail -f /var/log/nginx/kupito-api-error.log
```

### Проблема: База данных не подключается

1. Проверьте, что PostgreSQL запущен:
```bash
sudo systemctl status postgresql
```

2. Проверьте подключение:
```bash
sudo -u postgres psql -d kupito -U kupito
```

3. Проверьте пароль в `.env` файле

### Проблема: SSL сертификат не работает

1. Проверьте DNS записи:
```bash
nslookup ваш-домен.com
```

2. Обновите сертификат вручную:
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 12. Настройка автоматических бэкапов базы данных

Автоматические бэкапы критически важны для production. Настройте их сразу после деплоя.

### 12.1 Создание директории для бэкапов

```bash
sudo mkdir -p /var/backups/kupito
sudo chown $USER:$USER /var/backups/kupito
```

### 12.2 Создание файла с переменными окружения

```bash
sudo mkdir -p /etc/kupito
sudo nano /etc/kupito/backup.env
```

Добавьте:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=ваш_пароль_базы_данных
DB_NAME=kupito
BACKUP_DIR=/var/backups/kupito
KEEP_DAYS=30
```

Установите права доступа:
```bash
sudo chmod 600 /etc/kupito/backup.env
sudo chown $USER:$USER /etc/kupito/backup.env
```

### 12.3 Настройка cron для автоматических бэкапов

Откройте crontab:
```bash
crontab -e
```

Добавьте строку для ежедневного бэкапа в 2:00 ночи:
```cron
0 2 * * * source /etc/kupito/backup.env && /var/www/kupito/backend/scripts/backup-database.sh >> /var/log/kupito-backup.log 2>&1
```

Или для бэкапа каждые 6 часов:
```cron
0 */6 * * * source /etc/kupito/backup.env && /var/www/kupito/backend/scripts/backup-database.sh >> /var/log/kupito-backup.log 2>&1
```

**Важно:** Замените `/var/www/kupito` на реальный путь к вашему проекту.

### 12.4 Тестирование бэкапа

Проверьте, что бэкап работает:
```bash
source /etc/kupito/backup.env
/var/www/kupito/backend/scripts/backup-database.sh
```

Проверьте созданный файл:
```bash
ls -lh /var/backups/kupito/
```

### 12.5 Мониторинг бэкапов

Проверяйте логи бэкапов:
```bash
tail -f /var/log/kupito-backup.log
```

Проверяйте последние бэкапы:
```bash
ls -lht /var/backups/kupito/ | head -10
```

### 12.6 Рекомендации

- **Храните бэкапы на отдельном диске/разделе** - не на том же, где база данных
- **Настройте синхронизацию в облако** (S3, Google Drive и т.д.) для дополнительной безопасности
- **Тестируйте восстановление** из бэкапа периодически
- **Мониторьте место на диске** - старые бэкапы автоматически удаляются (по умолчанию через 30 дней)

Подробная документация: [DATABASE_BACKUPS.md](./DATABASE_BACKUPS.md)

---

## 📝 Чеклист перед запуском

- [ ] Node.js установлен (версия 20+)
- [ ] PostgreSQL установлен и запущен
- [ ] Redis установлен (опционально)
- [ ] Nginx установлен и запущен
- [ ] PM2 установлен
- [ ] Проект склонирован/загружен
- [ ] Зависимости установлены (`npm install`)
- [ ] Файл `backend/.env` создан и заполнен
- [ ] Файл `frontend/.env.local` создан и заполнен
- [ ] `JWT_SECRET` сгенерирован и установлен
- [ ] Пароль базы данных установлен
- [ ] База данных создана
- [ ] Миграции выполнены (`npm run migration:run`)
- [ ] Backend собран (`npm run build`)
- [ ] Frontend собран (`npm run build`)
- [ ] Директория `uploads` создана
- [ ] Конфигурации Nginx созданы и активированы
- [ ] DNS записи настроены
- [ ] SSL сертификаты установлены
- [ ] Приложения запущены через PM2
- [ ] PM2 сохранен (`pm2 save`)
- [ ] Сайт открывается в браузере
- [ ] Health check endpoint работает (`/health`)
- [ ] Автоматические бэкапы БД настроены (cron)
- [ ] Бэкапы протестированы и работают

---

## 🎉 Готово!

Ваш сайт должен быть доступен по адресу `https://ваш-домен.com`!

Если что-то не работает, проверьте логи и следуйте разделу "Решение проблем" выше.

**Важные напоминания:**
- Регулярно делайте резервные копии базы данных
- Следите за обновлениями безопасности
- Проверяйте логи на наличие ошибок
- Обновляйте зависимости периодически


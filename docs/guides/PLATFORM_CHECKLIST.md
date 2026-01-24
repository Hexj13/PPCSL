# Чеклист создания платформы

Краткий чеклист для создания новой платформы на базе PPCSL core.

## Перед началом

⚠️ **ВАЖНО:** Прочитайте следующие документы:
- [`MULTI_REPOSITORY.md`](../architecture/MULTI_REPOSITORY.md) - Общая архитектура
- [`SCRIPTS_ARCHITECTURE.md`](../architecture/SCRIPTS_ARCHITECTURE.md) - Архитектура скриптов
- [`KNOWN_ISSUES.md`](../architecture/KNOWN_ISSUES.md) - Известные проблемы

---

## Структура Platform Repository

```
platform-repo/
├── assets/                    # Графические ресурсы
│   ├── frontend/
│   │   └── public/           # Логотипы, иконки, favicon, OG images
│   └── backend/
│       └── watermark/        # Watermark для фотографий
├── config/
│   └── site.ts               # Конфигурация платформы
├── locales/
│   └── {lang}.json           # Переводы
├── theme/
│   └── colors.ts             # Цветовая схема
├── core/                      # Submodule PPCSL
│   └── backend/src/scripts/platforms/{country}/  # Platform configs в core
│       └── config.ts         # Города, описания, телефоны
├── package.json
└── README.md
```

---

## Checklist

### 1. Инфраструктура

- [ ] Зарегистрирован домен (Namecheap)
- [ ] Создан Git репозиторий
- [ ] Добавлен PPCSL core как submodule
- [ ] Создана структура папок (`assets/`, `config/`, `locales/`, `theme/`)

### 2. Конфигурация (`config/site.ts`)

- [ ] Установлен `country` код (например, `al` для Албании)
- [ ] Установлено `name` платформы (например, `AutoShqip`)
- [ ] Установлен `domain` (например, `autoshqip.al`)
- [ ] Установлен `locale` (например, `sq-AL`)
- [ ] Установлена `currency` (например, `EUR`)
- [ ] Установлен `countryCode` для телефонов (например, `AL`)
- [ ] Установлен `supportEmail`
- [ ] Установлен `siteUrl`

### 3. Переводы (`locales/{lang}.json`)

- [ ] Создан файл переводов для основного языка
- [ ] Переведены ВСЕ ключи из `mk.json`
- [ ] Переведены юридические документы (Terms, Privacy)
- [ ] Переведены FAQ
- [ ] Переведены SMS сообщения (в `core/backend/src/common/constants.ts`)
- [ ] Проверена структура (совпадает с `mk.json`)

### 4. Тема (`theme/colors.ts`)

- [ ] Скопирован `colors.ts` из Macedonia или создан новый
- [ ] Настроены цвета (если нужно изменить)
- [ ] Проверена совместимость с TailwindCSS

### 5. Графические ресурсы (`assets/`)

#### Frontend (`assets/frontend/public/`)
- [ ] Создан логотип `logo.png`
- [ ] Создан `logo-desktop.png`
- [ ] Создан `logo-mobile.png`
- [ ] Созданы favicon (16, 32, 64, 192, 512px)
- [ ] Создан `favicon.ico`
- [ ] Создана PWA иконка `pwa192.png`
- [ ] Создано Open Graph изображение `og-image.jpg` (1200x630px)
- [ ] Создано `opengraph-image.png` (1200x630px)

#### Backend (`assets/backend/watermark/`)
- [ ] Создан логотип водяного знака `logo.png` (PNG с прозрачным фоном, ~200x200px, белый/светлый цвет)

### 6. Скрипты генерации данных (`scripts/{country}/`)

- [ ] Создана папка `scripts/{country}/stage/`
- [ ] Создан `seed-config.ts` с локальными данными:
  - [ ] Города страны (реальные города, не переводы!)
  - [ ] Описания на местном языке
  - [ ] Телефонный префикс (например, `+355` для Албании)
  - [ ] Тестовые имена пользователей
  - [ ] Transmission labels на местном языке
- [ ] Скопированы скрипты из `scripts/mk/stage/`:
  - [ ] `seed.ts`
  - [ ] `reset-and-seed.ts`
  - [ ] `seed-vin-test.ts`
  - [ ] `create-test-listing.ts`
  - [ ] `generate-listings-for-all-models.ts`

### 7. Package.json

- [ ] Настроен `name`
- [ ] Настроен `description`
- [ ] Обновлён скрипт `prepare:build`:
  ```json
  "prepare:build": "cp -r scripts/{country} core/backend/src/scripts/ && cp -r locales core/frontend/lib/ && cp -r theme core/frontend/lib/ && cp -r config core/frontend/lib/ && cp -r assets/frontend/public/* core/frontend/public/ && cp -r assets/backend/watermark core/backend/assets/"
  ```
- [ ] Добавлены скрипты для запуска:
  ```json
  "seed": "cd core/backend && npm run script scripts/{country}/stage/seed.ts",
  "reset-and-seed": "cd core/backend && npm run script scripts/{country}/stage/reset-and-seed.ts",
  "add-brands": "cd core/backend && npm run script scripts/common/stage/add-brands.ts"
  ```

### 8. Environment Variables (`.env`)

#### Backend
- [ ] `DATABASE_URL` (PostgreSQL)
- [ ] `REDIS_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `FRONTEND_URL` (например, `https://autoshqip.al`)
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_S3_BUCKET_NAME` (общий или отдельный?)
- [ ] `AWS_REGION`
- [ ] `CLOUDFRONT_URL`
- [ ] `WATERMARK_DOMAIN` (например, `autoshqip.al`)
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_MESSAGING_SERVICE_SID` или `TWILIO_PHONE_NUMBER`

#### Frontend
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `NEXT_PUBLIC_COUNTRY` (например, `al`)
- [ ] `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`
- [ ] `NEXT_PUBLIC_GOOGLE_VERIFICATION`

### 9. Внешние сервисы

#### Google
- [ ] Создан Google аккаунт для платформы
- [ ] Настроен Google Analytics
- [ ] Настроен Google Search Console
- [ ] Получен Measurement ID
- [ ] Получен Verification код

#### Twilio
- [ ] Создан/настроен Twilio аккаунт
- [ ] Приобретён номер телефона или создан Messaging Service
- [ ] Получены учётные данные (SID, Auth Token)
- [ ] Протестирована отправка SMS

#### AWS S3 (если отдельный bucket)
- [ ] Создан S3 bucket
- [ ] Настроены permissions
- [ ] Создан CloudFront distribution
- [ ] Настроен CORS

#### Domain & DNS (Namecheap)
- [ ] Приобретён домен
- [ ] Настроены DNS записи (A, CNAME)

### 10. Deployment (Render.com)

- [ ] Создан PostgreSQL сервис
- [ ] Создан Redis сервис
- [ ] Создан Backend сервис
  - [ ] Настроены env переменные
  - [ ] Настроен build command
  - [ ] Настроен start command
- [ ] Создан Frontend сервис
  - [ ] Настроены env переменные
  - [ ] Настроен build command
  - [ ] Настроен start command
- [ ] Подключён кастомный домен
- [ ] Настроен SSL сертификат (автоматически)

### 11. CI/CD

- [ ] Создан `.github/workflows/ci.yml`
- [ ] Настроены GitHub Actions
- [ ] Добавлены secrets в GitHub
- [ ] Протестирован workflow

### 12. Локальное тестирование

- [ ] Запущен `npm run prepare:build`
- [ ] Установлены зависимости (`npm install` в core/backend и core/frontend)
- [ ] Запущена база данных (PostgreSQL, Redis)
- [ ] Запущен `npm run add-brands` (универсальные бренды)
- [ ] Запущен `npm run seed` (локальные данные)
- [ ] Запущен backend (`npm run dev`)
- [ ] Запущен frontend (`npm run dev`)
- [ ] Проверена работа сайта локально
- [ ] Проверена регистрация/логин
- [ ] Проверена верификация телефона (Twilio)
- [ ] Проверена загрузка фото (S3)
- [ ] Проверен watermark на фото

### 13. Production Deploy

- [ ] Задеплоен backend на Render.com
- [ ] Задеплоен frontend на Render.com
- [ ] Проверена работа в production
- [ ] Настроены мониторинг и логи
- [ ] Настроены бэкапы базы данных
- [ ] Настроены cron jobs (если нужно)

### 14. SEO & Analytics

- [ ] Добавлен сайт в Google Search Console
- [ ] Отправлен sitemap
- [ ] Проверена индексация
- [ ] Настроена Google Analytics
- [ ] Проверено отслеживание событий

### 15. Юридические документы

- [ ] Переведены Terms of Service
- [ ] Переведена Privacy Policy
- [ ] Проверены контакты и информация
- [ ] Проверено соответствие законодательству страны

---

## После запуска

### Регулярные задачи

- [ ] Мониторинг логов
- [ ] Проверка работы SMS (Twilio)
- [ ] Проверка загрузки фото (S3)
- [ ] Бэкапы базы данных
- [ ] Обновление core (git submodule update)
- [ ] Обновление зависимостей

### Поддержка

- [ ] Документация для команды
- [ ] Инструкции по деплою
- [ ] Инструкции по обновлению
- [ ] Контакты для поддержки

---

## Полезные команды

```bash
# Клонирование репозитория с submodule
git clone --recurse-submodules <repo-url>

# Обновление submodule
git submodule update --remote

# Подготовка к сборке
npm run prepare:build

# Генерация брендов (универсально)
npm run add-brands

# Генерация локальных данных
npm run seed

# Сброс и полная генерация
npm run reset-and-seed

# Запуск локально
npm run dev
```

---

## Полезные ссылки

- [PPCSL Core Repository](https://github.com/your-org/ppcsl)
- [Multi-Repository](../architecture/MULTI_REPOSITORY.md)
- [Scripts Architecture](../architecture/SCRIPTS_ARCHITECTURE.md)
- [Known Issues](../architecture/KNOWN_ISSUES.md)
- [Platform Guide](./PLATFORM_GUIDE.md)
- [Deployment](./DEPLOYMENT.md)

---

**Удачи с новой платформой! 🚀**

# Настройка оптимизации изображений — пошаговая инструкция

После реализации оптимизации загрузки изображений нужно выполнить 4 шага:
миграция БД, настройка CloudFront, env-переменная на Render, backfill скрипт.

---

## Шаг 1. Запустить миграцию БД

Добавлено новое поле `cover_blur_hash` в таблицу `listings`.
Миграция: `1792000000000-AddCoverBlurHash.ts`.

**Локально (dev):**

```bash
cd core/backend
npm run migration:run
```

**На production (Render):**

Миграция запустится автоматически при деплое, если настроен `migration:run:prod`
в Build Command. Если нет — подключиться к Render Shell и выполнить:

```bash
cd /opt/render/project/src/core/backend
node node_modules/typeorm/cli.js migration:run -d dist/data-source.js
```

---

## Шаг 2. Настроить CloudFront (AWS Console)

Цель: чтобы оптимизированные изображения (`/api/upload/image/xxx.webp?quality=65&width=640`)
раздавались через CDN, а не напрямую с бэкенда.

### 2.1. Открыть CloudFront distribution

1. Зайти в [AWS Console → CloudFront](https://console.aws.amazon.com/cloudfront/)
2. Открыть distribution `E1N5YQ6U11AF4U` (cdn.kupito.club)

### 2.2. Добавить новый Origin (API-сервер)

1. Вкладка **Origins** → кнопка **Create origin**
2. Заполнить:
   - **Origin domain**: хост бэкенда на Render (например `kupito-backend.onrender.com`)
     - Узнать точный хост: зайти в Render → kupito-backend → Settings → посмотреть URL сервиса. Взять только хост без `https://`
   - **Protocol**: HTTPS only
   - **Name**: `kupito-api` (или любое понятное имя)
   - **Minimum origin SSL protocol**: TLSv1.2
   - Остальное оставить по умолчанию
3. Нажать **Create origin**

### 2.3. Добавить новый Behavior (правило кэширования)

1. Вкладка **Behaviors** → кнопка **Create behavior**
2. Заполнить:

| Параметр | Значение |
|---|---|
| **Path pattern** | `/api/upload/image/*` |
| **Origin and origin groups** | `kupito-api` (только что созданный) |
| **Viewer protocol policy** | Redirect HTTP to HTTPS |
| **Allowed HTTP methods** | GET, HEAD |
| **Cache key and origin requests** | |
| — Cache policy | `CachingOptimized` |
| — Origin request policy | `AllViewerExceptHostHeader` |
| **Compress objects automatically** | Yes |

3. Нажать **Create behavior**

### 2.4. Важно: проверить порядок behaviors

После создания на вкладке **Behaviors** должно быть:

| Приоритет | Path pattern | Origin |
|---|---|---|
| 0 | `/api/upload/image/*` | kupito-api |
| 1 (Default) | `*` | kupito-uploads S3 |

Новый behavior ДОЛЖЕН быть выше default (`*`). CloudFront проверяет patterns сверху вниз.

### 2.5. Проверить Cache Policy

Если `CachingOptimized` не включает query strings в cache key (по умолчанию включает),
создать custom policy:

1. **Policies** → **Cache** → **Create cache policy**
2. Name: `ImageOptimizationCache`
3. **Query strings**: All
4. **Headers**: None
5. **Cookies**: None
6. **TTL**: Use origin cache headers (бэкенд уже отдаёт `max-age=31536000`)
7. Вернуться к behavior и выбрать эту policy

Query strings критически важны — без них `?quality=65&width=640` и `?quality=75&width=1200`
будут возвращать одно и то же закэшированное изображение.

### 2.6. Подождать деплой

CloudFront deployment занимает 3-10 минут. Статус виден на главной странице distribution.

### 2.7. Проверить

```bash
# Прямой запрос к бэкенду (старый путь)
curl -sI "https://BACKEND_HOST/api/upload/image/SOME_UUID.webp?quality=65&width=640" | grep -i cache

# Через CDN (новый путь)
curl -sI "https://cdn.kupito.club/api/upload/image/SOME_UUID.webp?quality=65&width=640" | grep -iE "cache|x-cache|age"
```

При первом запросе через CDN: `X-Cache: Miss from cloudfront`
При повторном: `X-Cache: Hit from cloudfront` — значит работает.

---

## Шаг 3. Добавить env-переменную на Render (Frontend)

1. Зайти в [Render Dashboard](https://dashboard.render.com)
2. Открыть **frontend** сервис (kupito-frontend)
3. **Environment** → **Add Environment Variable**:

```
NEXT_PUBLIC_IMAGE_CDN_URL=https://cdn.kupito.club
```

4. Нажать **Save Changes**
5. Frontend пересоберётся автоматически

После этого `getOptimizedImageUrl()` будет формировать URL вида
`https://cdn.kupito.club/api/upload/image/xxx.webp?quality=65&width=640`
вместо прямого обращения к API-серверу.

---

## Шаг 4. Backfill blurhash для существующих объявлений (опционально)

Новые объявления получают blurhash автоматически при загрузке фото.
Для существующих — нужно запустить скрипт один раз.

**Локально (если есть доступ к production БД и S3):**

```bash
cd core/backend
COUNTRY=md \
DB_HOST=... DB_PORT=5432 DB_USERNAME=... DB_PASSWORD=... DB_NAME=... \
AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_REGION=eu-north-1 AWS_S3_BUCKET_NAME=kupito-uploads \
npx ts-node -r tsconfig-paths/register src/scripts/tools/backfill-blurhash.ts
```

**На Render Shell:**

```bash
cd /opt/render/project/src/core/backend
node dist/scripts/tools/backfill-blurhash.js
```

Скрипт обрабатывает по 50 объявлений за раз с паузой 1 секунда между батчами.
Выводит прогресс в консоль. Безопасно прерывать и запускать повторно —
обрабатывает только записи с `cover_blur_hash IS NULL`.

---

## Что теперь работает

| До | После |
|---|---|
| Изображение обрабатывается дважды (backend + Next.js) | Одна обработка (backend), Next.js пропускает |
| Каждый запрос карточки → S3 + sharp | LRU-кэш в памяти, повторный запрос мгновенный |
| Thumbnails 800px | 640px (экономия ~36%) |
| API отдаёт 20 фото на карточку | Максимум 5 |
| Thumbnail генерируется на лету | Пре-генерированный 400px при upload |
| Все запросы идут на API-сервер | CDN кэширует на edge (~10-50ms вместо ~200-500ms) |
| Серый прямоугольник при загрузке | Размытый цветной blurhash-preview |

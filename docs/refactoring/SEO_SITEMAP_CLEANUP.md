# SEO & Sitemap Cleanup Plan

> **Статус:** план утверждён, готов к выполнению
> **Область:** `core/frontend/app/` — robots.ts, sitemap.txt/route.ts, page.tsx (metadata), not-found.tsx
> **Приоритет:** высокий (влияет на индексацию в Google)

---

## 1. Контекст

Google Search Console показывает ~2660 страниц с noindex. Примеры:

```
https://kupito.club/?body_types=Hatchback
https://kupito.club/?brand=yamaha&model=vmax&vehicleType=moto
https://kupito.club/?brand=gilera&model=runner-200&vehicleType=moto
https://kupito.club/?body_types=Cross,Cruiser,Naked,Scooter&vehicleType=moto
https://kupito.club/?brand=suzuki&model=dr350&vehicleType=moto
https://kupito.club/?brand=foton&model=sauvana&vehicleType=truck
```

Последнее сканирование GSC: 23–26 января 2026. Фикс noindex-логики был применён позже. **Ожидаем переиндексацию.**

Однако при анализе обнаружены дополнительные проблемы, требующие исправления.

---

## 2. Текущее состояние noindex-логики (после фикса)

### Главная страница (`app/page.tsx:275-305`)

Текущая логика корректна:

```ts
const indexableParamKeys = new Set([
  'brand', 'model', 'page', 'body_types', 'vehicleType',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'gclid', 'gclsrc', 'fbclid', 'ref', 'mc_cid', 'mc_eid',
]);

const hasNonIndexableParams = Object.entries(params).some(([key, value]) => {
  if (value === undefined) return false;
  if (indexableParamKeys.has(key)) {
    if (key === 'vehicleType') return !isValidVehicleType(value);
    return false;
  }
  return true; // неизвестный параметр → noindex
});
```

**Что индексируется:** `/?brand=X`, `/?brand=X&model=Y`, `/?body_types=Z`, `/?vehicleType=moto`, комбинации этих параметров, любые с UTM/tracking.

**Что НЕ индексируется:** URL с фильтрами (`price_from`, `year_from`, `fuel`, `transmission`, и т.д.).

**Вердикт:** логика корректна. Все URL из sitemap попадают в индексируемые. Ждём переиндексацию.

### Потенциальный риск: массивы в параметрах

Если Google вдруг передаст `?vehicleType=moto&vehicleType=car` (дублирующий параметр), Next.js прочитает его как массив `['moto', 'car']`, и `isValidVehicleType()` вернёт `false` (проверяет `typeof value === 'string'`), что приведёт к noindex.

**Вероятность:** низкая (Google не дублирует параметры). Но защита не помешает.

---

## 3. Обнаруженные проблемы

### Проблема A: robots.ts ссылается на несуществующий sitemap.xml

**Файл:** `app/robots.ts:36`

```ts
sitemap: [`${siteUrl}/sitemap.txt`, `${siteUrl}/sitemap.xml`],
```

`/sitemap.xml` не существует — есть только `/sitemap.txt` (`app/sitemap.txt/route.ts`). Google пытается запросить `/sitemap.xml`, получает 404. Это не критично (Google проигнорирует), но засоряет логи и выглядит как ошибка в GSC.

**Серьёзность:** средняя

---

### Проблема B: not-found.tsx без noindex

**Файл:** `app/not-found.tsx`

Страница 404 не содержит `robots: { index: false }`. Если Google обнаружит битую ссылку и отрендерит 404-страницу, она может попасть в индекс как реальная страница.

Next.js автоматически отдаёт HTTP 404, что Google обычно обрабатывает корректно. Но добавить noindex — best practice для защиты.

**Серьёзность:** низкая

---

### Проблема C: документация SITEMAP.md устарела

**Файл:** `docs/features/SITEMAP.md`

- Ссылается на `core/frontend/app/sitemap.ts` — реальный файл `app/sitemap.txt/route.ts`
- Не описывает комбинации body types
- Не описывает "популярные" vs "непопулярные" типы
- Не описывает формат sitemap.txt (только текстовый список)

**Серьёзность:** низкая

---

## 4. TODO-лист

### TODO-S1: Убрать ссылку на несуществующий sitemap.xml

**Приоритет:** высокий
**Зависимости:** нет
**Файл:** `core/frontend/app/robots.ts`

**Что сделать:**

Строка 36 — убрать `/sitemap.xml`:

```ts
// БЫЛО:
sitemap: [`${siteUrl}/sitemap.txt`, `${siteUrl}/sitemap.xml`],

// СТАЛО:
sitemap: `${siteUrl}/sitemap.txt`,
```

**Как проверить:** `GET /robots.txt` содержит одну строку `Sitemap:` с `/sitemap.txt`. Нет `/sitemap.xml`.

---

### TODO-S2: Добавить noindex в not-found.tsx

**Приоритет:** средний
**Зависимости:** нет
**Файл:** `core/frontend/app/not-found.tsx`

**Что сделать:**

Добавить экспорт `metadata` с noindex:

```ts
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404',
  robots: {
    index: false,
    follow: false,
  },
};
```

**Как проверить:** при запросе несуществующей страницы в HTML есть `<meta name="robots" content="noindex, nofollow">`.

---

### TODO-S3: Обновить документацию SITEMAP.md

**Приоритет:** низкий
**Зависимости:** нет
**Файл:** `core/docs/features/SITEMAP.md`

**Что обновить:**
- Исправить путь файла: `app/sitemap.ts` → `app/sitemap.txt/route.ts`
- Описать, что включаются только одиночные body types (без комбинаций)
- Добавить список включённых body types по категориям
- Описать формат: plain text, один URL на строку
- Добавить примечание: непопулярные мото-типы не включаются

---

## 5. Порядок выполнения

```
TODO-S1: Убрать sitemap.xml из robots.ts (мгновенный фикс)
   ↓
TODO-S2: noindex в not-found.tsx (мгновенный фикс)
   ↓
TODO-S3: Обновить SITEMAP.md
```

S1 и S2 можно делать параллельно.

---

## 6. Мониторинг после изменений

После деплоя:

1. **Проверить robots.txt:** `curl https://kupito.club/robots.txt` — нет `/sitemap.xml`
2. **Отправить sitemap в GSC:** Search Console → Sitemaps → повторно отправить `/sitemap.txt`
3. **Запросить переиндексацию** для нескольких проблемных URL через GSC → Проверка URL → Запросить индексирование
4. **Через 1–2 недели:** проверить в GSC раздел «Индексирование страниц» — количество noindex-страниц должно снизиться

---

## 7. Связь с другой документацией

- Текущая документация sitemap: [SITEMAP.md](../features/SITEMAP.md)
- SEO-аудит: [SEO_AUDIT.md](../features/SEO_AUDIT.md)
- Бэкенд-рефакторинг: [LAYERS_AND_DDD.md](./LAYERS_AND_DDD.md)
- Фронтенд-рефакторинг: [FRONTEND_CLEANUP.md](./FRONTEND_CLEANUP.md)

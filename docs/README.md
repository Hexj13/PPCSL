# PPCSL Core Documentation

Документация для **PPCSL (Platform-Portable Car Sales Logic)** - универсального ядра для создания автомобильных маркетплейсов.

## 📚 Структура документации

### 🏗️ [`architecture/`](./architecture/)
**Архитектура системы** - как устроена multi-platform система

- **[ARCHITECTURE_OVERVIEW.md](./architecture/ARCHITECTURE_OVERVIEW.md)** ⭐ **НАЧНИ ЗДЕСЬ**
- [MULTI_REPOSITORY.md](./architecture/MULTI_REPOSITORY.md) - Core + Platform repos
- [SCRIPTS_ARCHITECTURE.md](./architecture/SCRIPTS_ARCHITECTURE.md) 🔴 **КРИТИЧНО**
- [KNOWN_ISSUES.md](./architecture/KNOWN_ISSUES.md) - Известные проблемы
- [TECHNICAL.md](./architecture/TECHNICAL.md) - Технические детали

### 📖 [`guides/`](./guides/)
**Руководства** — создание платформ, деплой, настройка сервисов

- **[PLATFORM_CHECKLIST.md](./guides/PLATFORM_CHECKLIST.md)** ⭐ **Чеклист для новых платформ**
- [PLATFORM_GUIDE.md](./guides/PLATFORM_GUIDE.md) — настройка и разработка (включая GA, GTM, Sentry)
- [SENTRY.md](./guides/SENTRY.md) — настройка и мониторинг Sentry
- [DEPLOYMENT.md](./guides/DEPLOYMENT.md) — деплой
- [LOCAL_DEVELOPMENT.md](./guides/LOCAL_DEVELOPMENT.md) — локальная разработка
- [QUICK_START_RU.md](./guides/QUICK_START_RU.md) — быстрый старт

**Порядок:** PLATFORM_CHECKLIST → PLATFORM_GUIDE → DEPLOYMENT. Локально: LOCAL_DEVELOPMENT → QUICK_START_RU.

### 📊 [`analytics/`](./analytics/)
**Аналитика**

- [GA4_EVENTS.md](./analytics/GA4_EVENTS.md) — события и архитектура GA4 (Sentry — в [guides/SENTRY.md](./guides/SENTRY.md))

### 🌍 [`platform-plans/`](./platform-plans/)
**Планы конкретных платформ** — при добавлении новой страны можно создать план по образцу существующей платформы (Moldova).

### ✨ [`features/`](./features/)
**Документация фич** - описание компонентов и функциональности

- [IMAGE_PREVIEW.md](./features/IMAGE_PREVIEW.md) - Система превью изображений
- [LOADING_STATES.md](./features/LOADING_STATES.md) - Loading states
- [PAID_PROMOTION.md](./features/PAID_PROMOTION.md) - Платное продвижение
- [SIMILAR_LISTINGS.md](./features/SIMILAR_LISTINGS.md) - Похожие объявления
- [SITEMAP.md](./features/SITEMAP.md) - Генерация sitemap
- [VEHICLE_TYPE.md](./features/VEHICLE_TYPE.md) - Переключатели типа транспорта (легковой/грузовой/мото) ✅
- [SEO_AUDIT.md](./features/SEO_AUDIT.md) - SEO аудит
- [TODO.md](./features/TODO.md) - Задачи и планы

---

## 🗺️ Roadmap (архитектура)

**Приоритет 1:** Assets — ✅; Скрипты — 🔴 [SCRIPTS_ARCHITECTURE.md](./architecture/SCRIPTS_ARCHITECTURE.md)  
**Приоритет 2:** Frontend хардкоды — ⚠️ [KNOWN_ISSUES.md](./architecture/KNOWN_ISSUES.md)

---

## 🚀 Быстрый старт

### Для Product Manager / Project Manager:
1. [architecture/ARCHITECTURE_OVERVIEW.md](./architecture/ARCHITECTURE_OVERVIEW.md) - Обзор системы
2. [guides/PLATFORM_CHECKLIST.md](./guides/PLATFORM_CHECKLIST.md) - Чеклист
3. [platform-plans/](./platform-plans/) - Планы платформ (при добавлении новой страны)

### Для Backend разработчика:
1. [architecture/MULTI_REPOSITORY.md](./architecture/MULTI_REPOSITORY.md)
2. [architecture/SCRIPTS_ARCHITECTURE.md](./architecture/SCRIPTS_ARCHITECTURE.md) 🔴 **ОБЯЗАТЕЛЬНО**
3. [guides/LOCAL_DEVELOPMENT.md](./guides/LOCAL_DEVELOPMENT.md)

### Для Frontend разработчика:
1. [architecture/MULTI_REPOSITORY.md](./architecture/MULTI_REPOSITORY.md)
2. [architecture/KNOWN_ISSUES.md](./architecture/KNOWN_ISSUES.md)
3. [guides/LOCAL_DEVELOPMENT.md](./guides/LOCAL_DEVELOPMENT.md)

### Для DevOps:
1. [guides/DEPLOYMENT.md](./guides/DEPLOYMENT.md)
2. [guides/PLATFORM_GUIDE.md](./guides/PLATFORM_GUIDE.md)

---

## 🚨 Важные замечания

### Критические проблемы архитектуры:

1. **🔴 Скрипты генерации данных в core** (ВЫСОКИЙ приоритет)
   - См. [architecture/SCRIPTS_ARCHITECTURE.md](./architecture/SCRIPTS_ARCHITECTURE.md)
   - Требует реорганизации перед созданием новых платформ

2. **⚠️ Хардкодные данные в frontend** (СРЕДНИЙ приоритет)
   - См. [architecture/KNOWN_ISSUES.md](./architecture/KNOWN_ISSUES.md)
   - Можно обойти временными решениями

---

## 📞 Поддержка

1. Документация в нужной секции (архитектура, guides, features, platform-plans)
2. [KNOWN_ISSUES.md](./architecture/KNOWN_ISSUES.md) — известные проблемы
3. Обращение в команду

---

## Для разработчиков (фичи)

При новой фиче: создать док в `features/`, описать архитектуру/API/UI, обновить список в разделе «features» выше.

**Последнее обновление:** 2026-01

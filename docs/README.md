# PPCSL Core Documentation

Документация для **PPCSL (Platform-Portable Car Sales Logic)** - универсального ядра для создания автомобильных маркетплейсов.

## 📚 Структура документации

### 🏗️ [`architecture/`](./architecture/)
**Архитектура системы** - как устроена multi-platform система

- **[README_ARCHITECTURE.md](./architecture/README_ARCHITECTURE.md)** ⭐ **НАЧНИ ЗДЕСЬ**
- [MULTI_REPOSITORY_ARCHITECTURE.md](./architecture/MULTI_REPOSITORY_ARCHITECTURE.md) - Core + Platform repos
- [SCRIPTS_ARCHITECTURE.md](./architecture/SCRIPTS_ARCHITECTURE.md) 🔴 **КРИТИЧНО**
- [ARCHITECTURE_IMPROVEMENTS_NEEDED.md](./architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md) - Известные проблемы
- [TECHNICAL.md](./architecture/TECHNICAL.md) - Технические детали

### 📖 [`guides/`](./guides/)
**Руководства для разработчиков** - как создавать и деплоить платформы

- **[PLATFORM_CHECKLIST.md](./guides/PLATFORM_CHECKLIST.md)** ⭐ **Чеклист для новых платформ**
- [PLATFORM_GUIDE.md](./guides/PLATFORM_GUIDE.md) - Детальное руководство
- [DEPLOYMENT.md](./guides/DEPLOYMENT.md) - Инструкции по деплою
- [LOCAL_DEVELOPMENT.md](./guides/LOCAL_DEVELOPMENT.md) - Локальная разработка
- [QUICK_START_RU.md](./guides/QUICK_START_RU.md) - Быстрый старт

### 🌍 [`platform-plans/`](./platform-plans/)
**Планы конкретных платформ** - детальные планы для каждой страны

- [PLAN_ALBANIA_PLATFORM.md](./platform-plans/PLAN_ALBANIA_PLATFORM.md) - План для Албании
- _Будущие планы для других стран..._

### ✨ [`features/`](./features/)
**Документация фич** - описание компонентов и функциональности

- [IMAGE_PREVIEW_SYSTEM.md](./features/IMAGE_PREVIEW_SYSTEM.md) - Система превью изображений
- [LOADING_STATES_REQUIREMENTS.md](./features/LOADING_STATES_REQUIREMENTS.md) - Loading states
- [PAID_PROMOTION.md](./features/PAID_PROMOTION.md) - Платное продвижение
- [SIMILAR_LISTINGS_BLOCK.md](./features/SIMILAR_LISTINGS_BLOCK.md) - Похожие объявления
- Фильтр популярных типов кузовов - Визуальный фильтр с плитками (реализовано)
- [SEO_AUDIT.md](./features/SEO_AUDIT.md) - SEO аудит
- [TODO.md](./features/TODO.md) - Задачи и планы

---

## 🚀 Быстрый старт

### Для Product Manager / Project Manager:
1. [architecture/README_ARCHITECTURE.md](./architecture/README_ARCHITECTURE.md) - Обзор системы
2. [guides/PLATFORM_CHECKLIST.md](./guides/PLATFORM_CHECKLIST.md) - Чеклист
3. [platform-plans/PLAN_ALBANIA_PLATFORM.md](./platform-plans/PLAN_ALBANIA_PLATFORM.md) - Пример плана

### Для Backend разработчика:
1. [architecture/MULTI_REPOSITORY_ARCHITECTURE.md](./architecture/MULTI_REPOSITORY_ARCHITECTURE.md)
2. [architecture/SCRIPTS_ARCHITECTURE.md](./architecture/SCRIPTS_ARCHITECTURE.md) 🔴 **ОБЯЗАТЕЛЬНО**
3. [guides/LOCAL_DEVELOPMENT.md](./guides/LOCAL_DEVELOPMENT.md)

### Для Frontend разработчика:
1. [architecture/MULTI_REPOSITORY_ARCHITECTURE.md](./architecture/MULTI_REPOSITORY_ARCHITECTURE.md)
2. [architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md](./architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md)
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
   - См. [architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md](./architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md)
   - Можно обойти временными решениями

---

## 📞 Поддержка

При возникновении вопросов:
1. Проверить документацию в соответствующей папке
2. Проверить [architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md](./architecture/ARCHITECTURE_IMPROVEMENTS_NEEDED.md)
3. Обратиться к команде разработки

---

**Последнее обновление:** 2026-01-16

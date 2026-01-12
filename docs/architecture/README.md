# Architecture Documentation

Документация по архитектуре PPCSL multi-platform системы.

## 📄 Документы

### ⭐ [README_ARCHITECTURE.md](./README_ARCHITECTURE.md)
**Entry point** - начни с этого документа для понимания общей архитектуры.

Содержит:
- Основная концепция multi-platform
- Обзор всей документации
- Критические проблемы и roadmap
- Порядок чтения документации

---

### 🏗️ [MULTI_REPOSITORY_ARCHITECTURE.md](./MULTI_REPOSITORY_ARCHITECTURE.md)
Архитектура мультирепозиториев (core + platform-repo).

Содержит:
- Как работает core + platform-repo
- Git submodules
- Процесс копирования файлов
- CI/CD workflow

---

### 🔴 [SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md) **КРИТИЧНО**
Архитектура скриптов генерации данных.

**⚠️ ВАЖНО:** Прочитать перед созданием новых платформ!

Содержит:
- Проблема: хардкодные данные в core
- Разделение на `common/` и `{country}/`
- План миграции
- Примеры для Албании

---

### ⚠️ [ARCHITECTURE_IMPROVEMENTS_NEEDED.md](./ARCHITECTURE_IMPROVEMENTS_NEEDED.md)
Известные проблемы архитектуры и план оптимизации.

Содержит:
- SEO keywords хардкоднуты в core
- Default metadata хардкоднуты
- OpenGraph тексты хардкоднуты
- PWA цвета хардкоднуты
- Решения для каждой проблемы

---

### 🔧 [TECHNICAL.md](./TECHNICAL.md)
Технические детали реализации.

Содержит:
- Стек технологий
- Структура проекта
- API endpoints
- Database schema

---

## 🗺️ Roadmap

### Приоритет 1 (блокирует новые платформы):
1. ✅ Assets - **РЕАЛИЗОВАНО**
2. 🔴 Скрипты - **ТРЕБУЕТ ВНИМАНИЯ** (см. SCRIPTS_ARCHITECTURE.md)

### Приоритет 2 (желательно):
3. ⚠️ Frontend хардкоды - **МОЖНО ОБОЙТИ** (см. ARCHITECTURE_IMPROVEMENTS_NEEDED.md)

---

[← Назад к общей документации](../)

# Архитектура Multi-Platform: Обзор документации

Этот документ является **entry point** для понимания архитектуры PPCSL multi-platform системы.

## 🎯 Основная концепция

**PPCSL (Platform-Portable Car Sales Logic)** - универсальное ядро для создания автомобильных маркетплейсов для разных стран.

**Принцип:** 
- **Core** = универсальная бизнес-логика (один для всех)
- **Platform-repo** = локализация (страна, язык, валюта, дизайн)

```
Macedonia Platform          Albania Platform           Future Platform
├── config/                ├── config/                ├── config/
├── locales/               ├── locales/               ├── locales/
├── theme/                 ├── theme/                 ├── theme/
├── assets/                ├── assets/                ├── assets/
├── scripts/mk/            ├── scripts/al/            ├── scripts/{country}/
└── core/ (submodule) ←────┴── core/ (submodule) ←────┴── core/ (submodule)
      ОДНО ЯДРО ДЛЯ ВСЕХ!
```

---

## 📚 Документация

### Для понимания системы (читать первым)

1. **[MULTI_REPOSITORY.md](./MULTI_REPOSITORY.md)**
   - Общая архитектура мультирепозиториев
   - Как работает core + platform-repo
   - Git submodules

### Для создания новых платформ

2. **[PLATFORM_CHECKLIST.md](./PLATFORM_CHECKLIST.md)** ⭐ **НАЧНИ ЗДЕСЬ**
   - Пошаговый чеклист для создания платформы
   - Все необходимые шаги
   - Команды и примеры

3. **[PLATFORM_GUIDE.md](./PLATFORM_GUIDE.md)**
   - Детальное руководство
   - Best practices
   - Примеры конфигурации

4. **[PLAN_ALBANIA_PLATFORM.md](./PLAN_ALBANIA_PLATFORM.md)**
   - Конкретный план для Албании
   - Пример реального проекта
   - Все специфичные детали

### Для разработчиков (важно!)

5. **[SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md)** 🔴 **КРИТИЧНО**
   - Архитектура скриптов генерации данных
   - Разделение на `common/` и `{country}/`
   - Как избежать конфликтов

6. **[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)** ⚠️ **ИЗВЕСТНЫЕ ПРОБЛЕМЫ**
   - Хардкодные данные в core
   - SEO keywords, metadata, OpenGraph
   - План оптимизации

### Для деплоя

7. **[DEPLOYMENT.md](./DEPLOYMENT.md)**
   - Инструкции по деплою на Render.com
   - Настройка CI/CD
   - Production checklist

8. **[LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)**
   - Локальная разработка
   - Настройка окружения
   - Отладка

---

## 🚨 Критические проблемы (требуют внимания)

### 1. 🔴 Скрипты генерации данных в core

**Проблема:** Скрипты с македонскими городами, описаниями находятся в core.

**Решение:** См. [SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md)

**Статус:** 📋 План создан, требует реализации

**Приоритет:** ВЫСОКИЙ (блокирует создание новых платформ)

---

### 2. ⚠️ Хардкодные данные в frontend

**Проблема:** SEO keywords, metadata, OpenGraph тексты хардкоднуты на македонском в core.

**Решение:** См. [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

**Статус:** 📋 План создан, можно работать с временными workarounds

**Приоритет:** СРЕДНИЙ (можно обойти, но усложняет поддержку)

---

## ✅ Уже реализовано

1. **Platform-specific configuration** (`config/site.ts`)
2. **Translations** (`locales/*.json`)
3. **Theme** (`theme/colors.ts`)
4. **Assets** (`assets/` - логотипы, иконки, watermark) ✨ **НОВОЕ**

---

## 🗺️ Roadmap для создания новой платформы

### Вариант A: Быстрый старт (с временными workarounds)

1. Создать platform-repo
2. Настроить config, locales, theme, assets
3. **Временно:** Скопировать и изменить скрипты вручную
4. **Временно:** Заменить хардкоды в core для платформы
5. Задеплоить

**Минусы:** Конфликты при обновлении core, не масштабируется

---

### Вариант B: Правильный подход (рекомендуется) ⭐

**Этап 1: Реорганизация скриптов**
1. Разделить скрипты на `common/` и `{country}/`
2. Переместить platform-specific скрипты из core в platform-repo
3. Обновить `prepare:build` и `.gitignore`
4. Протестировать на Macedonia

**Этап 2: Оптимизация frontend (опционально)**
1. Вынести SEO keywords в config/locales
2. Вынести metadata в locales
3. Вынести OpenGraph тексты
4. Протестировать

**Этап 3: Создание новой платформы**
1. Использовать [PLATFORM_CHECKLIST.md](./PLATFORM_CHECKLIST.md)
2. Всё легко и без конфликтов! 🎉

---

## 📖 Порядок чтения документации

### Для Product Manager / Project Manager:
1. Этот README
2. [PLATFORM_CHECKLIST.md](./PLATFORM_CHECKLIST.md)
3. [PLAN_ALBANIA_PLATFORM.md](./PLAN_ALBANIA_PLATFORM.md)

### Для Backend разработчика:
1. [MULTI_REPOSITORY.md](./MULTI_REPOSITORY.md)
2. [SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md) 🔴 **ОБЯЗАТЕЛЬНО**
3. [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md)
4. [LOCAL_DEVELOPMENT.md](../guides/LOCAL_DEVELOPMENT.md)

### Для Frontend разработчика:
1. [MULTI_REPOSITORY.md](./MULTI_REPOSITORY.md)
2. [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
3. [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md)

### Для DevOps:
1. [DEPLOYMENT.md](./DEPLOYMENT.md)
2. [PLATFORM_GUIDE.md](./PLATFORM_GUIDE.md)

---

## 🤝 Contributing

При внесении изменений в core:
1. ❌ **НЕ хардкодить** platform-specific данные
2. ✅ **Использовать** config, locales, theme
3. ✅ **Тестировать** на всех существующих платформах
4. ✅ **Документировать** изменения

---

## 📞 Поддержка

При возникновении вопросов:
1. Проверить документацию (см. выше)
2. Проверить [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) - может это известная проблема?
3. Обратиться к команде разработки

---

**Дата создания:** 2025-01-12  
**Последнее обновление:** 2026-01-16  
**Версия:** 1.0

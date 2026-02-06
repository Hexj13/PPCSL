# Архитектура Multi-Platform: Обзор документации

Этот документ является **entry point** для понимания архитектуры PPCSL multi-platform системы.

## 🎯 Основная концепция

**PPCSL (Platform-Portable Car Sales Logic)** - универсальное ядро для создания автомобильных маркетплейсов для разных стран.

**Принцип:** 
- **Core** = универсальная бизнес-логика (один для всех)
- **Platform-repo** = локализация (страна, язык, валюта, дизайн)

```
Moldova (kupito.club)              Future Platform
├── config/                        ├── config/
├── locales/                       ├── locales/
├── theme/                         ├── theme/
├── assets/                        ├── assets/
└── core/ (submodule) ←────────────┴── core/ (submodule)
  Конфиг платформы: core/backend/src/scripts/platforms/{country}/
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

2. **[PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md)** ⭐ **НАЧНИ ЗДЕСЬ**
   - Пошаговый чеклист для создания платформы
   - Все необходимые шаги
   - Команды и примеры

3. **[PLATFORM_GUIDE.md](./PLATFORM_GUIDE.md)**
   - Детальное руководство
   - Best practices
   - Примеры конфигурации

4. **[platform-plans/](./platform-plans/)** — планы платформ при добавлении новой страны (по образцу Moldova).

### Для разработчиков (важно!)

5. **[BACKEND_LAYERS.md](./BACKEND_LAYERS.md)** — слоистая архитектура бэкенда (Presentation → Application → Domain → Infrastructure), use cases, порты, структура модулей Listings/Auth.

6. **[SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md)** 🔴 **КРИТИЧНО**
   - Архитектура скриптов и конфигов платформ в core
   - Конфиги в `platforms/{country}/config.ts`
   - Запуск с переменной `COUNTRY`

7. **[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)** ⚠️ **ИЗВЕСТНЫЕ ПРОБЛЕМЫ**
   - Хардкодные данные в core
   - SEO keywords, metadata, OpenGraph
   - План оптимизации

### Для деплоя

8. **[DEPLOYMENT.md](../guides/DEPLOYMENT.md)**
   - Инструкции по деплою на Render.com
   - Настройка CI/CD
   - Production checklist

9. **[LOCAL_DEVELOPMENT.md](../guides/LOCAL_DEVELOPMENT.md)**
   - Локальная разработка
   - Настройка окружения
   - Отладка

---

## 🚨 Критические проблемы (требуют внимания)

### 1. ✅ Скрипты и конфиги платформ

**Реализовано:** Скрипты в core, данные платформы (города, описания, телефон) — в `core/backend/src/scripts/platforms/{country}/config.ts`. Переменная `COUNTRY` задаёт платформу.

**Документация:** [SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md)

---

### 2. ✅ SEO и метаданные

**Реализовано:** Ключи SEO, metadata, OpenGraph вынесены в локали платформы (`locales/*.json` → `metadata.*`) и в config.

**Детали:** [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)

---

## ✅ Уже реализовано

1. **Platform-specific configuration** (`config/site.ts`)
2. **Translations** (`locales/*.json`)
3. **Theme** (`theme/colors.ts`)
4. **Assets** (`assets/` - логотипы, иконки, watermark) ✨ **НОВОЕ**

---

## 🗺️ Roadmap для создания новой платформы

### Создание новой платформы

1. Создать platform-repo (config, locales, theme, assets).
2. Добавить в core конфиг платформы: `core/backend/src/scripts/platforms/{country}/config.ts` (города, описания, телефонный префикс и т.д.).
3. Зарегистрировать платформу в `platforms/index.ts` и в типе `Platform` в `script-guard.ts`.
4. Использовать [PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md).
5. Задеплоить с `NEXT_PUBLIC_COUNTRY={country}` и `COUNTRY={country}` для скриптов.

---

## 📖 Порядок чтения документации

### Для Product Manager / Project Manager:
1. Этот README
2. [PLATFORM_CHECKLIST.md](../guides/PLATFORM_CHECKLIST.md)
3. [platform-plans/](./platform-plans/) — при добавлении новой страны

### Для Backend разработчика:
1. [MULTI_REPOSITORY.md](./MULTI_REPOSITORY.md)
2. [BACKEND_LAYERS.md](./BACKEND_LAYERS.md) — слои и use cases
3. [SCRIPTS_ARCHITECTURE.md](./SCRIPTS_ARCHITECTURE.md) 🔴 **ОБЯЗАТЕЛЬНО**
4. [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md)
5. [LOCAL_DEVELOPMENT.md](../guides/LOCAL_DEVELOPMENT.md)

### Для Frontend разработчика:
1. [MULTI_REPOSITORY.md](./MULTI_REPOSITORY.md)
2. [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
3. [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md)

### Для DevOps:
1. [DEPLOYMENT.md](../guides/DEPLOYMENT.md)
2. [PLATFORM_GUIDE.md](../guides/PLATFORM_GUIDE.md)

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

**Последнее обновление:** 2026-01-29

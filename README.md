# PPCSL Core

**Platform-Portable Car Sales Logic** - универсальное ядро для создания автомобильных маркетплейсов.

## 🎯 Концепция

**Один Core** → **Множество платформ** (Молдова и др.)

- **Core** = бизнес-логика, компоненты, API (универсальные)
- **Platform-repo** = локализация (язык, валюта, дизайн, города)

---

## 📚 Documentation

Вся документация в папке **[`docs/`](./docs/)**:

### ⭐ Точки входа:

- **[docs/README.md](./docs/README.md)** - Главный entry point
- **[docs/guides/PLATFORM_CHECKLIST.md](./docs/guides/PLATFORM_CHECKLIST.md)** - Чеклист для новых платформ
- **[docs/architecture/ARCHITECTURE_OVERVIEW.md](./docs/architecture/ARCHITECTURE_OVERVIEW.md)** - Обзор архитектуры

### 📂 Категории:

- **[architecture/](./docs/architecture/)** - Архитектура системы
- **[guides/](./docs/guides/)** - Руководства для разработчиков
- **[platform-plans/](./docs/platform-plans/)** - Планы конкретных платформ
- **[features/](./docs/features/)** - Документация фич

---

## 🚀 Quick Start

```bash
# Install dependencies
npm run install:all

# Start Docker (PostgreSQL + Redis)
docker-compose up -d

# Run both frontend and backend
npm run dev
```

**Frontend:** http://localhost:3000  
**Backend:** http://localhost:4000

**Детальная документация:** [docs/guides/LOCAL_DEVELOPMENT.md](./docs/guides/LOCAL_DEVELOPMENT.md)

---

## 📁 Structure

```
PPCSL/
├── backend/          # NestJS API
│   ├── src/
│   │   ├── scripts/stage/       # Staging/dev scripts
│   │   ├── scripts/production/  # Production-safe scripts
│   │   ├── scripts/platforms/   # Platform configs (e.g. md/)
│   │   ├── brands/              # Бренды и модели
│   │   └── ...
│   └── docs/         # Backend-specific docs
├── frontend/         # Next.js frontend
│   ├── ui/           # Design system
│   └── docs/         # Frontend-specific docs
├── docs/             # 📚 Основная документация
└── docker-compose.yml
```

---

## 🛠️ Для разработчиков

### Backend:
- **[backend/docs/README.md](./backend/docs/README.md)** - Backend документация
- **[backend/docs/SCRIPTS.md](./backend/docs/SCRIPTS.md)** - Скрипты

### Frontend:
- **[frontend/docs/README.md](./frontend/docs/README.md)** - Frontend документация
- **[frontend/docs/DESIGN_SYSTEM.md](./frontend/docs/DESIGN_SYSTEM.md)** - Design system

### Создание платформ:
- **[docs/guides/PLATFORM_GUIDE.md](./docs/guides/PLATFORM_GUIDE.md)** - Полное руководство

---

## 🧪 Testing

```bash
# Backend unit tests (265 tests)
cd backend && npm test

# Backend integration tests (44 tests)
cd backend && npm run test:integration

# Frontend tests (136 tests)
cd frontend && npm test
```

**Документация:** [backend/docs/TESTING.md](./backend/docs/TESTING.md)

---

## 🚨 Важно

⚠️ **Перед созданием новых платформ** прочитайте:
- [docs/architecture/SCRIPTS_ARCHITECTURE.md](./docs/architecture/SCRIPTS_ARCHITECTURE.md) 🔴 **КРИТИЧНО**
- [docs/architecture/KNOWN_ISSUES.md](./docs/architecture/KNOWN_ISSUES.md)

---

**Stack:** Next.js 15, React 19, NestJS, PostgreSQL, Redis, TypeORM, TailwindCSS, Zustand

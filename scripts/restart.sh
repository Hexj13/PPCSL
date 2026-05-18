#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CORE_ROOT" || exit 1

echo "🛑 Останавливаем процессы..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:4000 | xargs kill -9 2>/dev/null
sleep 2

echo "📦 Проверяем зависимости..."
cd backend && npm install > /dev/null 2>&1
cd ../frontend && npm install > /dev/null 2>&1

echo "🗄️  Проверяем базу данных..."
cd "$CORE_ROOT" || exit 1
if docker compose version >/dev/null 2>&1; then
  docker compose up -d > /dev/null 2>&1
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d > /dev/null 2>&1
fi

echo "📁 Создаём папку для загрузок..."
mkdir -p backend/uploads

echo "🚀 Запускаем проект..."
npm run dev

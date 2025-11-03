#!/bin/bash

echo "🛑 Останавливаем процессы..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:4000 | xargs kill -9 2>/dev/null
sleep 2

echo "📦 Проверяем зависимости..."
cd backend && npm install > /dev/null 2>&1
cd ../frontend && npm install > /dev/null 2>&1

echo "🗄️  Проверяем базу данных..."
cd ..
docker-compose up -d > /dev/null 2>&1

echo "📁 Создаём папку для загрузок..."
mkdir -p backend/uploads

echo "🚀 Запускаем проект..."
npm run dev

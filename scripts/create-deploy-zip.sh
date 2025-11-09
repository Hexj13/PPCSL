#!/bin/bash

# Скрипт для создания ZIP архива для деплоя через File Manager

set -e

echo "🚀 Создание ZIP архива для деплоя..."

# Имя архива
ARCHIVE_NAME="kupito-deploy-$(date +%Y%m%d-%H%M%S).zip"
ARCHIVE_PATH="$(pwd)/$ARCHIVE_NAME"

# Переходим в корень проекта
cd "$(dirname "$0")/.."

echo "📦 Архивирование проекта (исключая node_modules, .git, .next, dist...)"

# Создаем ZIP, исключая ненужные файлы
zip -r "$ARCHIVE_PATH" . \
  -x "node_modules/*" \
  -x "frontend/node_modules/*" \
  -x "backend/node_modules/*" \
  -x ".git/*" \
  -x ".next/*" \
  -x "frontend/.next/*" \
  -x "dist/*" \
  -x "backend/dist/*" \
  -x "build/*" \
  -x "coverage/*" \
  -x "coverage-integration/*" \
  -x ".nyc_output/*" \
  -x "*.log" \
  -x "*.swp" \
  -x "*.swo" \
  -x "*~" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x ".env" \
  -x ".env.local" \
  -x ".env.*.local" \
  -x "backend/uploads/*" \
  -x "storybook-static/*" \
  -x "*.backup" \
  -x ".vscode/*" \
  -x ".idea/*" \
  -x "*.pdf" \
  > /dev/null 2>&1

if [ -f "$ARCHIVE_PATH" ]; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)
    echo "✅ Архив создан успешно!"
    echo "📁 Файл: $ARCHIVE_NAME"
    echo "📊 Размер: $ARCHIVE_SIZE"
    echo ""
    echo "📤 Следующие шаги:"
    echo "1. Откройте cPanel → File Manager"
    echo "2. Перейдите в public_html"
    echo "3. Загрузите файл: $ARCHIVE_NAME"
    echo "4. Распакуйте архив (правой кнопкой → Extract)"
else
    echo "❌ Ошибка при создании архива"
    exit 1
fi


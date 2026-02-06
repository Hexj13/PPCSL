#!/bin/bash

set -e

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-kupito}"
DB_NAME="${DB_NAME:-kupito}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="kupito_backup_${TIMESTAMP}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

echo "📦 Starting database backup..."
echo "   Database: ${DB_NAME}"
echo "   Host: ${DB_HOST}:${DB_PORT}"
echo "   Output: ${FILEPATH}"

if [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  Warning: DB_PASSWORD not set, will prompt for password"
else
    export PGPASSWORD="$DB_PASSWORD"
fi

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" \
    -F c -Z 9 \
    -f "$FILEPATH" \
    || {
    echo "❌ Backup failed!"
    exit 1
}

SIZE=$(du -h "$FILEPATH" | cut -f1)
echo "✅ Backup completed successfully!"
echo "   File: ${FILEPATH}"
echo "   Size: ${SIZE}"

if [ "$KEEP_DAYS" -gt 0 ]; then
    echo "🧹 Cleaning up old backups (keeping last ${KEEP_DAYS} days)..."
    find "$BACKUP_DIR" -name "kupito_backup_*.sql.gz" -type f -mtime +${KEEP_DAYS} -delete
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "kupito_backup_*.sql.gz" -type f -mtime +${KEEP_DAYS} 2>/dev/null | wc -l)
    if [ "$DELETED_COUNT" -gt 0 ]; then
        echo "   Cleaned up old backups"
    fi
fi

echo "🎉 Done!"


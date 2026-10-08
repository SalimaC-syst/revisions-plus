#!/usr/bin/env bash
# Sauvegarde de la base et des documents importés.
# Usage : npm run backup  (à planifier chaque nuit, ex. cron 0 2 * * *)
# Conserver une copie hors du serveur (stockage UE) et tester la restauration chaque trimestre.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${DATABASE_URL:?DATABASE_URL manquant}"
DEST="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
STAMP="$(date +%Y-%m-%d_%H%M)"
mkdir -p "$DEST"
pg_dump --format=custom --no-owner "${DATABASE_URL%%\?*}" > "$DEST/base_$STAMP.dump"
tar -czf "$DEST/documents_$STAMP.tar.gz" -C "${STORAGE_DIR:-./storage}" . 2>/dev/null || tar -czf "$DEST/documents_$STAMP.tar.gz" --files-from /dev/null
find "$DEST" -type f -mtime +"$KEEP_DAYS" -delete
echo "Sauvegarde terminée : $DEST/base_$STAMP.dump et documents_$STAMP.tar.gz"

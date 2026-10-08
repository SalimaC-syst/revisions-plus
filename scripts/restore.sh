#!/usr/bin/env bash
# Restauration : bash scripts/restore.sh backups/base_AAAA-MM-JJ_HHMM.dump [backups/documents_….tar.gz]
# ATTENTION : remplace le contenu de la base désignée par DATABASE_URL. À faire d'abord en préproduction.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a
: "${DATABASE_URL:?DATABASE_URL manquant}"
DUMP="${1:?fichier .dump à restaurer}"
read -r -p "Restaurer $DUMP dans ${DATABASE_URL%%@*}@… ? Tapez RESTAURER : " ok
[ "$ok" = "RESTAURER" ] || { echo "Annulé."; exit 1; }
pg_restore --clean --if-exists --no-owner -d "${DATABASE_URL%%\?*}" "$DUMP"
if [ -n "${2:-}" ]; then mkdir -p "${STORAGE_DIR:-./storage}"; tar -xzf "$2" -C "${STORAGE_DIR:-./storage}"; fi
echo "Restauration terminée."

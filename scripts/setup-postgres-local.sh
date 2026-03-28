#!/usr/bin/env bash
set -euo pipefail

# Bootstrap local PostgreSQL role/database for diploma backend.
# Uses admin connection (typically local postgres superuser).

APP_DB_NAME="${APP_DB_NAME:-diploma}"
APP_DB_USER="${APP_DB_USER:-diploma_user}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-12345678}"
APP_DB_HOST="${APP_DB_HOST:-localhost}"
APP_DB_PORT="${APP_DB_PORT:-5432}"

POSTGRES_ADMIN_DB="${POSTGRES_ADMIN_DB:-postgres}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"
POSTGRES_ADMIN_HOST="${POSTGRES_ADMIN_HOST:-localhost}"
POSTGRES_ADMIN_PORT="${POSTGRES_ADMIN_PORT:-5432}"

if ! command -v psql >/dev/null 2>&1; then
  echo "[setup-postgres-local] psql не найден. Установи PostgreSQL client/server и повтори." >&2
  exit 1
fi

PSQL_ADMIN=(
  psql
  -v ON_ERROR_STOP=1
  -h "$POSTGRES_ADMIN_HOST"
  -p "$POSTGRES_ADMIN_PORT"
  -U "$POSTGRES_ADMIN_USER"
  -d "$POSTGRES_ADMIN_DB"
)

APP_DB_NAME_SQL=${APP_DB_NAME//\'/\'\'}
APP_DB_USER_SQL=${APP_DB_USER//\'/\'\'}
APP_DB_PASSWORD_SQL=${APP_DB_PASSWORD//\'/\'\'}

"${PSQL_ADMIN[@]}" <<SQL
DO
\$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_USER_SQL}') THEN
    CREATE ROLE "${APP_DB_USER}" LOGIN PASSWORD '${APP_DB_PASSWORD_SQL}';
  ELSE
    ALTER ROLE "${APP_DB_USER}" WITH LOGIN PASSWORD '${APP_DB_PASSWORD_SQL}';
  END IF;
END
\$\$;
SQL

DB_EXISTS=$("${PSQL_ADMIN[@]}" -Atc "SELECT 1 FROM pg_database WHERE datname='${APP_DB_NAME_SQL}' LIMIT 1;")
if [[ "$DB_EXISTS" != "1" ]]; then
  "${PSQL_ADMIN[@]}" -c "CREATE DATABASE \"${APP_DB_NAME}\" OWNER \"${APP_DB_USER}\";"
else
  "${PSQL_ADMIN[@]}" -c "ALTER DATABASE \"${APP_DB_NAME}\" OWNER TO \"${APP_DB_USER}\";"
fi

"${PSQL_ADMIN[@]}" -c "GRANT ALL PRIVILEGES ON DATABASE \"${APP_DB_NAME}\" TO \"${APP_DB_USER}\";"

echo "[setup-postgres-local] Готово."
echo "DATABASE_URL=postgresql://${APP_DB_USER}:${APP_DB_PASSWORD}@${APP_DB_HOST}:${APP_DB_PORT}/${APP_DB_NAME}"

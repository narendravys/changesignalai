#!/bin/sh
set -e
# Run migrations when RUN_MIGRATIONS is not set or is 1 (default: run)
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[entrypoint] Running database migrations..."
  python -m alembic upgrade head || {
    echo "[entrypoint] Migration failed (database may not be ready yet). Continuing anyway."
  }
fi
echo "[entrypoint] Starting application: $*"
exec "$@"

#!/bin/bash
set -e
echo ">>> Waiting for PostgreSQL..."
until pg_isready -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 1
done
echo ">>> Running migrations..."
alembic upgrade head
echo ">>> Seeding database..."
python -m app.seed
echo ">>> Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2

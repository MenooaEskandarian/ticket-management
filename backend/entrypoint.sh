#!/bin/sh
set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

if [ "${SEED_DEMO_DATA}" = "true" ]; then
  echo "Seeding demo data..."
  python manage.py seed_demo
fi

# Served over ASGI: the event streams in apps.realtime hold a connection open
# for as long as a browser stays on the page, which a sync worker cannot do
# without taking itself out of service for the duration.
exec gunicorn config.asgi:application \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

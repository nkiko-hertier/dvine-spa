#!/bin/sh
set -e

# ──────────────────────────────────────────────────────────────
# D'Vine Spa API — container entrypoint
#
# Responsibilities (in order):
#   1. Wait for Postgres to accept connections
#   2. Run SQL migrations exactly once (idempotency guard)
#   3. Baseline Prisma's migration history (also idempotent)
#   4. Hand off to the Node.js server
# ──────────────────────────────────────────────────────────────

echo "⏳ Waiting for Postgres to be ready..."
until psql "$DATABASE_URL" -c '\q' > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Postgres is ready."

# ── Idempotency guard ─────────────────────────────────────────
# Check whether our baseline table already exists.
# If it does, the SQL migrations have already run — skip them.
TABLES_EXIST=$(psql "$DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM information_schema.tables \
   WHERE table_schema='public' AND table_name='booking_requests';" 2>/dev/null || echo "0")

if [ "$TABLES_EXIST" = "0" ]; then
  echo "📦 Applying SQL migrations..."
  psql "$DATABASE_URL" -f sql/001_base_schema.sql
  psql "$DATABASE_URL" -f sql/002_clerk_integration_and_fixes.sql
  psql "$DATABASE_URL" -f sql/003_realtime_notifications.sql
  echo "✅ Migrations applied."

  # Baseline Prisma's own migration history so `prisma migrate dev`
  # doesn't try to re-run 0_init on a schema that already exists.
  echo "📌 Baselining Prisma migration history..."
  npx prisma migrate resolve --applied 0_init 2>/dev/null || true
  echo "✅ Prisma baseline done."
else
  echo "✅ Schema already exists — skipping migrations."
fi

echo "🚀 Starting D'Vine Spa API on port ${PORT:-4444}..."
exec node dist/index.js

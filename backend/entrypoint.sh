#!/bin/sh

# ============================================================================
# Docker Entrypoint Script for D'Vine SPA Backend
# ============================================================================
# This script:
# 1. Waits for PostgreSQL to be ready
# 2. Runs Prisma migrations (if needed)
# 3. Optionally seeds the database
# 4. Starts the application

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Configuration
# ============================================================================
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_USER=${POSTGRES_USER:-postgres}
DB_NAME=${POSTGRES_DB:-dvine_spa}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres_dev_password}
MAX_ATTEMPTS=30
ATTEMPT=0

# ============================================================================
# Wait for PostgreSQL to be ready
# ============================================================================
echo "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
    echo "${GREEN}✓ PostgreSQL is ready!${NC}"
    break
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS: Waiting for PostgreSQL..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "${RED}✗ Failed to connect to PostgreSQL after ${MAX_ATTEMPTS} attempts${NC}"
  exit 1
fi

# ============================================================================
# Run Prisma Migrations (if DATABASE_URL is set)
# ============================================================================
if [ -n "$DATABASE_URL" ]; then
  echo "${YELLOW}Running Prisma migrations...${NC}"
  
  # Check if migrations exist and run them
  if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
    npx prisma migrate deploy
    echo "${GREEN}✓ Migrations completed${NC}"
  else
    echo "${YELLOW}No migrations found, skipping migration deployment${NC}"
  fi
  
  # Optional: Seed database if seed file exists
  # Uncomment below to enable automatic seeding
  # echo "${YELLOW}Seeding database...${NC}"
  # npx prisma db seed
  # echo "${GREEN}✓ Database seeded${NC}"
else
  echo "${YELLOW}DATABASE_URL not set, skipping migrations${NC}"
fi

# ============================================================================
# Start the Application
# ============================================================================
echo "${GREEN}Starting D'Vine SPA Backend...${NC}"
echo "  Environment: ${NODE_ENV:-development}"
echo "  Port: ${PORT:-4000}"
echo "  Database: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo ""

exec node dist/index.js

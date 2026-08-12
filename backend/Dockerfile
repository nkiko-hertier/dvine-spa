# ─────────────────────────────────────────────────────────────
# Stage 1 — Builder
# Install all deps (dev included), compile TypeScript, generate
# the Prisma client. Nothing from this stage hits production.
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests + Prisma schema first so layer-caching works
# (only rebuilds when these files change, not when src/ changes)
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Full install — dev deps needed for tsc + prisma generate (postinstall)
RUN npm ci

# Copy source and compile
COPY src ./src/
COPY tsconfig.json ./

RUN npm run build


# ─────────────────────────────────────────────────────────────
# Stage 2 — Production runner
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# postgresql-client gives us psql (for migrations) and pg_isready
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Production deps only — skip postinstall because prisma CLI
# isn't here; we'll copy the generated client from builder instead
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev --ignore-scripts

# Copy the Prisma-generated client (native binaries + JS types)
# from the builder — avoids needing the prisma CLI at runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled JS output
COPY --from=builder /app/dist ./dist/

# Copy raw SQL migration files (applied once by entrypoint.sh)
COPY sql ./sql/

# Copy and wire up the entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 4444

ENTRYPOINT ["./entrypoint.sh"]

# ============================================================================
# Builder Stage - Build application and generate Prisma client
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm run db:generate

# Build TypeScript
RUN pnpm run build

# ============================================================================
# Runtime Stage - Lean production image
# ============================================================================
FROM node:22-alpine

WORKDIR /app

# Install pnpm globally and dumb-init for proper signal handling
RUN npm install -g pnpm && \
    apk add --no-cache dumb-init postgresql-client

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile && \
    pnpm run db:generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma files for runtime use
COPY prisma ./prisma

# Copy entrypoint script
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose port (default 4000)
EXPOSE 4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["./entrypoint.sh"]

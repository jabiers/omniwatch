# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy package.json files for all workspace packages
COPY apps/cli/package.json apps/cli/package.json
COPY apps/daemon/package.json apps/daemon/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json

# Install dependencies (with native build tools for better-sqlite3)
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile

# Copy source files
COPY packages/ packages/
COPY apps/daemon/ apps/daemon/
COPY apps/api/ apps/api/
COPY apps/cli/ apps/cli/

# Build all packages except @omniwatch/web
RUN npx turbo build --filter='!@omniwatch/web'

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache libstdc++

# Copy built artifacts and dependencies
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules

# Copy packages
COPY --from=builder /app/packages/shared/package.json packages/shared/package.json
COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/shared/node_modules packages/shared/node_modules

COPY --from=builder /app/packages/db/package.json packages/db/package.json
COPY --from=builder /app/packages/db/dist packages/db/dist
COPY --from=builder /app/packages/db/node_modules packages/db/node_modules

# Copy daemon
COPY --from=builder /app/apps/daemon/package.json apps/daemon/package.json
COPY --from=builder /app/apps/daemon/dist apps/daemon/dist
COPY --from=builder /app/apps/daemon/node_modules apps/daemon/node_modules

# Copy api
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 3456

VOLUME /data

ENV NODE_ENV=production
ENV OMNI_DATA_DIR=/data

CMD ["node", "apps/api/dist/index.js"]

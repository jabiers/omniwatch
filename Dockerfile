FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.2 --activate
WORKDIR /app

FROM base AS builder
# Install deps for native modules
RUN apk add --no-cache python3 make g++
COPY . .
RUN pnpm install --frozen-lockfile
RUN npx turbo build

FROM base AS web
RUN apk add --no-cache libstdc++
WORKDIR /app
# Copy Next.js standalone output (includes server + all dependencies)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
# Copy custom server for WebSocket support
COPY --from=builder /app/apps/web/server.custom.mjs ./apps/web/
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3457
ENV OMNI_DATA_DIR=/data
VOLUME /data
EXPOSE 3457
CMD ["node", "apps/web/server.custom.mjs"]

# Legacy: standalone API server (for backward compatibility)
FROM base AS api
RUN apk add --no-cache libstdc++
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
ENV OMNI_DATA_DIR=/data
VOLUME /data
EXPOSE 3456
CMD ["node", "apps/api/dist/index.js"]

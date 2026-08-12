# Optional Dockerfile — Railway uses Nixpacks by default, but this is
# provided for 1-click Docker deploys and local containerization.
# We run a CUSTOM server (server.js) for Socket.io, so we ship the full
# .next build + node_modules (no "standalone" output).

FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Drop dev dependencies to shrink the runtime image / memory footprint.
RUN npm prune --production

FROM node:18-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=460"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/server.js ./server.js

EXPOSE 3000
CMD ["node", "server.js"]

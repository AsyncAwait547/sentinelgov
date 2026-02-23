# ═══════════════════════════════════════════════════════════════
# SentinelGov — Production Multi-Stage Dockerfile
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Build the Vite Frontend ─────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production Runtime ──────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets
COPY --from=builder /app/dist ./dist

# Copy server code
COPY server/ ./server/

# Copy .env.example as reference (actual .env mounted at runtime)
COPY .env.example ./.env.example

EXPOSE 3001

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Production entrypoint — serve static files + WebSocket backend
CMD ["node", "server/index.js"]

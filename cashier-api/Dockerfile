# =========================================================================
# Cashier API — multi-stage Docker build
# Small, cache-friendly, non-root runtime.
# =========================================================================

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root user (§6).
RUN addgroup -S app && adduser -S app -G app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

USER app
EXPOSE 4000

# Liveness handled by orchestrator hitting /health.
CMD ["node", "dist/main.js"]

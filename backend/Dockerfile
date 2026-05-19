# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
RUN nest build

# ─── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files and install only production deps
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/campaigns/stats || exit 1

CMD ["node", "dist/src/main.js"]

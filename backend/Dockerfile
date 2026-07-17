# ProfilePays backend — build from the repository root (npm workspace):
#   docker build -f backend/Dockerfile .

# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# The lockfile lives at the workspace root; install the whole workspace once
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --ignore-scripts

COPY backend/tsconfig.json backend/tsconfig.build.json backend/nest-cli.json ./backend/
COPY backend/src ./backend/src
RUN npm run build --workspace backend

# ─── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --ignore-scripts --omit=dev --workspace backend && npm cache clean --force

COPY --from=builder /app/backend/dist ./backend/dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3000

# Health check against the public campaign listing (no auth required)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/v1/campaigns').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/main.js"]

# ProfilePays frontend — build from the repository root (npm workspace):
#   docker build -f frontend/Dockerfile --build-arg VITE_API_URL=/api/v1 .

# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Default to the same-origin /api proxy served by nginx (see nginx.conf)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

# The lockfile lives at the workspace root; install the whole workspace once.
# The Windows-generated lockfile omits foreign-platform optional binaries
# (npm/cli#4828), so rolldown's Linux binding is installed explicitly at the
# exact rolldown version from the lockfile.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --ignore-scripts \
  && npm install --no-save --ignore-scripts \
    @rolldown/binding-linux-x64-musl@"$(node -p "require('rolldown/package.json').version")"

COPY frontend ./frontend
RUN npm run build --workspace frontend

# ─── Stage 2: Production (Nginx) ───────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]

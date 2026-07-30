FROM node:24-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --ignore-scripts

COPY backend backend
RUN npm run build:backend

FROM node:24-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache curl
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace backend

COPY --from=builder /app/backend/dist backend/dist
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/campaigns/stats || exit 1

CMD ["node", "backend/dist/src/main.js"]

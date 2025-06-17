# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY frontend/package.json ./
# If package-lock.json is available, npm ci is preferred
# COPY frontend/package-lock.json ./

# Install frontend dependencies
# Using npm install as package-lock.json might not be available in the agent's view of the repo
RUN npm install
# If you are sure package-lock.json exists and is up-to-date, uncomment next line and comment out npm install
# RUN npm ci --only=production

# Copy the rest of the frontend source code
COPY frontend/ ./

# Build the frontend
# Common scripts are build or build:prod
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy package.json and package-lock.json
COPY backend/package.json ./
# If package-lock.json is available, npm ci is preferred
# COPY backend/package-lock.json ./

# Install backend dependencies
RUN npm install
# If you are sure package-lock.json exists and is up-to-date, uncomment next line and comment out npm install
# RUN npm ci --only=production


# Copy the rest of the backend source code
COPY backend/ ./

# Build the backend (e.g., compile TypeScript)
# Common scripts are build or build:prod
RUN npm run build

# Stage 3: Final Production Image
FROM node:20-alpine

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Copy built backend (including node_modules if they were part of the build, or reinstall production deps)
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package.json ./backend/package.json
# COPY --from=backend-builder /app/backend/package-lock.json ./backend/package-lock.json # If using npm ci

# Install production backend dependencies
# This ensures only production dependencies are in the final image and matches the built code
WORKDIR /app/backend
RUN npm install --only=production
# If using npm ci and package-lock.json was copied:
# RUN npm ci --only=production

# Copy built frontend assets from the frontend-builder stage
# Assuming backend will serve static files from a 'public' or 'static' directory
# Adjust the destination path as needed by your backend server configuration
WORKDIR /app
COPY --from=frontend-builder /app/frontend/build ./public

# Expose the port the backend runs on
EXPOSE 3000

# Change to non-root user
USER appuser

# Command to run the backend application
# Adjust if your entry point is different (e.g., server.js, app.js)
CMD ["node", "backend/dist/main.js"]

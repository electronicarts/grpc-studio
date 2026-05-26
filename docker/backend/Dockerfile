# gRPC Studio Backend - Production Docker Image
# Multi-stage build for Node.js backend with strict configuration requirements

# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy workspace root + shared + backend package files for install
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all workspace dependencies. Shared source is present because npm
# workspaces run the shared prepare script during install.
RUN npm ci --ignore-scripts --no-audit --no-fund

# Build shared package
RUN cd shared && npm run build

# Copy backend source
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

# Build backend
RUN cd backend && npm run build

# Keep only production dependencies for the runtime image
RUN npm prune --omit=dev --ignore-scripts && npm cache clean --force

# Production stage
FROM node:22-alpine AS production

# Install security updates and required tools
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    dumb-init \
    openssl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S grpcstudio -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies and compiled workspaces from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Create config directory that will be mounted externally
RUN mkdir -p /config && \
    chown -R grpcstudio:nodejs /config

# Change ownership of app directory
RUN chown -R grpcstudio:nodejs /app

# Switch to non-root user
USER grpcstudio

# Expose the port (configurable via mounted config)
EXPOSE 3001

# Health check that validates both service and config availability
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Set environment variable to point to mounted config
ENV GRPC_STUDIO_CONFIG=/config/backend.yaml

# Use dumb-init as PID 1 to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "backend/dist/server/httpServer.js"]

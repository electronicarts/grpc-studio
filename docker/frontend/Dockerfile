# Frontend Dockerfile for gRPC Studio
# Requires config/frontend.yaml to be provided - NO DEFAULTS
# Designed for Kubernetes ConfigMap integration

# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy workspace package files for a lockfile-backed install
COPY package.json package-lock.json ./
COPY shared/package.json ./shared/
COPY shared/src ./shared/src
COPY shared/tsconfig.json ./shared/
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install all dependencies. Shared source is present because npm workspaces run
# the shared prepare script during install.
RUN npm ci --ignore-scripts --no-audit --no-fund

# Build shared workspace before building the frontend
RUN cd shared && npm run build

# Copy frontend source code (excluding node_modules)
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/index.html ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend/tailwind.config.js ./frontend/
COPY frontend/postcss.config.js ./frontend/
COPY frontend/.eslintrc.cjs ./frontend/

# Build the application
RUN cd frontend && npm run build

# Production stage
FROM nginx:alpine AS production

# Install security updates and curl for health checks
RUN apk update && apk upgrade && apk add --no-cache curl

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built application from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf.template

# Create required directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp /tmp && \
    chmod -R 755 /usr/share/nginx/html /var/cache/nginx /tmp

# Create config directory for external mount
RUN mkdir -p /usr/share/nginx/html/config

# Backend URL - just host:port, NO http:// prefix
# The http:// is added in nginx.conf proxy_pass directives
ENV BACKEND_URL=localhost:3001

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Substitute BACKEND_URL in nginx config and start
CMD ["sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]

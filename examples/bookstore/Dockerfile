# BookStore example gRPC server — for testing gRPC Studio against a
# reflection-enabled service that exercises the full proto3 feature set.

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY proto ./proto
COPY src ./src

RUN addgroup -g 1001 -S nodejs && \
    adduser -S bookstore -u 1001 && \
    chown -R bookstore:nodejs /app
USER bookstore

EXPOSE 50052

CMD ["node", "src/server.js"]

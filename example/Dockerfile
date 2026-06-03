# PetStore example gRPC server — for testing gRPC Studio against a
# reflection-enabled service that exercises the full proto3 feature set.

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY proto ./proto
COPY src ./src

RUN addgroup -g 1001 -S nodejs && \
    adduser -S petstore -u 1001 && \
    chown -R petstore:nodejs /app
USER petstore

EXPOSE 50051

CMD ["node", "src/server.js"]

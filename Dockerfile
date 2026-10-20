# syntax=docker/dockerfile:1

# Stage 1: Build the frontend
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependency specifications and install
COPY package.json ./
RUN npm install

# Copy source code and build
COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy built frontend assets and pure Node.js server
COPY package.json ./
COPY server.js ./
COPY --from=builder /app/dist ./dist

# Non-root user for security
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["node", "server.js"]

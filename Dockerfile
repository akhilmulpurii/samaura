# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install git if needed
RUN apk add --no-cache git

# Copy dependency files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the Vite app
RUN yarn build

# -----------------------------
# Stage 2: Runner (Production)
# -----------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install a static server to serve build files
RUN yarn global add serve

# Copy the built files from builder
COPY --from=builder /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

# Serve the static files on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
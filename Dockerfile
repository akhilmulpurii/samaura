# -----------------------------
# Stage 1: Builder
# -----------------------------
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package.json yarn.lock ./

# Install git for fetching dependencies
RUN apk add --no-cache git

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the Next.js app
RUN yarn build

# -----------------------------
# Stage 2: Runner (Production)
# -----------------------------
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy necessary build artifacts from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json

# Change ownership
RUN chown -R nextjs:nodejs /app

# Use non-root user
USER nextjs

# Expose the app port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck for Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start the app
CMD ["node", "server.js"]
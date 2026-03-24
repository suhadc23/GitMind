# ─── Stage 1: Install ALL dependencies (including devDeps for build) ───────────
FROM node:20-alpine AS deps

# openssl is required by Prisma client
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci


# ─── Stage 2: Build the Next.js application ────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full source
COPY . .

# Generate Prisma client (no real DB needed — just reads schema.prisma)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ─── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install only production dependencies in a clean layer
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Re-generate Prisma client in this clean node_modules
COPY prisma ./prisma
RUN npx prisma generate

# Copy built Next.js output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/postcss.config.cjs ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]

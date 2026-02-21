FROM node:20-alpine AS builder

WORKDIR /app

# Build React frontend
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/client/dist ./client/dist
COPY server.js ./
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY db/ ./db/
COPY migrations/ ./migrations/
COPY seeds/ ./seeds/
COPY scripts/ ./scripts/

EXPOSE 3000

# Run migrations then start server
CMD node scripts/migrate.js && node server.js

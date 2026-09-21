# ═══════════════════════════════════════════════════════
#  Cloth Market — Server Dockerfile
#  Builds a minimal production image for the API server.
#  Usage:
#    docker build -t cloth-market-api .
#    docker run -p 5002:5002 --env-file server/.env cloth-market-api
# ═══════════════════════════════════════════════════════

FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy only server package files first (better layer caching)
COPY server/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy server source code
COPY server/src ./src

# Expose API port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5002/api/health || exit 1

# Start server
CMD ["node", "src/index.js"]

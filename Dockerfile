FROM node:22-alpine AS build
WORKDIR /app

COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY frontend frontend
RUN cd frontend && npm run build

COPY server/package*.json server/
RUN cd server && npm ci
COPY server server
RUN cd server && npm run build

# Production dependencies. Build tools are only a fallback for better-sqlite3 when no
# prebuilt binary matches the platform; they don't end up in the runtime image.
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY --from=deps /app/server/node_modules ./server/node_modules
COPY server/package.json ./server/
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/frontend/dist ./frontend/dist

# A fresh named volume inherits this directory's ownership, so the node user can write the DBs.
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 8787
CMD ["node", "server/dist/index.js"]

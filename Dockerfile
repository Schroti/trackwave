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

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/frontend/dist ./frontend/dist

EXPOSE 8787
CMD ["node", "server/dist/index.js"]

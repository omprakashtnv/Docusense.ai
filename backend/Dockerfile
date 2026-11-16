FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend backend
RUN npm run build --workspace backend

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/uploads

WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/backend/eng.traineddata backend/eng.traineddata
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
WORKDIR /app/backend
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]

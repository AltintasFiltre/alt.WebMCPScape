# syntax=docker/dockerfile:1
# 1. Aşama: Frontend Derleme (Mac ARM64 üzerinde emülasyonsuz, yerel hızda çalışır)
FROM --platform=$BUILDPLATFORM node:20-slim AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY client/ ./
RUN npm run build

# 2. Aşama: Backend ve Çalışma Zamanı (Sadece Chromium içeren hafif imaj)
FROM node:20-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 1) Önce sadece package.json kopyala ve bağımlılık + Chromium kur
# Hem Docker Layer Cache hem de BuildKit npm/apt önbelleği kullanılır.
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    npm ci --omit=dev && \
    npx playwright install --with-deps chromium

# 2) Uygulama kodlarını ve frontend çıktısını en son kopyala (Hızlı katman)
COPY . .
COPY --from=frontend-builder /app/client/dist ./client/dist

# Uygulama portları (Backend: 4002)
EXPOSE 4002

# Kalıcı JSON verileri için volume tanımı
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Uygulamayı başlat
CMD ["node", "server.js"]

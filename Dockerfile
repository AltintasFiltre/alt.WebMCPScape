# 1. Aşama: Frontend Derleme
FROM node:20-slim AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# 2. Aşama: Backend ve Çalışma Zamanı
FROM mcr.microsoft.com/playwright:v1.42.1-jammy
WORKDIR /app

# Sistem bağımlılıklarını ve Node.js'i kur (mcr imajında node zaten var)
ENV NODE_ENV=production

# Backend bağımlılıklarını kopyala ve kur
COPY package*.json ./
RUN npm install --production

# Uygulama dosyalarını kopyala
COPY . .

# Frontend derlemesini kopyala
COPY --from=frontend-builder /app/client/dist ./client/dist

# Playwright tarayıcılarını kur (scraper için gerekli)
RUN npx playwright install chromium

# Uygulama portları (Backend: 4002)
EXPOSE 4002

# Uygulamayı başlat
CMD ["node", "server.js"]

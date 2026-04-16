# WebMCPScape - Akıllı Web Scraper Platformu

WebMCPScape, otomotiv ve endüstriyel filtre sitelerinden (Donaldson, Fleetguard, Mann-Hummel vb.) otomatik olarak teknik verileri (uyumluluk, OEM numaraları, teknik özellikler) çeken, Playwright tabanlı modern bir web scraping uygulamasıdır.

## 🚀 Öne Çıkan Özellikler

- **Çoklu Site Desteği:** Donaldson, Fleetguard, Mann-Hummel ve daha fazlası için önceden tanımlanmış özel kazıma (scraping) snippet'leri.
- **Otomatik Veri Çekme:** URL bazlı teknik özellik ve çapraz referans verisi toplama.
- **Modern UI:** React ve Tailwind CSS ile güçlendirilmiş, kullanıcı dostu arayüz.
- **Güçlü Backend:** Express.js ve Playwright MCP kullanılarak oluşturulmuş yüksek performanslı API.
- **Docker Desteği:** Kolay dağıtım ve taşınabilirlik için konteyner yapısı.

## 🛠️ Teknik Yığın (Tech Stack)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS, Lucide React (ikonlar)
- **State Management:** React Hooks

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Scraping:** Playwright, @playwright/mcp
- **Helper Libraries:** CORS, Path

### DevOps & Diğer
- **Docker:** Multi-stage build (Node 20 + Playwright)
- **Package Manager:** NPM

## 📂 Proje Yapısı

```text
├── client/              # React frontend uygulaması
│   ├── src/             # Frontend kaynak kodları
│   └── dist/            # Derlenmiş frontend dosyaları
├── Snippets/            # Site bazlı özel scraping kodları
├── Dockerfile           # Konteyner yapılandırması
├── scraper.js           # Core scraping mantığı
├── server.js            # Express API sunucusu
└── package.json         # Bağımlılıklar ve script'ler
```

## 📦 Kurulum ve Çalıştırma

### Yerel Geliştirme (Local Development)

1.  **Bağımlılıkları Kurun:**
    ```bash
    npm install
    cd client && npm install
    cd ..
    ```

2.  **Uygulamayı Başlatın (Backend + Frontend aynı anda):**
    ```bash
    npm run dev
    ```
    - UI: `http://localhost:4002` (veya Vite dev portu: 5173)
    - API: `http://localhost:4002/api/scrape`

### Docker ile Çalıştırma

1.  **Docker İmajını Oluşturun:**
    ```bash
    docker build -t webmcpscape .
    ```

2.  **Konteyneri Başlatın:**
    ```bash
    docker run -p 4002:4002 webmcpscape
    ```
    Uygulama `http://localhost:4002` adresinde yayında olacaktır.

## 📝 Kullanım

Arayüze giriş yaptıktan sonra, desteklenen sitelerden (örneğin bir Donaldson ürün sayfası) bir URL yapıştırın ve "Veri Çek" butonuna tıklayın. Uygulama ilgili snippet'i kullanarak verileri json formatında size sunacaktır.

---
Geliştiren: **Serdar**

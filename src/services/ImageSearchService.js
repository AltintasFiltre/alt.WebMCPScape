const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const IMAGES_CACHE_DIR = path.join(DATA_DIR, 'images');

/**
 * ImageSearchService
 * 
 * Filtre ve OEM kodlarına ait ürün görsellerini arar ve yerel JSON önbelleğinde saklar.
 */
class ImageSearchService {
  constructor() {
    this.initCache();
  }

  initCache() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(IMAGES_CACHE_DIR)) {
        fs.mkdirSync(IMAGES_CACHE_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('ImageSearchService cache init error:', e.message);
    }
  }

  getCacheKey(query) {
    return crypto.createHash('md5').update(String(query || '').trim().toUpperCase()).digest('hex');
  }

  /**
   * Belirtilen arama sorgusu için ürün görsellerini arar (önbellek destekli)
   * @param {string} brand - Üretici Adı
   * @param {string} oem - OEM / Filtre Kodu
   * @param {number} [limit=6] - Maksimum görsel sayısı
   */
  async searchImages(brand = '', oem = '', limit = 6) {
    const rawQuery = `${brand} ${oem} filter`.trim();
    if (!rawQuery) return [];

    const cacheKey = this.getCacheKey(rawQuery);
    const cacheFile = path.join(IMAGES_CACHE_DIR, `${cacheKey}.json`);

    // 1. Önce diskteki önbelleğe bak
    try {
      if (fs.existsSync(cacheFile)) {
        const cachedContent = fs.readFileSync(cacheFile, 'utf-8');
        const parsed = JSON.parse(cachedContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}

    // 2. Canlı görsel araması yap
    try {
      const tokenRes = await fetch(
        `https://duckduckgo.com/?q=${encodeURIComponent(rawQuery)}&iax=images&ia=images`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        }
      );

      const html = await tokenRes.text();
      const vqdMatch =
        html.match(/vqd=([0-9-]+)/) || html.match(/vqd=["'\x22]([0-9-]+)["'\x22]/);
      const vqd = vqdMatch ? vqdMatch[1] : null;

      if (!vqd) {
        return [];
      }

      const imgUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(
        rawQuery
      )}&vqd=${vqd}&f=,,,`;
      const imgRes = await fetch(imgUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://duckduckgo.com/'
        }
      });

      if (!imgRes.ok) return [];

      const json = await imgRes.json();
      const results = (json.results || []).slice(0, limit).map((r) => ({
        title: r.title || `${brand} ${oem}`,
        image: r.image,
        thumbnail: r.thumbnail,
        source: r.url,
        width: r.width,
        height: r.height
      }));

      // 3. Diskteki JSON önbelleğe kaydet
      if (results.length > 0) {
        fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2), 'utf-8');
      }

      return results;
    } catch (err) {
      console.error(`Image search error for ${rawQuery}:`, err.message);
      return [];
    }
  }
}

module.exports = {
  ImageSearchService: new ImageSearchService()
};

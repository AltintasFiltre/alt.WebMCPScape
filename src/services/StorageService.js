const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const CROSS_DIR = path.join(DATA_DIR, 'cross-references');
const SCRAPES_DIR = path.join(DATA_DIR, 'scrapes');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

/**
 * StorageService
 * 
 * Veritabanı (DB) gerektirmeden dosya tabanlı (JSON) kalıcı saklama ve önbellekleme servisi.
 * Hem çoklu katalog Cross-Referans taramalarını hem de Tekil URL kazıma sonuçlarını saklar.
 */
class StorageService {
  constructor() {
    this.initStorage();
  }

  /**
   * data klasör yapısını ve history.json dosyasını başlatır
   */
  initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(CROSS_DIR)) {
        fs.mkdirSync(CROSS_DIR, { recursive: true });
      }
      if (!fs.existsSync(SCRAPES_DIR)) {
        fs.mkdirSync(SCRAPES_DIR, { recursive: true });
      }
      if (!fs.existsSync(HISTORY_FILE)) {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('StorageService init error:', err.message);
    }
  }

  /**
   * Filtre kodunu güvenli dosya adı formatına dönüştürür (örn: "WP 12 120/1" -> "WP_12_120_1")
   */
  getSafeFileName(code) {
    return String(code || '')
      .trim()
      .replace(/[\s\/\\]+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '')
      .toUpperCase();
  }

  /**
   * URL için güvenli dosya adı veya MD5 hash üretir
   */
  getUrlFileName(url) {
    const clean = String(url || '').trim();
    const hash = crypto.createHash('md5').update(clean).digest('hex').substring(0, 12);
    const domain = clean.replace(/^https?:\/\//i, '').split('/')[0].replace(/[^a-zA-Z0-9]/g, '_');
    return `${domain}_${hash}`;
  }

  /* ============================================================
     1. CROSS REFERENCE SAKLAMA & OKUMA
     ============================================================ */

  /**
   * Kayıtlı cross referans sonucunu diskten getirir (Varsa cache hit döner)
   * @param {string} code 
   * @returns {object|null}
   */
  getCrossReference(code) {
    try {
      const fileName = this.getSafeFileName(code);
      if (!fileName) return null;

      const filePath = path.join(CROSS_DIR, `${fileName}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          fromCache: true
        };
      }
    } catch (err) {
      console.error(`StorageService read cross error for ${code}:`, err.message);
    }
    return null;
  }

  /**
   * Cross referans sonucunu diskte kalıcı JSON dosyası olarak saklar ve history.json'ı günceller
   * @param {string} code 
   * @param {object} data 
   */
  saveCrossReference(code, data) {
    try {
      const fileName = this.getSafeFileName(code);
      if (!fileName || !data) return;

      const filePath = path.join(CROSS_DIR, `${fileName}.json`);
      const payload = {
        ...data,
        cachedAt: new Date().toISOString(),
        queryCode: code.trim(),
        fromCache: true
      };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      this.addToHistory({
        id: `cross_${fileName}`,
        type: 'cross',
        title: code.trim(),
        totalBrands: data.totalBrands || data.results?.length || 0,
        totalOems: data.totalOems || 0,
        timestamp: new Date().toISOString(),
        fileName: `${fileName}.json`
      });
    } catch (err) {
      console.error(`StorageService save cross error for ${code}:`, err.message);
    }
  }

  /* ============================================================
     2. TEKİL URL KAZIMA SAKLAMA & OKUMA
     ============================================================ */

  /**
   * Kayıtlı tekil URL kazıma sonucunu diskten getirir
   * @param {string} url 
   * @returns {object|null}
   */
  getScrape(url) {
    try {
      const fileName = this.getUrlFileName(url);
      if (!fileName) return null;

      const filePath = path.join(SCRAPES_DIR, `${fileName}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          fromCache: true
        };
      }
    } catch (err) {
      console.error(`StorageService read scrape error for ${url}:`, err.message);
    }
    return null;
  }

  /**
   * Tekil URL kazıma sonucunu diskte kalıcı JSON dosyası olarak saklar ve history.json'ı günceller
   * @param {string} url 
   * @param {object} data 
   */
  saveScrape(url, data) {
    try {
      const fileName = this.getUrlFileName(url);
      if (!fileName || !data) return;

      const filePath = path.join(SCRAPES_DIR, `${fileName}.json`);
      const payload = {
        ...data,
        cachedAt: new Date().toISOString(),
        queryUrl: url.trim(),
        fromCache: true
      };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      this.addToHistory({
        id: `url_${fileName}`,
        type: 'url',
        title: url.trim(),
        timestamp: new Date().toISOString(),
        fileName: `${fileName}.json`
      });
    } catch (err) {
      console.error(`StorageService save scrape error for ${url}:`, err.message);
    }
  }

  /* ============================================================
     3. GEÇMİŞ YÖNETİMİ & TEMİZLEME
     ============================================================ */

  /**
   * Geçmiş listesini diskten okur
   */
  getHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const content = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('StorageService getHistory error:', err.message);
    }
    return [];
  }

  /**
   * Geçmişe yeni bir arama kaydı ekler / günceller
   */
  addToHistory(entry) {
    try {
      let history = this.getHistory();
      history = [entry, ...history.filter((h) => h.title.trim().toUpperCase() !== entry.title.trim().toUpperCase())].slice(0, 100);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    } catch (err) {
      console.error('StorageService addToHistory error:', err.message);
    }
  }

  /**
   * Belirli bir arama veya URL kaydını diskten siler
   */
  deleteItem(titleOrCode) {
    try {
      const clean = String(titleOrCode || '').trim();
      const crossFile = path.join(CROSS_DIR, `${this.getSafeFileName(clean)}.json`);
      const scrapeFile = path.join(SCRAPES_DIR, `${this.getUrlFileName(clean)}.json`);

      if (fs.existsSync(crossFile)) {
        fs.unlinkSync(crossFile);
      }
      if (fs.existsSync(scrapeFile)) {
        fs.unlinkSync(scrapeFile);
      }

      let history = this.getHistory();
      history = history.filter((h) => h.title.trim().toUpperCase() !== clean.toUpperCase());
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error(`StorageService delete error for ${titleOrCode}:`, err.message);
      return false;
    }
  }

  /**
   * Tüm önbelleği ve geçmişi temizler
   */
  clearAll() {
    try {
      if (fs.existsSync(CROSS_DIR)) {
        const files = fs.readdirSync(CROSS_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(CROSS_DIR, file));
          }
        }
      }
      if (fs.existsSync(SCRAPES_DIR)) {
        const files = fs.readdirSync(SCRAPES_DIR);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(SCRAPES_DIR, file));
          }
        }
      }
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('StorageService clearAll error:', err.message);
      return false;
    }
  }
}

module.exports = {
  StorageService: new StorageService()
};

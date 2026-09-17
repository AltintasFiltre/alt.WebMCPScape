/**
 * Tüm scraper'ların türeyeceği ortak soyut sınıf (Interface / Contract)
 * Open-Closed Principle (OCP) & Liskov Substitution Principle (LSP)
 */
class BaseScraper {
  constructor(name) {
    if (new.target === BaseScraper) {
      throw new TypeError("BaseScraper doğrudan başlatılamaz, türetilmelidir.");
    }
    this.name = name;
  }

  /**
   * Scraper tipini belirtir: 'http' veya 'browser'
   * @returns {'http' | 'browser'}
   */
  getType() {
    return 'http';
  }

  /**
   * Filtre kodunu arar.
   * HTTP tabanlı scraper'lar için: search(code)
   * Tarayıcı tabanlı scraper'lar için: search(code, page)
   * 
   * @param {string} code - Aranacak filtre kodu
   * @param {object} [page] - Playwright Page nesnesi (browser tipi için)
   * @returns {Promise<Array<{ "Üretici Adı": string, "Oems": string[] }>>}
   */
  async search(code, page = null) {
    throw new Error(`${this.name} scraper'ı search(code, page) metodunu uygulamalıdır.`);
  }
}

module.exports = {
  BaseScraper
};

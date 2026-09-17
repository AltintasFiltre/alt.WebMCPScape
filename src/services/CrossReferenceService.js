const { chromium } = require('playwright');
const { createScrapers } = require('../scrapers');
const { ResultAggregator } = require('./ResultAggregator');
const { USER_AGENT } = require('../config/constants');

/**
 * CrossReferenceService
 * 
 * Dependency Inversion Principle (DIP) & Single Responsibility:
 * Scraper'ların orkestrasyonunu (çalıştırma sırası, paralel yönetim, browser context paylaşımı)
 * ve her bir sitenin tarama durumunu (stats / logs) yönetir.
 */
class CrossReferenceService {
  constructor(scrapers = createScrapers()) {
    this.scrapers = scrapers;
  }

  /**
   * Verilen filtre kodunu tüm kayıtlı scraper'lar ile tarar,
   * her bir scraper'ın durum bilgisini ve birleştirilmiş sonucu döner.
   * @param {string} code 
   */
  async search(code) {
    if (!code || !code.trim()) {
      return {
        results: [],
        sources: [],
        totalFound: 0,
        queryCode: ''
      };
    }
    const queryCode = code.trim();

    const httpScrapers = this.scrapers.filter((s) => s.getType() === 'http');
    const browserScrapers = this.scrapers.filter((s) => s.getType() === 'browser');

    const sourceReports = [];
    const allRawResults = [];

    // 1. Hızlı HTTP / API Scraper'ları paralel çalıştır
    const httpPromises = httpScrapers.map(async (scraper) => {
      const startTime = Date.now();
      try {
        const raw = await scraper.search(queryCode);
        const duration = Date.now() - startTime;
        const count = raw.reduce((sum, item) => sum + (item.Oems?.length || 0), 0);
        sourceReports.push({
          name: scraper.name,
          type: 'API / Fast HTML',
          status: count > 0 ? 'success' : 'empty',
          foundCount: count,
          durationMs: duration,
          data: raw
        });
        return raw;
      } catch (err) {
        sourceReports.push({
          name: scraper.name,
          type: 'API / Fast HTML',
          status: 'error',
          foundCount: 0,
          durationMs: Date.now() - startTime,
          error: err.message,
          data: []
        });
        return [];
      }
    });

    const httpResults = await Promise.all(httpPromises);
    allRawResults.push(...httpResults.flat());

    // 2. Playwright Tabanlı Scraper'ları paylaşılan tek bir tarayıcı oturumunda paralel çalıştır
    if (browserScrapers.length > 0) {
      let browser = null;
      try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          userAgent: USER_AGENT
        });

        const browserPromises = browserScrapers.map(async (scraper) => {
          const startTime = Date.now();
          const page = await context.newPage();
          try {
            const raw = await scraper.search(queryCode, page);
            const duration = Date.now() - startTime;
            const count = raw.reduce((sum, item) => sum + (item.Oems?.length || 0), 0);
            sourceReports.push({
              name: scraper.name,
              type: 'Browser / Catalog',
              status: count > 0 ? 'success' : 'empty',
              foundCount: count,
              durationMs: duration,
              data: raw
            });
            return raw;
          } catch (err) {
            sourceReports.push({
              name: scraper.name,
              type: 'Browser / Catalog',
              status: 'error',
              foundCount: 0,
              durationMs: Date.now() - startTime,
              error: err.message,
              data: []
            });
            return [];
          } finally {
            await page.close().catch(() => {});
          }
        });

        const browserResults = await Promise.all(browserPromises);
        allRawResults.push(...browserResults.flat());
      } catch (err) {
        console.error("Browser scraping session error:", err.message);
      } finally {
        if (browser) await browser.close().catch(() => {});
      }
    }

    // 3. Veriyi tekilleştir ve formatla
    const finalResults = ResultAggregator.aggregate(allRawResults);

    return {
      queryCode,
      results: finalResults,
      sources: sourceReports,
      totalBrands: finalResults.length,
      totalOems: finalResults.reduce((acc, curr) => acc + curr.Oems.length, 0)
    };
  }
}

module.exports = {
  CrossReferenceService
};

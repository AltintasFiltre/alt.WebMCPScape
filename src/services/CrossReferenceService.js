const { chromium } = require('playwright');
const { createScrapers } = require('../scrapers');
const { ResultAggregator } = require('./ResultAggregator');
const { USER_AGENT } = require('../config/constants');

/**
 * CrossReferenceService
 * 
 * Dependency Inversion Principle (DIP) & Single Responsibility:
 * Scraper'ların orkestrasyonunu (çalıştırma sırası, paralel yönetim, browser context paylaşımı),
 * canlı ilerleme raporlamasını (onProgress callback) ve her bir sitenin durumunu yönetir.
 */
class CrossReferenceService {
  constructor(scrapers = createScrapers()) {
    this.scrapers = scrapers;
  }

  /**
   * Verilen filtre kodunu tüm kayıtlı scraper'lar ile tarar.
   * Canlı ilerleme için opsiyonel onProgress callback'ini çağırır.
   * 
   * @param {string} code 
   * @param {function} [onProgress] - (event) => void
   */
  async search(code, onProgress = null) {
    if (!code || !code.trim()) {
      return {
        results: [],
        sources: [],
        totalFound: 0,
        queryCode: ''
      };
    }
    const queryCode = code.trim();
    const totalScrapers = this.scrapers.length;
    let completedCount = 0;

    // Başlangıç bildirimi
    if (typeof onProgress === 'function') {
      onProgress({
        type: 'start',
        queryCode,
        totalScrapers,
        scrapers: this.scrapers.map((s) => ({
          name: s.name,
          type: s.getType() === 'http' ? 'API / Fast HTML' : 'Browser / Catalog'
        }))
      });
    }

    const httpScrapers = this.scrapers.filter((s) => s.getType() === 'http');
    const browserScrapers = this.scrapers.filter((s) => s.getType() === 'browser');

    const sourceReports = [];
    const allRawResults = [];

    // 1. Hızlı HTTP / API Scraper'ları paralel çalıştır
    const httpPromises = httpScrapers.map(async (scraper) => {
      const startTime = Date.now();
      if (typeof onProgress === 'function') {
        onProgress({
          type: 'scraper_start',
          name: scraper.name,
          scraperType: 'API / Fast HTML'
        });
      }

      try {
        const raw = await scraper.search(queryCode);
        const duration = Date.now() - startTime;
        const count = raw.reduce((sum, item) => sum + (item.Oems?.length || 0), 0);
        const report = {
          name: scraper.name,
          type: 'API / Fast HTML',
          status: count > 0 ? 'success' : 'empty',
          foundCount: count,
          durationMs: duration,
          data: raw
        };
        sourceReports.push(report);
        completedCount++;

        if (typeof onProgress === 'function') {
          onProgress({
            type: 'scraper_done',
            report,
            completedCount,
            totalScrapers
          });
        }
        return raw;
      } catch (err) {
        const duration = Date.now() - startTime;
        const report = {
          name: scraper.name,
          type: 'API / Fast HTML',
          status: 'error',
          foundCount: 0,
          durationMs: duration,
          error: err.message,
          data: []
        };
        sourceReports.push(report);
        completedCount++;

        if (typeof onProgress === 'function') {
          onProgress({
            type: 'scraper_done',
            report,
            completedCount,
            totalScrapers
          });
        }
        return [];
      }
    });

    const httpResults = await Promise.all(httpPromises);
    allRawResults.push(...httpResults.flat());

    // 2. Playwright Tabanlı Scraper'ları paylaşılan tek bir tarayıcı oturumunda paralel çalıştır
    if (browserScrapers.length > 0) {
      let browser = null;
      try {
        browser = await chromium.launch({
          headless: false,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-infobars',
            '--window-position=-2400,-2400'
          ]
        });
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          userAgent: USER_AGENT
        });
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });

        const browserPromises = browserScrapers.map(async (scraper) => {
          const startTime = Date.now();
          if (typeof onProgress === 'function') {
            onProgress({
              type: 'scraper_start',
              name: scraper.name,
              scraperType: 'Browser / Catalog'
            });
          }

          const page = await context.newPage();
          try {
            const raw = await scraper.search(queryCode, page);
            const duration = Date.now() - startTime;
            const count = raw.reduce((sum, item) => sum + (item.Oems?.length || 0), 0);
            const report = {
              name: scraper.name,
              type: 'Browser / Catalog',
              status: count > 0 ? 'success' : 'empty',
              foundCount: count,
              durationMs: duration,
              data: raw
            };
            sourceReports.push(report);
            completedCount++;

            if (typeof onProgress === 'function') {
              onProgress({
                type: 'scraper_done',
                report,
                completedCount,
                totalScrapers
              });
            }
            return raw;
          } catch (err) {
            const duration = Date.now() - startTime;
            const report = {
              name: scraper.name,
              type: 'Browser / Catalog',
              status: 'error',
              foundCount: 0,
              durationMs: duration,
              error: err.message,
              data: []
            };
            sourceReports.push(report);
            completedCount++;

            if (typeof onProgress === 'function') {
              onProgress({
                type: 'scraper_done',
                report,
                completedCount,
                totalScrapers
              });
            }
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

    const payload = {
      queryCode,
      results: finalResults,
      sources: sourceReports,
      totalBrands: finalResults.length,
      totalOems: finalResults.reduce((acc, curr) => acc + curr.Oems.length, 0)
    };

    if (typeof onProgress === 'function') {
      onProgress({
        type: 'complete',
        data: payload
      });
    }

    return payload;
  }

  /**
   * SADECE tek bir üretici/katalog scraper'ını çalıştırır.
   * Sunucu hatası veya boş dönen bir siteyi tek başına yeniden taramak için kullanılır.
   * 
   * @param {string} code - Filtre kodu
   * @param {string} scraperName - Taranacak scraper adı (örn: "BALDWIN", "MAHLE")
   */
  async searchSingle(code, scraperName) {
    if (!code || !scraperName) {
      throw new Error('Filtre kodu ve üretici adı gereklidir.');
    }

    const scraper = this.scrapers.find(
      (s) => s.name.toUpperCase() === scraperName.trim().toUpperCase()
    );

    if (!scraper) {
      throw new Error(`'${scraperName}' adında bir katalog scraper'ı bulunamadı.`);
    }

    const queryCode = code.trim();
    const startTime = Date.now();
    let raw = [];
    let error = null;

    if (scraper.getType() === 'http') {
      try {
        raw = await scraper.search(queryCode);
      } catch (e) {
        error = e.message;
      }
    } else {
      let browser = null;
      try {
        browser = await chromium.launch({
          headless: false,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-infobars',
            '--window-position=-2400,-2400'
          ]
        });
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          userAgent: USER_AGENT
        });
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        const page = await context.newPage();
        try {
          raw = await scraper.search(queryCode, page);
        } finally {
          await page.close().catch(() => {});
        }
      } catch (e) {
        error = e.message;
      } finally {
        if (browser) await browser.close().catch(() => {});
      }
    }

    const duration = Date.now() - startTime;
    const count = raw.reduce((sum, item) => sum + (item.Oems?.length || 0), 0);

    const report = {
      name: scraper.name,
      type: scraper.getType() === 'http' ? 'API / Fast HTML' : 'Browser / Catalog',
      status: error ? 'error' : count > 0 ? 'success' : 'empty',
      foundCount: count,
      durationMs: duration,
      error: error || undefined,
      data: raw
    };

    return {
      scraperName: scraper.name,
      report,
      raw
    };
  }

  /**
   * Tek bir scraper'ın yenilenen sonucunu mevcut arama sonucuna birleştirir
   * ve tüm üreticileri baştan agrege eder.
   */
  updateResponseWithSingleResult(existingResponse, singleResult) {
    if (!existingResponse) {
      const finalRes = ResultAggregator.aggregate(singleResult.raw || []);
      return {
        queryCode: '',
        results: finalRes,
        sources: [singleResult.report],
        totalBrands: finalRes.length,
        totalOems: finalRes.reduce((acc, curr) => acc + curr.Oems.length, 0),
        fromCache: false
      };
    }

    // 1. sources dizisini güncelle
    const updatedSources = (existingResponse.sources || []).map((s) => {
      if (s.name.toUpperCase() === singleResult.scraperName.toUpperCase()) {
        return singleResult.report;
      }
      return s;
    });

    if (!updatedSources.some((s) => s.name.toUpperCase() === singleResult.scraperName.toUpperCase())) {
      updatedSources.push(singleResult.report);
    }

    // 2. Tüm kaynaklardan gelen ham verileri birleştir ve agrege et
    const allRaw = [];
    updatedSources.forEach((s) => {
      if (Array.isArray(s.data)) {
        allRaw.push(...s.data);
      }
    });

    const updatedResults = ResultAggregator.aggregate(allRaw);

    return {
      queryCode: existingResponse.queryCode,
      results: updatedResults,
      sources: updatedSources,
      totalBrands: updatedResults.length,
      totalOems: updatedResults.reduce((acc, curr) => acc + curr.Oems.length, 0),
      cachedAt: new Date().toISOString(),
      fromCache: false
    };
  }
}

module.exports = {
  CrossReferenceService
};

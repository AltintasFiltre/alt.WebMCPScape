/**
 * crossScraper.js - Facade / Entry Point
 * Geriye dönük tam uyumluluk (Backward Compatibility) sağlar.
 * Yeni SOLID mimarideki servisleri ve utility fonksiyonlarını dışa aktarır.
 */

const { ALLOWED_BRANDS } = require('./src/config/constants');
const {
  getCodeVariations,
  normalizeCode,
  isExactCodeMatch,
  isValidCode,
  normalizeBrand
} = require('./src/utils/filterNormalizer');
const { ResultAggregator } = require('./src/services/ResultAggregator');
const { CrossReferenceService } = require('./src/services/CrossReferenceService');
const {
  MannScraper,
  FerraScraper,
  DonaldsonScraper,
  MicronicScraper,
  SfFilterScraper,
  MahleScraper,
  FleetguardScraper,
  SampiyonScraper,
  FilScraper,
  SCTurboScraper,
  BaldwinScraper
} = require('./src/scrapers');

const crossReferenceService = new CrossReferenceService();

/**
 * Ana arama fonksiyonu
 */
async function searchCrossReferences(code) {
  return crossReferenceService.search(code);
}

// Bireysel scraper yardımcı fonksiyonları (geriye dönük uyumluluk)
const mannScraper = new MannScraper();
const ferraScraper = new FerraScraper();
const donaldsonScraper = new DonaldsonScraper();
const micronicScraper = new MicronicScraper();
const sfFilterScraper = new SfFilterScraper();
const mahleScraper = new MahleScraper();
const fleetguardScraper = new FleetguardScraper();
const sampiyonScraper = new SampiyonScraper();
const filScraper = new FilScraper();
const scTurboScraper = new SCTurboScraper();
const baldwinScraper = new BaldwinScraper();

module.exports = {
  searchCrossReferences,
  searchMann: (code) => mannScraper.search(code),
  searchFerra: (code) => ferraScraper.search(code),
  searchDonaldson: (code) => donaldsonScraper.search(code),
  searchMicronic: (code) => micronicScraper.search(code),
  searchSfFilter: (code) => sfFilterScraper.search(code),
  searchMahle: (page, code) => mahleScraper.search(code, page),
  searchFleetguard: (page, code) => fleetguardScraper.search(code, page),
  searchSampiyon: (page, code) => sampiyonScraper.search(code, page),
  searchFil: (page, code) => filScraper.search(code, page),
  searchSCTurbo: (code) => scTurboScraper.search(code),
  searchBaldwin: (code) => baldwinScraper.search(code),
  mergeCrossResults: ResultAggregator.aggregate,
  isExactCodeMatch,
  normalizeCode,
  getCodeVariations,
  isValidCode,
  normalizeBrand,
  ALLOWED_BRANDS,
  CrossReferenceService
};

const { MannScraper } = require('./MannScraper');
const { FerraScraper } = require('./FerraScraper');
const { DonaldsonScraper } = require('./DonaldsonScraper');
const { MicronicScraper } = require('./MicronicScraper');
const { SfFilterScraper } = require('./SfFilterScraper');
const { MahleScraper } = require('./MahleScraper');
const { FleetguardScraper } = require('./FleetguardScraper');
const { SampiyonScraper } = require('./SampiyonScraper');
const { FilScraper } = require('./FilScraper');
const { SCTurboScraper } = require('./SCTurboScraper');
const { BaldwinScraper } = require('./BaldwinScraper');

/**
 * Fabrika (Factory Pattern) ve Registry:
 * Yeni bir scraper eklendiğinde tek yapılması gereken bu diziye eklemektir.
 * Open-Closed Principle (OCP): Varolan koda dokunmadan genişletilebilir.
 */
function createScrapers() {
  return [
    new MannScraper(),
    new FerraScraper(),
    new DonaldsonScraper(),
    new MicronicScraper(),
    new SfFilterScraper(),
    new MahleScraper(),
    new FleetguardScraper(),
    new SampiyonScraper(),
    new FilScraper(),
    new SCTurboScraper(),
    new BaldwinScraper()
  ];
}

module.exports = {
  createScrapers,
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
};

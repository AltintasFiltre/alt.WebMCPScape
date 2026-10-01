/**
 * Resmi filtre üreticisi öncelik sırası:
 * 1. FLEETGUARD, 2. DONALDSON, 3. MANN-FILTER, 4. FİL FİLTRE, 5. MAHLE, 6. HiFi, ...
 */
const BRAND_PRIORITY = Object.freeze([
  "FLEETGUARD",
  "DONALDSON",
  "MANN-FILTER",
  "FİL FİLTRE",
  "MAHLE",
  "HiFi",
  "BALDWIN",
  "SF-FILTER",
  "HENGST",
  "ASAŞ",
  "ŞAMPİYON",
  "SCTURBO",
  "FİLMAR",
  "MICRONIC",
  "FERRA",
  "MYER",
  "PARKER",
  "CATERPILLAR",
  "VOLVO",
  "SCANIA",
  "KOMATSU",
  "PERKINS",
  "AUTOTECHNIK",
  "BAVARIA"
]);

const ALLOWED_BRANDS = BRAND_PRIORITY;

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

module.exports = {
  BRAND_PRIORITY,
  ALLOWED_BRANDS,
  USER_AGENT
};

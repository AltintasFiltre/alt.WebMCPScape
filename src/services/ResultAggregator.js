const { normalizeBrand, isValidCode } = require('../utils/filterNormalizer');
const { BRAND_PRIORITY } = require('../config/constants');

function getBrandPriorityIndex(brand) {
  const norm = String(brand || '').trim().toUpperCase();
  const idx = BRAND_PRIORITY.findIndex((b) => b.toUpperCase() === norm || norm.includes(b.toUpperCase()) || b.toUpperCase().includes(norm));
  return idx !== -1 ? idx : 999;
}

/**
 * Birden fazla scraper'dan gelen ham sonuçları birleştirir,
 * markaları standartlaştırır, OEM kodlarını tekilleştirir
 * ve kesin öncelik sırasına göre sıralar (FLEETGUARD, DONALDSON, MANN, FIL, MAHLE, HiFi...).
 * 
 * Single Responsibility: Sadece veri birleştirme ve formatlama ile ilgilenir.
 */
class ResultAggregator {
  static aggregate(rawResultsList) {
    const brandMap = new Map();

    for (const item of rawResultsList) {
      if (!item || !item["Üretici Adı"]) continue;
      const brand = normalizeBrand(item["Üretici Adı"]);
      if (!brand) continue; // Sadece izin verilen 24 üretici listesindekileri al

      const oems = Array.isArray(item.Oems) ? item.Oems : [];

      if (!brandMap.has(brand)) {
        brandMap.set(brand, new Set());
      }
      const oemSet = brandMap.get(brand);
      for (const code of oems) {
        if (isValidCode(code)) {
          oemSet.add(String(code).trim());
        }
      }
    }

    const aggregated = [];
    for (const [brand, oemSet] of brandMap.entries()) {
      if (oemSet.size > 0) {
        aggregated.push({
          "Üretici Adı": brand,
          "Oems": Array.from(oemSet)
        });
      }
    }

    // Marka öncelik sırasına göre sırala (FLEETGUARD, DONALDSON, MANN-FILTER, FİL FİLTRE, MAHLE, HiFi...)
    aggregated.sort((a, b) => {
      const pA = getBrandPriorityIndex(a["Üretici Adı"]);
      const pB = getBrandPriorityIndex(b["Üretici Adı"]);
      if (pA !== pB) return pA - pB;
      return a["Üretici Adı"].localeCompare(b["Üretici Adı"]);
    });

    return aggregated;
  }
}

module.exports = {
  ResultAggregator
};

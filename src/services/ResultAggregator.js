const { normalizeBrand, isValidCode } = require('../utils/filterNormalizer');

/**
 * Birden fazla scraper'dan gelen ham sonuçları birleştirir,
 * markaları standartlaştırır ve OEM kodlarını tekilleştirir.
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

    return aggregated;
  }
}

module.exports = {
  ResultAggregator
};

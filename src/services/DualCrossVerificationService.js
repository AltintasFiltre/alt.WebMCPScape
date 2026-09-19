const { isExactCodeMatch, normalizeCode, normalizeBrand } = require('../utils/filterNormalizer');

/**
 * DualCrossVerificationService
 * 
 * İki farklı OEM/Filtre kodunun (Ref A ve Ref B) arama sonuçlarını kesiştirir,
 * çift yönlü doğrulama (Bi-Directional Cross Match) analizi yapar ve
 * yüksek güvenilirlikli birleşik sonuç matrisi üretir.
 */
class DualCrossVerificationService {
  /**
   * İki referans kodunun sonuçlarını karşılaştırıp kesiştirir
   * @param {string} codeA - 1. Referans Kodu
   * @param {object} responseA - 1. Kodun tam tarama sonucu { results, sources }
   * @param {string} codeB - 2. Referans Kodu
   * @param {object} responseB - 2. Kodun tam tarama sonucu { results, sources }
   */
  static analyze(codeA, responseA, codeB, responseB) {
    const normA = normalizeCode(codeA);
    const normB = normalizeCode(codeB);

    const resultsA = Array.isArray(responseA) ? responseA : responseA?.results || [];
    const resultsB = Array.isArray(responseB) ? responseB : responseB?.results || [];
    const sourcesA = responseA?.sources || [];
    const sourcesB = responseB?.sources || [];

    // Her iki aramanın OEM kod haritaları: Map<BrandName, Map<NormalizedOEM, { rawOem, sources: Set }>>
    const mapA = this._buildCodeMap(resultsA, sourcesA, codeA);
    const mapB = this._buildCodeMap(resultsB, sourcesB, codeB);

    // 1. Çift Yönlü Birebir Eşleşme Kontrolü (A, B'yi buldu mu? B, A'yı buldu mu?)
    let aContainsB = false;
    let bContainsA = false;

    // A sonuçlarında B var mı?
    for (const [brand, oemMap] of mapA.entries()) {
      for (const [normOem] of oemMap.entries()) {
        if (isExactCodeMatch(codeB, normOem)) {
          aContainsB = true;
          break;
        }
      }
      if (aContainsB) break;
    }

    // B sonuçlarında A var mı?
    for (const [brand, oemMap] of mapB.entries()) {
      for (const [normOem] of oemMap.entries()) {
        if (isExactCodeMatch(codeA, normOem)) {
          bContainsA = true;
          break;
        }
      }
      if (bContainsA) break;
    }

    const isGoldenMatch = aContainsB && bContainsA;
    const isDirectMatch = aContainsB || bContainsA;

    let matchStatusText = 'Doğrudan Çapraz Eşleşme Yok (Yalnızca Ortak Muadiller)';
    let matchBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';

    if (isGoldenMatch) {
      matchStatusText = '🏆 Altın Teyit: İki Referans Birbirini %100 Karşılıklı Doğruladı';
      matchBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (isDirectMatch) {
      matchStatusText = '✓ Tek Yönlü Teyit: Referanslardan Biri Diğerini Doğruladı';
      matchBadgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
    }

    // 2. Birleşik Sonuçları ve Kesişim Puanlarını Hesapla
    const allBrands = new Set([...mapA.keys(), ...mapB.keys()]);
    const unifiedRows = [];
    const aggregatedResults = [];

    let mutualCount = 0;
    let onlyACount = 0;
    let onlyBCount = 0;

    for (const brand of allBrands) {
      const oemsA = mapA.get(brand) || new Map();
      const oemsB = mapB.get(brand) || new Map();
      const allNormOems = new Set([...oemsA.keys(), ...oemsB.keys()]);
      const brandOems = [];

      for (const normOem of allNormOems) {
        const itemA = oemsA.get(normOem);
        const itemB = oemsB.get(normOem);

        const inA = Boolean(itemA);
        const inB = Boolean(itemB);
        const isMutual = inA && inB;

        const rawOem = itemA?.rawOem || itemB?.rawOem || normOem;
        brandOems.push(rawOem);

        const confirmedSourcesSet = new Set([
          ...(itemA?.sources || []),
          ...(itemB?.sources || [])
        ]);
        const confirmedSources = Array.from(confirmedSourcesSet);
        const matchCount = Math.max(confirmedSources.length, 1);

        // Puanlama Algoritması
        let score = 55;
        let stars = 1;
        let level = 'Tek Kaynak Teyitli';
        let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';

        if (isMutual) {
          mutualCount++;
          if (matchCount >= 2 || isGoldenMatch) {
            score = 100;
            stars = 3;
            level = 'Çift Referans & Çoklu Kaynak Konsensüsü (%100)';
            badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
          } else {
            score = 95;
            stars = 3;
            level = 'Çift Referans Ortak Muadil (%95)';
            badgeColor = 'bg-teal-100 text-teal-800 border-teal-300';
          }
        } else if (inA) {
          onlyACount++;
          if (matchCount >= 2) {
            score = 80;
            stars = 2;
            level = `Yalnızca Ref A (${codeA}) [Çoklu Kaynak]`;
            badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
          } else {
            score = 60;
            stars = 1;
            level = `Yalnızca Ref A (${codeA}) [Tek Kaynak]`;
            badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
          }
        } else if (inB) {
          onlyBCount++;
          if (matchCount >= 2) {
            score = 80;
            stars = 2;
            level = `Yalnızca Ref B (${codeB}) [Çoklu Kaynak]`;
            badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-300';
          } else {
            score = 60;
            stars = 1;
            level = `Yalnızca Ref B (${codeB}) [Tek Kaynak]`;
            badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
          }
        }

        unifiedRows.push({
          brand,
          oem: rawOem,
          normOem,
          inA,
          inB,
          isMutual,
          confirmedSources,
          matchCount,
          score,
          stars,
          level,
          badgeColor
        });
      }

      if (brandOems.length > 0) {
        aggregatedResults.push({
          'Üretici Adı': brand,
          'Oems': brandOems
        });
      }
    }

    // Birleşik Kaynak Durumları
    const mergedSourcesMap = new Map();
    [...sourcesA, ...sourcesB].forEach((src) => {
      const prev = mergedSourcesMap.get(src.name);
      if (!prev || src.status === 'success') {
        mergedSourcesMap.set(src.name, src);
      }
    });

    return {
      isDual: true,
      codeA,
      codeB,
      verification: {
        aContainsB,
        bContainsA,
        isGoldenMatch,
        isDirectMatch,
        statusText: matchStatusText,
        badgeColor: matchBadgeColor,
        mutualCount,
        onlyACount,
        onlyBCount,
        totalOems: unifiedRows.length
      },
      results: aggregatedResults,
      matrixRows: unifiedRows,
      sources: Array.from(mergedSourcesMap.values()),
      totalBrands: aggregatedResults.length,
      totalOems: unifiedRows.length,
      responseA,
      responseB,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Helper: Sonuç dizisini ve kaynakları hızlı sorgulanabilir haritaya çevirir
   */
  static _buildCodeMap(results, sources, targetCode) {
    const brandMap = new Map();

    results.forEach((item) => {
      const brand = item['Üretici Adı'] || 'Bilinmeyen';
      if (!brandMap.has(brand)) {
        brandMap.set(brand, new Map());
      }
      const oemMap = brandMap.get(brand);

      (item.Oems || []).forEach((oem) => {
        const norm = normalizeCode(oem);
        if (!norm) return;

        // Hangi siteler bu kodu teyit etti?
        const confirmedSources = [];
        sources.forEach((src) => {
          const rawData = src.data || [];
          let srcHit = false;
          rawData.forEach((d) => {
            (d.Oems || []).forEach((o) => {
              if (normalizeCode(o) === norm) srcHit = true;
            });
          });
          const isSourceBrand =
            src.name.toUpperCase().includes(brand.toUpperCase()) ||
            brand.toUpperCase().includes(src.name.toUpperCase());

          if (srcHit || (isSourceBrand && src.status === 'success')) {
            confirmedSources.push(src.name);
          }
        });

        oemMap.set(norm, {
          rawOem: oem,
          sources: confirmedSources
        });
      });
    });

    return brandMap;
  }
}

module.exports = {
  DualCrossVerificationService
};

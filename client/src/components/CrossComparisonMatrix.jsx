import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Star,
  Check,
  X,
  Search,
  Filter,
  ArrowUpDown,
  FileSpreadsheet,
  Copy,
  Info,
  Layers,
  Award
} from 'lucide-react';

/**
 * Normalizasyon yardımcı fonksiyonu (karşılaştırma için boşluk ve sembolleri kaldırır)
 */
function normalizeCode(s) {
  return String(s || '')
    .replace(/[\s()#+\/\-_.]/g, '')
    .toUpperCase();
}

/**
 * CrossComparisonMatrix Component
 * 
 * Tüm kaynak katalogların bulduğu cross referans verilerini çapraz karşılaştırır,
 * her bir OEM koduna teyit eden kaynak sayısına göre Güven/Doğruluk Skoru hesaplar
 * ve detaylı karşılaştırma matrisi tablosu sunar.
 */
export function CrossComparisonMatrix({ searchResponse, queryCode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL'); // 'ALL' | 'HIGH' (>=2 sources)
  const [sortBy, setSortBy] = useState('score_desc'); // 'score_desc' | 'score_asc' | 'oem_asc' | 'brand_asc'
  const [copiedHighCsv, setCopiedHighCsv] = useState(false);

  if (!searchResponse) return null;

  const results = Array.isArray(searchResponse)
    ? searchResponse
    : searchResponse.results || [];
  const sources = searchResponse.sources || [];

  // Sadece başarılı olan veya sonuç getiren kaynakları sütun olarak listele
  const activeSources = useMemo(() => {
    return sources.filter((s) => s.status === 'success' || s.foundCount > 0);
  }, [sources]);

  // Her kaynağın bulduğu kodların hızlı kontrol haritası (Source Name -> Set of Normalized Codes)
  const sourceCodeMaps = useMemo(() => {
    const map = new Map();
    sources.forEach((src) => {
      const set = new Set();
      const rawData = src.data || [];
      rawData.forEach((item) => {
        if (item.Oems && Array.isArray(item.Oems)) {
          item.Oems.forEach((o) => {
            if (o) set.add(normalizeCode(o));
          });
        }
      });
      map.set(src.name, set);
    });
    return map;
  }, [sources]);

  // Tüm OEM kodlarını tekil satırlara dönüştür ve puanla
  const matrixRows = useMemo(() => {
    const rows = [];

    results.forEach((brandItem) => {
      const brand = brandItem['Üretici Adı'] || 'Bilinmeyen';
      const oems = brandItem.Oems || [];

      oems.forEach((oem) => {
        const normOem = normalizeCode(oem);
        const normQuery = normalizeCode(queryCode);

        // Hangi kaynaklar bu kodu buldu veya aranan kod bu kaynak tarafından bulundu mu?
        const confirmedSources = [];
        sources.forEach((src) => {
          const codeSet = sourceCodeMaps.get(src.name);
          // 1. Kaynağın döndürdüğü OEM listesinde var mı?
          // 2. Veya bu kaynak aranan kod için doğrudan sonuç verdi ve bu üretici markası o kaynağın kendisi mi?
          const isDirectHit = codeSet && codeSet.has(normOem);
          const isSourceBrand =
            src.name.toUpperCase().includes(brand.toUpperCase()) ||
            brand.toUpperCase().includes(src.name.toUpperCase());

          if (isDirectHit || (isSourceBrand && src.status === 'success')) {
            if (!confirmedSources.includes(src.name)) {
              confirmedSources.push(src.name);
            }
          }
        });

        // En az 1 teyit (kendi bulunduğu katalog)
        const matchCount = Math.max(confirmedSources.length, 1);

        // Puanlama Algoritması:
        // 1 kaynak: 55 Puan (1 Yıldız)
        // 2 kaynak: 85 Puan (2 Yıldız)
        // 3+ kaynak: 100 Puan (3 Yıldız / Tam Konsensüs)
        let score = 55;
        let stars = 1;
        let level = 'Tek Kaynak Teyitli';
        let badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

        if (matchCount >= 3) {
          score = 100;
          stars = 3;
          level = 'Çoklu Konsensüs (Yüksek)';
          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (matchCount === 2) {
          score = 85;
          stars = 2;
          level = 'Çift Kaynak Teyitli';
          badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        }

        rows.push({
          brand,
          oem,
          normOem,
          confirmedSources,
          matchCount,
          score,
          stars,
          level,
          badgeColor
        });
      });
    });

    return rows;
  }, [results, sources, sourceCodeMaps, queryCode]);

  // Filtreleme ve Sıralama
  const filteredAndSortedRows = useMemo(() => {
    let list = [...matrixRows];

    // Metin araması
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.oem.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          r.confirmedSources.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Marka filtresi
    if (selectedBrand !== 'ALL') {
      list = list.filter((r) => r.brand === selectedBrand);
    }

    // Seviye filtresi
    if (filterLevel === 'HIGH') {
      list = list.filter((r) => r.matchCount >= 2);
    }

    // Sıralama
    list.sort((a, b) => {
      if (sortBy === 'score_desc') return b.score - a.score || a.brand.localeCompare(b.brand);
      if (sortBy === 'score_asc') return a.score - b.score || a.brand.localeCompare(b.brand);
      if (sortBy === 'oem_asc') return a.oem.localeCompare(b.oem);
      if (sortBy === 'brand_asc') return a.brand.localeCompare(b.brand);
      return 0;
    });

    return list;
  }, [matrixRows, searchTerm, selectedBrand, filterLevel, sortBy]);

  // İstatistiksel Metrikler
  const totalRows = matrixRows.length;
  const highConfidenceCount = matrixRows.filter((r) => r.matchCount >= 2).length;
  const avgScore = totalRows > 0
    ? Math.round(matrixRows.reduce((sum, r) => sum + r.score, 0) / totalRows)
    : 0;
  const uniqueBrands = [...new Set(matrixRows.map((r) => r.brand))];

  // Yalnızca yüksek puanlı (≥80) OEM'leri kopyalama
  const handleCopyHighConfidenceCsv = () => {
    const highOems = matrixRows
      .filter((r) => r.score >= 80)
      .map((r) => String(r.oem).replace(/\s+/g, ''))
      .filter(Boolean);
    const uniqueHigh = [...new Set(highOems)];
    navigator.clipboard.writeText(uniqueHigh.join(','));
    setCopiedHighCsv(true);
    setTimeout(() => setCopiedHighCsv(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Özet Metrik Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Toplam Muadil</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalRows}</div>
          <span className="text-[11px] text-slate-400 mt-1">{uniqueBrands.length} Farklı Marka</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Çoklu Teyitli</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{highConfidenceCount}</div>
          <span className="text-[11px] text-emerald-600/80 font-medium mt-1">2+ Kaynak Onaylı</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Ortalama Güven</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{avgScore}%</div>
          <span className="text-[11px] text-slate-400 mt-1">Konsensüs Puanı</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Aktif Kaynak</span>
            <Star className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{activeSources.length}</div>
          <span className="text-[11px] text-slate-400 mt-1">Sonuç Veren Site</span>
        </div>
      </div>

      {/* 2. Filtre ve Kontrol Çubuğu */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Canlı Arama Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="OEM kodu, marka veya kaynak site ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Marka Filtresi */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Tüm Markalar ({uniqueBrands.length})</option>
              {uniqueBrands.map((b, i) => (
                <option key={i} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Güven Seviyesi Filtresi */}
            <button
              onClick={() => setFilterLevel(filterLevel === 'ALL' ? 'HIGH' : 'ALL')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                filterLevel === 'HIGH'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {filterLevel === 'HIGH' ? 'Sadece 2+ Teyitli' : 'Tüm Seviyeler'}
            </button>

            {/* Sıralama */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="score_desc">Puan (Yüksekten Düşüğe)</option>
              <option value="score_asc">Puan (Düşükten Yükseğe)</option>
              <option value="oem_asc">OEM Kodu (A-Z)</option>
              <option value="brand_asc">Marka Adı (A-Z)</option>
            </select>

            {/* Yüksek Puanlıları CSV Kopyala */}
            <button
              onClick={handleCopyHighConfidenceCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="Yalnızca birden fazla katalog tarafından teyit edilmiş güvenilir OEM kodlarını CSV olarak kopyalar"
            >
              {copiedHighCsv ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <Check className="w-3.5 h-3.5" /> Kopyalandı!
                </span>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Yüksek Güvenli CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Karşılaştırma Matrisi Tablosu */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">
              Kataloglar Arası Çapraz Teyit & Doğruluk Matrisi
            </span>
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredAndSortedRows.length} Kayıt
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 100% Konsensüs
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> 85% Çift Teyit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> 55% Standart
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 min-w-[140px]">Üretici</th>
                <th className="py-3 px-4 min-w-[160px]">OEM Filtre Kodu</th>
                {/* Taranan her aktif katalog için bir sütun */}
                {activeSources.map((src, sIdx) => (
                  <th
                    key={sIdx}
                    className="py-3 px-3 text-center min-w-[90px] border-l border-slate-200/60 font-semibold"
                    title={`${src.name} (${src.type})`}
                  >
                    <span className="truncate block max-w-[90px] mx-auto text-[10px]">
                      {src.name}
                    </span>
                  </th>
                ))}
                <th className="py-3 px-4 text-center min-w-[110px] border-l border-slate-200/60">
                  Teyit Sayısı
                </th>
                <th className="py-3 px-4 text-center min-w-[130px] border-l border-slate-200/60">
                  Güven Puanı
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + activeSources.length}
                    className="p-8 text-center text-slate-400 font-sans text-sm"
                  >
                    Filtre kriterlerine uygun muadil bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Üretici */}
                    <td className="py-3 px-4 font-sans font-extrabold text-slate-900">
                      {row.brand}
                    </td>

                    {/* OEM Kodu */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-900 font-bold px-2.5 py-1 rounded-lg border border-slate-200/80 group-hover:border-blue-300">
                          {row.oem}
                        </span>
                      </div>
                    </td>

                    {/* Katalog Sütunları (Onay / Tire) */}
                    {activeSources.map((src, sIdx) => {
                      const isConfirmed = row.confirmedSources.includes(src.name);
                      return (
                        <td
                          key={sIdx}
                          className="py-3 px-3 text-center border-l border-slate-100"
                        >
                          {isConfirmed ? (
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 shadow-2xs"
                              title={`${src.name} bu muadili doğruladı`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                          ) : (
                            <span className="text-slate-300 font-sans font-light select-none">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Teyit Sayısı */}
                    <td className="py-3 px-4 text-center border-l border-slate-100 font-sans">
                      <span className="font-bold text-slate-700">
                        {row.matchCount} / {activeSources.length || sources.length}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">
                        katalog
                      </span>
                    </td>

                    {/* Güven Puanı & Yıldız Derecesi */}
                    <td className="py-3 px-4 text-center border-l border-slate-100 font-sans">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black border ${row.badgeColor}`}
                          >
                            {row.score}%
                          </span>
                          <div className="flex items-center text-amber-400">
                            {Array.from({ length: row.stars }).map((_, stIdx) => (
                              <Star
                                key={stIdx}
                                className="w-3 h-3 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[130px]">
                          {row.level}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  FileSpreadsheet,
  LayoutGrid,
  Table,
  ShieldCheck,
  Star,
  HardDrive,
  RefreshCw,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { SourceStatusBanner } from './SourceStatusBanner';
import { CrossComparisonMatrix } from './CrossComparisonMatrix';
import { OemImagePreviewPopover } from './OemImagePreviewPopover';
import { DualVerificationBanner } from './DualVerificationBanner';

/**
 * Normalizasyon yardımcısı
 */
function normalizeCode(s) {
  return String(s || '')
    .replace(/[\s()#+\/\-_.]/g, '')
    .toUpperCase();
}

const BRAND_PRIORITY = [
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
];

function getBrandPriorityIndex(brand) {
  const norm = String(brand || '').trim().toUpperCase();
  const idx = BRAND_PRIORITY.findIndex((b) => b.toUpperCase() === norm || norm.includes(b.toUpperCase()) || b.toUpperCase().includes(norm));
  return idx !== -1 ? idx : 999;
}

/**
 * CrossResultsView Component
 * (Single Responsibility: Çapraz arama sonuçlarını, kaynak raporlama bannerını,
 * çift referans doğrulama analizini, kart görünümü ve karşılaştırma/puanlama matrisi sekmelerini sunar)
 */
export function CrossResultsView({
  queryCode,
  searchResponse,
  onForceRefresh,
  loading,
  onRescanSource,
  loadingSource
}) {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'matrix'
  const [dualFilter, setDualFilter] = useState('ALL'); // 'ALL' | 'MUTUAL' | 'ONLY_A' | 'ONLY_B'
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedAllCsv, setCopiedAllCsv] = useState(false);
  const [copiedLineIdx, setCopiedLineIdx] = useState(null);

  // Geriye dönük uyumluluk: response doğrudan dizi veya { results, sources } objesi olabilir
  const rawResults = !searchResponse
    ? []
    : Array.isArray(searchResponse)
    ? searchResponse
    : searchResponse.results || [];

  // Sonuçları kesin marka önceliğine göre sırala: FLEETGUARD, DONALDSON, MANN, FIL, MAHLE, HiFi...
  const results = useMemo(() => {
    return [...rawResults].sort((a, b) => {
      const pA = getBrandPriorityIndex(a['Üretici Adı']);
      const pB = getBrandPriorityIndex(b['Üretici Adı']);
      if (pA !== pB) return pA - pB;
      return (a['Üretici Adı'] || '').localeCompare(b['Üretici Adı'] || '');
    });
  }, [rawResults]);

  const sources = searchResponse?.sources || [];
  const totalBrands = searchResponse?.totalBrands || results.length;
  const totalOems =
    searchResponse?.totalOems ||
    results.reduce((acc, curr) => acc + (curr.Oems?.length || 0), 0);
  const fromCache = searchResponse?.fromCache === true;
  const cachedAt = searchResponse?.cachedAt;

  // Her kaynağın döndürdüğü kodlar haritası
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

  // Marka öncelik sırasına göre tüm tekil OEM kodlarını topla
  const orderedUniqueOems = useMemo(() => {
    const list = [];
    const seen = new Set();

    results.forEach((item) => {
      (item.Oems || []).forEach((rawOem) => {
        const code = String(rawOem || '').replace(/\s+/g, '').trim();
        if (code && !seen.has(code)) {
          seen.add(code);
          list.push(code);
        }
      });
    });

    return list;
  }, [results]);

  // 45-50 karakterlik satırlara bölme (Kodlar asla bölünmez/kesilmez)
  const csvLines = useMemo(() => {
    if (orderedUniqueOems.length === 0) return [];

    const lines = [];
    let currentChunk = [];
    let currentLen = 0;
    const MAX_LINE_LEN = 50;

    for (const code of orderedUniqueOems) {
      const addedLen = currentChunk.length === 0 ? code.length : code.length + 1;

      if (currentLen + addedLen <= MAX_LINE_LEN || currentChunk.length === 0) {
        currentChunk.push(code);
        currentLen += addedLen;
      } else {
        // 50 karakteri aşıyor -> mevcut satırı tamamla ve bu kodu yeni satıra aktar
        lines.push(currentChunk.join(','));
        currentChunk = [code];
        currentLen = code.length;
      }
    }

    if (currentChunk.length > 0) {
      lines.push(currentChunk.join(','));
    }

    return lines;
  }, [orderedUniqueOems]);

  if (!searchResponse) return null;

  // Her bir OEM kodu için doğrulayan kaynakları ve puanı hesapla
  const getOemScoreInfo = (brand, oem) => {
    const norm = normalizeCode(oem);
    const confirmed = [];
    sources.forEach((src) => {
      const codeSet = sourceCodeMaps.get(src.name);
      const isDirectHit = codeSet && codeSet.has(norm);
      const isSourceBrand =
        src.name.toUpperCase().includes(brand.toUpperCase()) ||
        brand.toUpperCase().includes(src.name.toUpperCase());
      if (isDirectHit || (isSourceBrand && src.status === 'success')) {
        if (!confirmed.includes(src.name)) {
          confirmed.push(src.name);
        }
      }
    });

    const count = Math.max(confirmed.length, 1);
    if (count >= 3) {
      return { score: 100, stars: 3, confirmed, badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    } else if (count === 2) {
      return { score: 85, stars: 2, confirmed, badge: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    return { score: 55, stars: 1, confirmed, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyAllCsv = () => {
    const fullCsv = csvLines.join('\n');
    navigator.clipboard.writeText(fullCsv);
    setCopiedAllCsv(true);
    setTimeout(() => setCopiedAllCsv(false), 2000);
  };

  const handleCopySingleLine = (lineText, index) => {
    navigator.clipboard.writeText(lineText);
    setCopiedLineIdx(index);
    setTimeout(() => setCopiedLineIdx(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sitelerin Tarama Durum Bildirimi / Raporu */}
      {sources.length > 0 && (
        <SourceStatusBanner
          sources={sources}
          totalFound={totalOems}
          totalBrands={totalBrands}
          onRescanSource={onRescanSource}
          loadingSource={loadingSource}
        />
      )}

      {/* Önbellek Bilgisi & Yeniden Tara Barı */}
      {fromCache && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 font-medium">
            <HardDrive className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Bu sonuç <strong>yerel JSON dosya deposundan (Önbellek)</strong> anında yüklendi.
            </span>
            {cachedAt && (
              <span className="text-slate-400 font-mono text-[11px] hidden md:inline">
                ({new Date(cachedAt).toLocaleString()})
              </span>
            )}
          </div>

          {onForceRefresh && (
            <button
              onClick={onForceRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl font-bold transition-all shadow-2xs self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Siteleri Canlı Yeniden Tara
            </button>
          )}
        </div>
      )}

      {/* Çift Referans Doğrulama & Kesişim Raporu Banner'ı */}
      {searchResponse?.isDual && (
        <DualVerificationBanner
          dualData={searchResponse}
          activeFilter={dualFilter}
          onFilterChange={setDualFilter}
        />
      )}

      {/* Üst Başlık, Görünüm Değiştirici ve Kopyalama Butonları */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {searchResponse?.isDual ? (
                <>
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  <span>"{searchResponse.codeA}" ⟷ "{searchResponse.codeB}" Çift Doğrulama Sonuçları</span>
                </>
              ) : (
                <span>"{queryCode}" İçin Bulunan Muadiller ({results.length} Üretici)</span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {searchResponse?.isDual
                ? `${totalBrands} üretici markada toplam ${totalOems} muadil kesiştirildi (Öncelik: FLEETGUARD, DONALDSON, MANN, FIL, MAHLE, HiFi...).`
                : `${totalBrands} üretici markada toplam ${totalOems} muadil kod listeleniyor (Öncelik: FLEETGUARD, DONALDSON, MANN, FIL, MAHLE, HiFi...).`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Görünüm Değiştirme Butonları */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kartlar
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Karşılaştırma & Puan Matrisi
              </button>
            </div>

            {/* Tümünü CSV Kopyala Butonu */}
            <button
              onClick={handleCopyAllCsv}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
              title="Tüm satırları kopyalar"
            >
              {copiedAllCsv ? (
                <>
                  <Check className="w-3.5 h-3.5" /> CSV Kopyalandı!
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Tüm CSV'yi Kopyala
                </>
              )}
            </button>

            {/* JSON Kopyala Butonu */}
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Kopyalandı!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" /> JSON
                </>
              )}
            </button>
          </div>
        </div>

        {/* Çok Satırlı 45-50 Karakterlik CSV Bölümleri (Ayrı Ayrı Kopyalanabilir) */}
        {csvLines.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  CSV Çıktı Satırları (Maks 50 Karakter - Kod Bölünmez)
                </span>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                  Öncelik: FLEETGUARD → DONALDSON → MANN → FIL → MAHLE → HiFi
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                {orderedUniqueOems.length} tekil kod • {csvLines.length} satır
              </span>
            </div>

            <div className="space-y-2">
              {csvLines.map((line, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-xl p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 flex-shrink-0">
                      Satır {idx + 1}
                    </span>
                    <span className="text-slate-800 font-bold truncate select-all">
                      {line}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                    <span className="text-[11px] text-slate-400 font-sans font-medium">
                      {line.length} karakter
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopySingleLine(line, idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-sans font-bold flex items-center gap-1 transition-all ${
                        copiedLineIdx === idx
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-blue-600 hover:text-white border border-slate-200 text-slate-700 shadow-2xs'
                      }`}
                    >
                      {copiedLineIdx === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Kopyalandı!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Satır {idx + 1}'i Kopyala
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 1. SEÇENEK: Karşılaştırma & Puanlama Matrisi Görünümü */}
        {viewMode === 'matrix' && (
          <CrossComparisonMatrix
            searchResponse={searchResponse}
            queryCode={queryCode}
            dualFilter={dualFilter}
          />
        )}

        {/* 2. SEÇENEK: Klasik Kart Görünümü (Puanlama Rozetleri İle Geliştirilmiş) */}
        {viewMode === 'cards' && (
          <div>
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-200">
                Bu filtre kodu için taranan sitelerde muadil eşleşmesi bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                        <span className="font-extrabold text-sm text-slate-900 tracking-wide">
                          {item['Üretici Adı']}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.Oems.length} Kod
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {item.Oems.map((oem, oIdx) => {
                        const scoreInfo = getOemScoreInfo(item['Üretici Adı'], oem);
                        return (
                          <OemImagePreviewPopover
                            key={oIdx}
                            brand={item['Üretici Adı']}
                            oem={oem}
                          >
                            <div
                              className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-blue-400 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs group relative cursor-pointer"
                              title={`Doğrulayan Siteler: ${scoreInfo.confirmed.join(', ')} (${scoreInfo.score}% Güven) - Resimleri görmek için üzerine gelin`}
                            >
                              <span>{oem}</span>
                              <span
                                className={`text-[10px] font-sans px-1.5 py-0.2 rounded border font-semibold flex items-center gap-0.5 ${scoreInfo.badge}`}
                              >
                                {scoreInfo.stars >= 2 && (
                                  <Star className="w-2.5 h-2.5 fill-current text-amber-500" />
                                )}
                                {scoreInfo.score}%
                              </span>
                            </div>
                          </OemImagePreviewPopover>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* JSON Preview Block */}
        {results.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-slate-100 mt-6 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800 font-mono">
              <span>JSON Format Çıktısı</span>
              <span>{results.length} üretici dizisi</span>
            </div>
            <pre className="text-xs font-mono text-emerald-400 overflow-x-auto p-2">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

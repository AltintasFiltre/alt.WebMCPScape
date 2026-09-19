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
  Clock
} from 'lucide-react';
import { SourceStatusBanner } from './SourceStatusBanner';
import { CrossComparisonMatrix } from './CrossComparisonMatrix';
import { OemImagePreviewPopover } from './OemImagePreviewPopover';

/**
 * Normalizasyon yardımcısı
 */
function normalizeCode(s) {
  return String(s || '')
    .replace(/[\s()#+\/\-_.]/g, '')
    .toUpperCase();
}

/**
 * CrossResultsView Component
 * (Single Responsibility: Çapraz arama sonuçlarını, kaynak raporlama bannerını,
 * kart görünümü ve karşılaştırma/puanlama matrisi sekmelerini sunar)
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
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Geriye dönük uyumluluk: response doğrudan dizi veya { results, sources } objesi olabilir
  const results = !searchResponse
    ? []
    : Array.isArray(searchResponse)
    ? searchResponse
    : searchResponse.results || [];
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

  // Tüm OEM kodlarının içindeki tüm boşlukları kaldırıp tekilleştiren liste
  const getAllUniqueOems = () => {
    const allOems = results.flatMap((item) => item.Oems || []);
    const noSpacesList = allOems
      .map((oem) => String(oem).replace(/\s+/g, ''))
      .filter(Boolean);
    return [...new Set(noSpacesList)];
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyCsv = () => {
    const oems = getAllUniqueOems();
    const csvString = oems.join(',');
    navigator.clipboard.writeText(csvString);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const uniqueOems = getAllUniqueOems();

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

      {/* Üst Başlık, Görünüm Değiştirici ve Kopyalama Butonları */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              "{queryCode}" İçin Bulunan Muadiller ({results.length} Üretici)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Toplam {uniqueOems.length} tekil muadil kod bulundu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Görünüm Değiştirici (Cards vs Matrix) */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-800 shadow-xs'
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
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Karşılaştırma & Puanlama
              </button>
            </div>

            {/* CSV Kopyala Butonu */}
            <button
              onClick={handleCopyCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl transition-all text-xs font-bold shadow-xs"
              title="Tüm OEM kodlarını aralarında virgül olan tekil CSV formatında kopyala"
            >
              {copiedCsv ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> CSV Kopyalandı!
                </span>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> OEM CSV
                </>
              )}
            </button>

            {/* JSON Kopyala Butonu */}
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl transition-all text-xs font-bold shadow-xs"
            >
              {copiedJson ? (
                <span className="text-green-600 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> JSON Kopyalandı!
                </span>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" /> JSON
                </>
              )}
            </button>
          </div>
        </div>

        {/* CSV Önizleme Şeridi */}
        {uniqueOems.length > 0 && (
          <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 flex-shrink-0">
                CSV Formatı
              </span>
              <span className="text-slate-700 truncate select-all">
                {uniqueOems.join(',')}
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-400 flex-shrink-0">
              {uniqueOems.length} tekil kod
            </span>
          </div>
        )}

        {/* 1. SEÇENEK: Karşılaştırma & Puanlama Matrisi Görünümü */}
        {viewMode === 'matrix' && (
          <CrossComparisonMatrix searchResponse={searchResponse} queryCode={queryCode} />
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

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { SourceStatusBanner } from './SourceStatusBanner';

/**
 * CrossResultsView Component
 * (Single Responsibility: Çapraz arama sonuçlarını, kaynak raporlama bannerını ve JSON çıktısını sunar)
 */
export function CrossResultsView({ queryCode, searchResponse }) {
  const [copied, setCopied] = useState(false);

  if (!searchResponse) return null;

  // Geriye dönük uyumluluk: response doğrudan dizi veya { results, sources } objesi olabilir
  const results = Array.isArray(searchResponse)
    ? searchResponse
    : searchResponse.results || [];
  const sources = searchResponse.sources || [];
  const totalBrands = searchResponse.totalBrands || results.length;
  const totalOems =
    searchResponse.totalOems ||
    results.reduce((acc, curr) => acc + (curr.Oems?.length || 0), 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sitelerin Tarama Durum Bildirimi / Raporu */}
      {sources.length > 0 && (
        <SourceStatusBanner
          sources={sources}
          totalFound={totalOems}
          totalBrands={totalBrands}
        />
      )}

      {/* Sonuç Kartları Bölümü */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              "{queryCode}" İçin Bulunan Muadiller ({results.length} Üretici)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Toplam {totalOems} muadil parça numarası eşleştirildi
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg transition-all text-xs font-bold shadow-sm"
          >
            {copied ? (
              <span className="text-green-600 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Kopyalandı!
              </span>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" /> JSON Formatında Kopyala
              </>
            )}
          </button>
        </div>

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
                  {item.Oems.map((oem, oIdx) => (
                    <span
                      key={oIdx}
                      className="bg-slate-50 border border-slate-200 hover:border-blue-400 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs"
                    >
                      {oem}
                    </span>
                  ))}
                </div>
              </div>
            ))}
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

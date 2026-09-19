import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Loader2,
  HardDrive,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';

/**
 * Normalizasyon yardımcısı
 */
function normalizeCode(s) {
  return String(s || '')
    .replace(/[\s()#+\/\-_.]/g, '')
    .toUpperCase();
}

/**
 * SearchForm Component
 * 
 * Özellikler:
 * - Arama yaparken geçmişteki kayıtları önerir (Autocomplete).
 * - Girilen kod daha önce taranmışsa akıllı bildirim sunar:
 *   "Önbellekten Aç (0 ms)" veya "Canlı Tekrar Tara" seçeneklerini verir.
 */
export function SearchForm({
  mode,
  value,
  onChange,
  onSubmit,
  loading,
  history = []
}) {
  const isCross = mode === 'cross';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  // Dışarı tıklamayı dinle
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Geçmişteki cross referans kayıtları
  const crossHistory = useMemo(() => {
    return (history || []).filter((h) => h.type === 'cross');
  }, [history]);

  // Yazılan kod ile birebir tam eşleşen geçmiş kaydı var mı?
  const exactMatchEntry = useMemo(() => {
    if (!isCross || !value.trim()) return null;
    const norm = normalizeCode(value);
    return crossHistory.find((h) => normalizeCode(h.title) === norm) || null;
  }, [isCross, value, crossHistory]);

  // Yazılan metne göre öneri listesi
  const suggestions = useMemo(() => {
    if (!isCross || !value.trim()) return [];
    const norm = normalizeCode(value);
    return crossHistory
      .filter((h) => {
        const hNorm = normalizeCode(h.title);
        return hNorm.includes(norm) && hNorm !== norm;
      })
      .slice(0, 5);
  }, [isCross, value, crossHistory]);

  const handleSelectSuggestion = (item) => {
    onChange(item.title);
    setIsDropdownOpen(false);
  };

  return (
    <div ref={containerRef} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 space-y-3">
      <form onSubmit={(e) => onSubmit(e, false)} className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          {isCross ? (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          ) : (
            <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          )}

          <input
            type={isCross ? "text" : "url"}
            placeholder={
              isCross
                ? "Filtre / Parça Kodu Girin (Örn: SO670, WP 12 120/1, ZP 13 F, W 712)..."
                : "Ürün Sayfası URL'si yapıştırın (Mann, Fleetguard, Donaldson, Micronic)..."
            }
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            required
          />

          {/* Autocomplete / Öneri Açılır Listesi */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Daha Önce Taranan Öneriler
              </div>
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectSuggestion(item)}
                  className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{item.title}</span>
                    {item.totalOems > 0 && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                        {item.totalOems} OEM
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 mr-1" />
                    {String(item.timestamp).split(',')[0]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ana Arama Butonu */}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isCross ? 'Siteler Taranıyor...' : 'Taranıyor...'}
            </>
          ) : (
            isCross ? 'Muadilleri Bul' : 'Veri Çek'
          )}
        </button>
      </form>

      {/* Daha Önce Taranmış Kod Uyarısı & Akıllı Seçenekler */}
      {exactMatchEntry && isCross && (
        <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>"{exactMatchEntry.title}" daha önce tarandı ve yerel depoda kayıtlı</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {exactMatchEntry.totalBrands ? `${exactMatchEntry.totalBrands} üretici, ${exactMatchEntry.totalOems || 0} OEM bulundu` : 'Kayıtlı veri mevcut'}
                {exactMatchEntry.timestamp && ` • ${String(exactMatchEntry.timestamp).split(',')[0]}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            {/* 1. Önbellekten Aç Butonu */}
            <button
              type="button"
              onClick={(e) => onSubmit(e, false)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-all shadow-xs disabled:opacity-50"
              title="Diskte kayıtlı veriyi anında açar (0 ms)"
            >
              <HardDrive className="w-3.5 h-3.5" />
              Önbellekten Aç (0 ms)
            </button>

            {/* 2. Canlı Tekrar Tara Butonu */}
            <button
              type="button"
              onClick={(e) => onSubmit(e, true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs transition-all shadow-xs disabled:opacity-50"
              title="Önbelleği atlayarak katalog sitelerini canlı olarak baştan tarar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Tekrar Tara
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

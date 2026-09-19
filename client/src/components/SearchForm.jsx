import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Loader2,
  HardDrive,
  RefreshCw,
  Clock,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  Layers,
  FileCheck
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
 * - Tekil Muadil Arama (1 Kod) ve Çift Referans Doğrulama & Kesişim Modu (A ⟷ B).
 * - Arama yaparken geçmişteki kayıtları önerir (Autocomplete).
 * - Girilen kod daha önce taranmışsa akıllı bildirim sunar.
 */
export function SearchForm({
  mode,
  crossType = 'single', // 'single' | 'dual'
  onCrossTypeChange,
  value,
  onChange,
  valueB = '',
  onChangeB,
  onSubmit,
  loading,
  history = []
}) {
  const isCross = mode === 'cross';
  const isDual = isCross && crossType === 'dual';

  const [isDropdownAOpen, setIsDropdownAOpen] = useState(false);
  const [isDropdownBOpen, setIsDropdownBOpen] = useState(false);
  const containerRef = useRef(null);

  // Dışarı tıklamayı dinle
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownAOpen(false);
        setIsDropdownBOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Geçmişteki cross referans kayıtları
  const crossHistory = useMemo(() => {
    return (history || []).filter((h) => h.type === 'cross');
  }, [history]);

  // Ref A için Tam Eşleşme
  const exactMatchEntry = useMemo(() => {
    if (!isCross || !value.trim() || isDual) return null;
    const norm = normalizeCode(value);
    return crossHistory.find((h) => normalizeCode(h.title) === norm) || null;
  }, [isCross, value, isDual, crossHistory]);

  // Ref A için Öneriler
  const suggestionsA = useMemo(() => {
    if (!isCross || !value.trim()) return [];
    const norm = normalizeCode(value);
    return crossHistory
      .filter((h) => {
        const hNorm = normalizeCode(h.title);
        return hNorm.includes(norm) && hNorm !== norm;
      })
      .slice(0, 5);
  }, [isCross, value, crossHistory]);

  // Ref B için Öneriler
  const suggestionsB = useMemo(() => {
    if (!isCross || !valueB.trim()) return [];
    const norm = normalizeCode(valueB);
    return crossHistory
      .filter((h) => {
        const hNorm = normalizeCode(h.title);
        return hNorm.includes(norm) && hNorm !== norm;
      })
      .slice(0, 5);
  }, [isCross, valueB, crossHistory]);

  return (
    <div ref={containerRef} className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 space-y-4">
      {/* 1. Cross Modu Alt Seçenekleri (Tekil vs Çift Referans Taraması) */}
      {isCross && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => onCrossTypeChange?.('single')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                crossType === 'single'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Tekil Referans Arama (1 Kod)
            </button>

            <button
              type="button"
              onClick={() => onCrossTypeChange?.('dual')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                crossType === 'dual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Çift Referans Doğrulama & Kesişim (A ⟷ B)
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:block font-medium">
            {isDual
              ? 'İki kodun karşılıklı teyidi ve ortak muadiller taranır (%100 Güven)'
              : '12 katalogda tekil filtre kodu taranır'}
          </div>
        </div>
      )}

      {/* 2. Arama Formu */}
      <form onSubmit={(e) => onSubmit(e, false)} className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Giriş Kutusu 1 (Ref A veya Tekil Kod / URL) */}
          <div className="flex-1 relative">
            {isCross ? (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            ) : (
              <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            )}

            <input
              type={isCross ? "text" : "url"}
              placeholder={
                isDual
                  ? "1. Referans Kodu (Ref A - Örn: W 712, SO670)..."
                  : isCross
                  ? "Filtre / Parça Kodu Girin (Örn: SO670, WP 12 120/1, A 46947, W 712)..."
                  : "Ürün Sayfası URL'si yapıştırın..."
              }
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setIsDropdownAOpen(true);
              }}
              onFocus={() => setIsDropdownAOpen(true)}
              required
            />

            {/* Öneri Listesi A */}
            {isDropdownAOpen && suggestionsA.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
                <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Önerilen Kodlar
                </div>
                {suggestionsA.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(item.title);
                      setIsDropdownAOpen(false);
                    }}
                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                  >
                    <span className="font-bold text-slate-800">{item.title}</span>
                    <span className="text-[10px] text-slate-400">{String(item.timestamp).split(',')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Giriş Kutusu 2 (Ref B - Yalnızca Çift Referans Modunda) */}
          {isDual && (
            <div className="flex-1 relative">
              <ArrowRightLeft className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5" />
              <input
                type="text"
                placeholder="2. Referans Kodu (Ref B - Örn: LF16015, SA 14776 K)..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium bg-blue-50/20"
                value={valueB}
                onChange={(e) => {
                  onChangeB?.(e.target.value);
                  setIsDropdownBOpen(true);
                }}
                onFocus={() => setIsDropdownBOpen(true)}
                required
              />

              {/* Öneri Listesi B */}
              {isDropdownBOpen && suggestionsB.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100">
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Önerilen Kodlar
                  </div>
                  {suggestionsB.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        onChangeB?.(item.title);
                        setIsDropdownBOpen(false);
                      }}
                      className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors text-xs"
                    >
                      <span className="font-bold text-slate-800">{item.title}</span>
                      <span className="text-[10px] text-slate-400">{String(item.timestamp).split(',')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Arama Butonu */}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isDual ? 'Karşılaştırılıyor...' : isCross ? 'Siteler Taranıyor...' : 'Taranıyor...'}
              </>
            ) : isDual ? (
              <>
                <FileCheck className="w-4 h-4" />
                Çift Referans Doğrula
              </>
            ) : isCross ? (
              'Muadilleri Bul'
            ) : (
              'Veri Çek'
            )}
          </button>
        </div>
      </form>

      {/* Daha Önce Taranmış Kod Uyarısı (Tekil Modda) */}
      {exactMatchEntry && isCross && !isDual && (
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

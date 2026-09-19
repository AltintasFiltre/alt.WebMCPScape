import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
  Layers,
  Award,
  Filter
} from 'lucide-react';

/**
 * DualVerificationBanner Component
 * 
 * İki referans kodu arasındaki çift yönlü doğrulama (A ⟷ B) durumunu,
 * karşılıklı eşleşme gücünü ve ortak kesişim istatistiklerini sunar.
 */
export function DualVerificationBanner({
  dualData,
  activeFilter,
  onFilterChange
}) {
  if (!dualData || !dualData.verification) return null;

  const {
    codeA,
    codeB,
    verification: {
      aContainsB,
      bContainsA,
      isGoldenMatch,
      isDirectMatch,
      statusText,
      badgeColor,
      mutualCount,
      onlyACount,
      onlyBCount,
      totalOems
    }
  } = dualData;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* 1. Üst Başlık & Çift Yönlü Doğrulama Rozeti */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Çift Referans Doğrulama & Kesişim Raporu
              </h3>
              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {codeA} ⟷ {codeB}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              12 katalog taranarak her iki kodun karşılıklı teyidi ve ortak muadilleri kesiştirildi.
            </p>
          </div>
        </div>

        {/* Eşleşme Durum Rozeti */}
        <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs ${badgeColor}`}>
          {isGoldenMatch ? (
            <Sparkles className="w-4 h-4 text-emerald-600 fill-current" />
          ) : isDirectMatch ? (
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <span>{statusText}</span>
        </div>
      </div>

      {/* 2. Çift Yönlü Teyit Durum Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Ref A -> Ref B */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Ref A ({codeA}) Taraması
            </span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {aContainsB ? `${codeB} bulundu ✓` : `${codeB} bulunamadı ✗`}
            </span>
          </div>
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              aContainsB
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {aContainsB ? '✓' : '—'}
          </span>
        </div>

        {/* Ref B -> Ref A */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">
              Ref B ({codeB}) Taraması
            </span>
            <span className="text-xs font-bold text-slate-800 mt-0.5 block">
              {bContainsA ? `${codeA} bulundu ✓` : `${codeA} bulunamadı ✗`}
            </span>
          </div>
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              bContainsA
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {bContainsA ? '✓' : '—'}
          </span>
        </div>

        {/* Ortak Kesişim Sayısı */}
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200/60 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 block">
              Ortak Doğrulanan Muadil
            </span>
            <span className="text-sm font-extrabold text-emerald-900 mt-0.5 block">
              {mutualCount} Muadil (%95 - %100 Güven)
            </span>
          </div>
          <Award className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      {/* 3. Kesişim Filtreleme Butonları */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          Kesişim Filtresi:
        </span>

        <button
          type="button"
          onClick={() => onFilterChange('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tüm Muadiller ({totalOems})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('MUTUAL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            activeFilter === 'MUTUAL'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          ⭐ Ortak Muadiller / %100 Güven ({mutualCount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('ONLY_A')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'ONLY_A'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100'
          }`}
        >
          Yalnızca Ref A ({onlyACount})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('ONLY_B')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'ONLY_B'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100'
          }`}
        >
          Yalnızca Ref B ({onlyBCount})
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Database
} from 'lucide-react';

/**
 * SourceStatusBanner Component
 * (Single Responsibility: Hangi sitelerin sorgulandığını, hangilerinde veri bulunduğunu/bulunamadığını görselleştirir)
 */
export function SourceStatusBanner({ sources = [], totalFound = 0, totalBrands = 0 }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!sources || sources.length === 0) return null;

  const successCount = sources.filter((s) => s.status === 'success').length;
  const emptyCount = sources.filter((s) => s.status === 'empty').length;
  const errorCount = sources.filter((s) => s.status === 'error').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-slate-50/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900">
                Katalog Tarama Raporu
              </span>
              <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {sources.length} Kaynak
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {successCount} kaynakta eşleşme bulundu • {emptyCount} kaynakta kayıt yok
              {errorCount > 0 && ` • ${errorCount} kaynakta hata`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> {successCount} Bulundu
            </span>
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <AlertCircle className="w-3.5 h-3.5" /> {emptyCount} Yok
            </span>
          </div>

          <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Grid */}
      {isOpen && (
        <div className="p-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white">
          {sources.map((src, idx) => {
            const isSuccess = src.status === 'success';
            const isError = src.status === 'error';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between ${
                  isSuccess
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    : isError
                    ? 'bg-red-50/40 border-red-200 hover:border-red-300'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : isError ? (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="font-bold text-xs text-slate-900 tracking-tight">
                      {src.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pl-6">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {(src.durationMs / 1000).toFixed(1)}s
                    </span>
                    <span>•</span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      {src.type}
                    </span>
                  </div>
                </div>

                <div>
                  {isSuccess ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {src.foundCount} Kod Bulundu
                    </span>
                  ) : isError ? (
                    <span className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Hata
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Veri Yok
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

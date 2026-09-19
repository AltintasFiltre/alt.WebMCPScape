import React from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Clock,
  Database,
  Sparkles
} from 'lucide-react';

/**
 * ScrapingProgressBar Component
 * 
 * Tarama esnasında canlı ilerleme çubuğu, anlık taranan üretici bilgisi
 * ve her bir sitenin tamamlanma durumunu (Bulundu / Kayıt Yok / Hata) gerçek zamanlı gösterir.
 */
export function ScrapingProgressBar({ progressState, queryCode }) {
  if (!progressState || !progressState.active) return null;

  const {
    totalScrapers = 10,
    completedCount = 0,
    currentScraper = '',
    sources = {},
    logs = []
  } = progressState;

  const percent = Math.min(100, Math.round((completedCount / (totalScrapers || 1)) * 100));

  // Kayıt sayıları
  const sourceList = Object.values(sources);
  const successCount = sourceList.filter((s) => s.status === 'success').length;
  const emptyCount = sourceList.filter((s) => s.status === 'empty').length;
  const totalOemsFound = sourceList.reduce((sum, s) => sum + (s.foundCount || 0), 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-md space-y-5 animate-in fade-in duration-300">
      {/* 1. Üst Başlık & Yüzde */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>"{queryCode}" İçin Canlı Katalog Taraması</span>
              <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                %{percent}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {completedCount} / {totalScrapers} Katalog Tamamlandı
              {totalOemsFound > 0 && ` • Şimdiden ${totalOemsFound} OEM kodu bulundu`}
            </p>
          </div>
        </div>

        {/* Canlı İstatistik Rozetleri */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> {successCount} Bulundu
          </span>
          <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5" /> {emptyCount} Yok
          </span>
        </div>
      </div>

      {/* 2. Animasyonlu Ana İlerleme Çubuğu */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out shadow-xs relative overflow-hidden"
            style={{ width: `${Math.max(5, percent)}%` }}
          >
            {/* Parıltı animasyonu */}
            <div className="absolute inset-0 bg-white/25 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* 3. Anlık Taranan Üretici Bildirim Şeridi */}
      {currentScraper && (
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-blue-900 font-semibold truncate">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <span className="truncate">
              Şu an taranıyor: <strong className="font-extrabold text-blue-800 uppercase tracking-wide">{currentScraper}</strong>
            </span>
          </div>
          <span className="text-[11px] font-mono text-blue-600/80 flex-shrink-0 bg-white px-2 py-0.5 rounded border border-blue-100 font-bold">
            Canlı İstek
          </span>
        </div>
      )}

      {/* 4. Tüm Katalogların Canlı Durum Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
        {sourceList.map((src, idx) => {
          const isDone = src.status === 'success' || src.status === 'empty' || src.status === 'error';
          const isSuccess = src.status === 'success';
          const isRunning = src.status === 'running';
          const isError = src.status === 'error';

          let cardStyle = 'bg-slate-50/60 border-slate-200 text-slate-400';
          if (isRunning) {
            cardStyle = 'bg-blue-50/90 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-400/30';
          } else if (isSuccess) {
            cardStyle = 'bg-emerald-50/80 border-emerald-200 text-emerald-900';
          } else if (isError) {
            cardStyle = 'bg-red-50/80 border-red-200 text-red-900';
          } else if (isDone) {
            cardStyle = 'bg-slate-100/70 border-slate-200 text-slate-600';
          }

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center justify-between gap-2 ${cardStyle}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                ) : isError ? (
                  <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                ) : isDone ? (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                )}
                <span className="font-bold truncate text-[11px]">
                  {src.name}
                </span>
              </div>

              <div className="flex-shrink-0">
                {isRunning ? (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded animate-pulse">
                    Taranıyor
                  </span>
                ) : isSuccess ? (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                    {src.foundCount} OEM
                  </span>
                ) : isError ? (
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.2 rounded">
                    Hata
                  </span>
                ) : isDone ? (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.2 rounded">
                    Kayıt Yok
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Bekliyor
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

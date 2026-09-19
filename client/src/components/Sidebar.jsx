import React from 'react';
import { History, Trash2, ChevronRight, X, HardDrive } from 'lucide-react';

/**
 * Sidebar Component (Single Responsibility: Sadece arama geçmişini listeler ve yönetir)
 */
export function Sidebar({ history, onSelect, onClear, onDeleteItem, currentSelected }) {
  return (
    <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
          <History className="w-4 h-4 text-blue-600" />
          <span>Kalıcı Tarama Geçmişi</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"
            title="Tüm Geçmişi ve Önbelleği Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Disk Storage Status Info */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1 font-medium">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          Yerel JSON Deposu
        </span>
        <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
          {history.length} Kayıt
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.map((entry) => {
          const isSelected = currentSelected === entry.title;
          return (
            <div
              key={entry.id || entry.title}
              className={`p-3 rounded-xl border transition-all hover:shadow-xs group relative ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                onClick={() => onSelect(entry)}
                className="cursor-pointer"
              >
                <div className="flex justify-between items-start mb-1 pr-6">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      entry.type === 'cross'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {entry.type === 'cross' ? 'Muadil Arama' : 'URL Kazıma'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {String(entry.timestamp).split(',')[0]}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate mb-1">
                  {entry.title}
                </div>
                <div className="flex items-center text-[10px] text-blue-600 font-medium">
                  Görüntüle <ChevronRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>

              {/* Tekil Kaydı Sil Butonu */}
              {onDeleteItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(entry.title);
                  }}
                  className="absolute top-2.5 right-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Bu kaydı sil"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {history.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-xs italic">
            Henüz tarama geçmişi bulunmuyor.
          </div>
        )}
      </div>
    </aside>
  );
}

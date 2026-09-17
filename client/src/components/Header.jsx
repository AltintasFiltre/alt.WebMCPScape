import React from 'react';
import { Layers, Search, ExternalLink } from 'lucide-react';

/**
 * Header Component (Single Responsibility: Başlık ve Mode Switcher)
 */
export function Header({ mode, onModeChange }) {
  return (
    <div className="space-y-4">
      <header className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Layers className="w-8 h-8 text-blue-600" />
          WebMCPScape
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Filtre kataloglarından otomatik çapraz referans muadilleri ve teknik detay kazıma motoru.
        </p>
      </header>

      {/* Mode Switcher */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl w-fit">
        <button
          onClick={() => onModeChange('cross')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === 'cross'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          Çoklu Sitede Muadil Arama (Cross-Reference)
        </button>
        <button
          onClick={() => onModeChange('url')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            mode === 'url'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Tekil Ürün URL Kazıma
        </button>
      </div>
    </div>
  );
}

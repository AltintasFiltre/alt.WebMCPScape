import React from 'react';
import { Search, ExternalLink, Loader2 } from 'lucide-react';

/**
 * SearchForm Component
 * (Single Responsibility & Interface Segregation: Mode'a göre uygun inputu render eder)
 */
export function SearchForm({ mode, value, onChange, onSubmit, loading }) {
  const isCross = mode === 'cross';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      <form onSubmit={onSubmit} className="flex flex-col md:flex-row gap-3">
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
                ? "Filtre / Parça Kodu Girin (Örn: WK 940/36 x, ZP 50, OC 132, P550006)..."
                : "Ürün Sayfası URL'si yapıştırın (Mann, Fleetguard, Donaldson, Micronic)..."
            }
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
          />
        </div>

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
    </div>
  );
}

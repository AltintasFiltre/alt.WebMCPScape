import React, { useState, useEffect } from 'react';
import { Search, Loader2, Table, Box, FileText, ExternalLink, History, Trash2, ChevronRight, Layers, Copy, Check } from 'lucide-react';

function App() {
  const [mode, setMode] = useState('cross'); // 'cross' (muadil arama) veya 'url' (tek sayfa)
  const [filterCode, setFilterCode] = useState('');
  const [crossResults, setCrossResults] = useState(null);
  const [crossLoading, setCrossLoading] = useState(false);
  const [crossCopied, setCrossCopied] = useState(false);

  // Tek sayfa kazıma state'leri
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Specification');
  const [copiedTab, setCopiedTab] = useState(null);
  const [history, setHistory] = useState([]);

  // LocalStorage'dan geçmişi yükle
  useEffect(() => {
    const savedHistory = localStorage.getItem('filter_scraper_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Geçmişi kaydet
  const saveToHistory = (type, title, result) => {
    const newEntry = {
      id: Date.now(),
      type, // 'cross' veya 'url'
      title,
      timestamp: new Date().toLocaleString(),
      data: result
    };
    const updatedHistory = [newEntry, ...history.filter(h => h.title !== title)].slice(0, 30);
    setHistory(updatedHistory);
    localStorage.setItem('filter_scraper_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('filter_scraper_history');
  };

  const loadFromHistory = (entry) => {
    if (entry.type === 'cross') {
      setMode('cross');
      setFilterCode(entry.title);
      setCrossResults(entry.data);
      setError(null);
    } else {
      setMode('url');
      setUrl(entry.title);
      setData(entry.data);
      setError(null);
    }
  };

  const copyToClipboard = (content, setCopied) => {
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCrossSearch = async (e) => {
    if (e) e.preventDefault();
    if (!filterCode.trim()) return;

    setCrossLoading(true);
    setError(null);
    setCrossResults(null);

    try {
      const isDev = window.location.port === '5173';
      const baseUrl = isDev ? 'http://localhost:4002' : '';
      const response = await fetch(`${baseUrl}/api/cross-search?code=${encodeURIComponent(filterCode.trim())}`);
      const result = await response.json();

      if (response.ok) {
        setCrossResults(result);
        saveToHistory('cross', filterCode.trim(), result);
      } else {
        setError(result.error || 'Muadil arama sırasında bir hata oluştu.');
      }
    } catch (err) {
      setError('Backend sunucusuna bağlanılamadı.');
    } finally {
      setCrossLoading(false);
    }
  };

  const handleScrape = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const isDev = window.location.port === '5173';
      const baseUrl = isDev ? 'http://localhost:4002' : '';
      const response = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(url.trim())}`);
      const result = await response.json();

      if (response.ok) {
        setData(result);
        saveToHistory('url', url.trim(), result);
      } else {
        setError(result.error || 'Veri çekilirken bir hata oluştu.');
      }
    } catch (err) {
      setError('Backend sunucusuna bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar - History */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <History className="w-4 h-4 text-blue-600" />
            Tarama Geçmişi
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors" title="Geçmişi Temizle">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {history.map((entry) => (
            <div 
              key={entry.id}
              onClick={() => loadFromHistory(entry)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                (mode === 'cross' && filterCode === entry.title) || (mode === 'url' && url === entry.title)
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  entry.type === 'cross' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {entry.type === 'cross' ? 'Muadil Arama' : 'URL Kazıma'}
                </span>
                <span className="text-[10px] text-slate-400">{entry.timestamp.split(',')[0]}</span>
              </div>
              <div className="text-xs font-semibold text-slate-800 truncate mb-1">{entry.title}</div>
              <div className="flex items-center text-[10px] text-blue-600 font-medium">
                Görüntüle <ChevronRight className="w-3 h-3 ml-0.5" />
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs italic">Henüz tarama geçmişi bulunmuyor.</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
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
              onClick={() => { setMode('cross'); setError(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'cross' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Çoklu Sitede Muadil Arama (Cross-Reference)
            </button>
            <button
              onClick={() => { setMode('url'); setError(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Tekil Ürün URL Kazıma
            </button>
          </div>

          {/* Search Box */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            {mode === 'cross' ? (
              <form onSubmit={handleCrossSearch} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Filtre / Parça Kodu Girin (Örn: ZP540, P550006, W 940/1, SO 580)..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                    value={filterCode}
                    onChange={(e) => setFilterCode(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={crossLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                >
                  {crossLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Siteler Taranıyor...</> : 'Muadilleri Bul'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="url"
                    placeholder="Ürün Sayfası URL'si yapıştırın (Mann, Fleetguard, Donaldson, Micronic)..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Taranıyor...</> : 'Veri Çek'}
                </button>
              </form>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* CROSS SEARCH RESULTS */}
          {mode === 'cross' && crossResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    "{filterCode}" İçin Bulunan Muadiller ({crossResults.length} Üretici)
                  </h2>
                </div>
                <button
                  onClick={() => copyToClipboard(crossResults, setCrossCopied)}
                  className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg transition-all text-xs font-bold shadow-sm"
                >
                  {crossCopied ? (
                    <span className="text-green-600 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Kopyalandı!</span>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 text-slate-500" /> JSON Formatında Kopyala</>
                  )}
                </button>
              </div>

              {crossResults.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-slate-200">
                  Bu filtre kodu için taranan sitelerde muadil eşleşmesi bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {crossResults.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                          <span className="font-extrabold text-sm text-slate-900 tracking-wide">{item['Üretici Adı']}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {item.Oems.length} Kod
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.Oems.map((oem, oIdx) => (
                          <span key={oIdx} className="bg-slate-50 border border-slate-200 hover:border-blue-400 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs">
                            {oem}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* JSON Preview Block */}
              {crossResults.length > 0 && (
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-slate-100 mt-6 shadow-inner">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2 pb-2 border-b border-slate-800 font-mono">
                    <span>JSON Format Çıktısı</span>
                    <span>{crossResults.length} üretici dizisi</span>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 overflow-x-auto p-2">
                    {JSON.stringify(crossResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* SINGLE URL SCRAPE RESULTS */}
          {mode === 'url' && data && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
              <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/50">
                {[
                  { id: 'Specification', label: 'Teknik Özellikler', icon: Box },
                  { id: 'OE Numaraları', label: 'OE Numaraları', icon: ExternalLink },
                  { id: 'Araçlar / Uygulamalar', label: 'Araç Uyumlulukları', icon: Table }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-xs font-bold transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      const content = activeTab === 'Specification' ? data.Specification : 
                                     activeTab === 'OE Numaraları' ? data.OENumbers : 
                                     data.Vehicles;
                      copyToClipboard(content, (val) => setCopiedTab(val ? activeTab : null));
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-all text-xs font-medium"
                  >
                    {copiedTab === activeTab ? (
                      <span className="text-green-600 flex items-center gap-1 font-bold">Kopyalandı!</span>
                    ) : (
                      <><FileText className="w-3.5 h-3.5" /> JSON Kopyala</>
                    )}
                  </button>
                </div>

                {activeTab === 'Specification' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.Specification.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">{item.key}</div>
                        <div className="text-sm font-bold text-slate-800">{item.value}</div>
                      </div>
                    ))}
                    {data.Specification.length === 0 && <p className="text-slate-400 italic text-xs">Veri bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'OE Numaraları' && (
                  <div className="space-y-4">
                    {data.OENumbers.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                        <h3 className="font-bold text-slate-800 mb-2.5 flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-3 bg-blue-600 rounded-full"></div>
                          {item['Üretici Adı']}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {item.Oems.map((oem, oIdx) => (
                            <span key={oIdx} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-md text-xs font-mono font-semibold">
                              {oem}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {data.OENumbers.length === 0 && <p className="text-slate-400 italic text-xs">Veri bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'Araçlar / Uygulamalar' && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          {data.Vehicles.length > 0 && Object.keys(data.Vehicles[0]).map((header) => (
                            <th key={header} className="p-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.Vehicles.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            {Object.values(row).map((val, vIdx) => (
                              <td key={vIdx} className="p-3 text-slate-600">
                                {val || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.Vehicles.length === 0 && <p className="text-slate-400 italic p-6 text-center text-xs">Veri bulunamadı.</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;


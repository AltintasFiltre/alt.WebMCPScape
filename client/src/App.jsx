import React, { useState, useEffect } from 'react';
import { Search, Loader2, Table, Box, FileText, ExternalLink, History, Trash2, ChevronRight } from 'lucide-react';

function App() {
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
  const saveToHistory = (url, result) => {
    const brand = url.includes('mann-filter') ? 'MANN' : 
                 url.includes('fleetguard') ? 'Fleetguard' : 
                 url.includes('donaldson') ? 'Donaldson' : 
                 url.includes('micronicfilter') ? 'Micronic' : 'Bilinmeyen';
    const newEntry = {
      id: Date.now(),
      url,
      brand,
      timestamp: new Date().toLocaleString(),
      data: result
    };
    const updatedHistory = [newEntry, ...history.filter(h => h.url !== url)].slice(0, 20); // Son 20 tarama
    setHistory(updatedHistory);
    localStorage.setItem('filter_scraper_history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('filter_scraper_history');
  };

  const loadFromHistory = (entry) => {
    setData(entry.data);
    setUrl(entry.url);
    setError(null);
  };

  const copyToClipboard = (tabName) => {
    const content = tabName === 'Specification' ? data.Specification : 
                   tabName === 'OE Numaraları' ? data.OENumbers : 
                   data.Vehicles;
    navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const CopyButton = ({ tabName }) => (
    <button
      onClick={() => copyToClipboard(tabName)}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-all text-sm font-medium"
    >
      {copiedTab === tabName ? (
        <span className="text-green-600 flex items-center gap-1">Kopyalandı!</span>
      ) : (
        <><FileText className="w-4 h-4" /> JSON Kopyala</>
      )}
    </button>
  );

  const handleScrape = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const isDev = window.location.port === '5173';
      const baseUrl = isDev ? 'http://localhost:4002' : '';
      const response = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(url)}`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result);
        saveToHistory(url, result);
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
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar - History */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <History className="w-5 h-5 text-blue-600" />
            Geçmiş Tarama
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.map((entry) => (
            <div 
              key={entry.id}
              onClick={() => loadFromHistory(entry)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${url === entry.url ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  entry.brand === 'MANN' ? 'bg-green-100 text-green-700' : 
                  entry.brand === 'Fleetguard' ? 'bg-red-100 text-red-700' : 
                  entry.brand === 'Micronic' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {entry.brand}
                </span>
                <span className="text-[10px] text-gray-400">{entry.timestamp.split(',')[0]}</span>
              </div>
              <div className="text-xs text-gray-600 truncate mb-1">{entry.url}</div>
              <div className="flex items-center text-[10px] text-blue-600 font-medium">
                Görüntüle <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm italic">Henüz tarama yapılmadı.</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Filter Scraper</h1>
            <p className="text-gray-600">Ürün sayfalarından Specification, OE ve Araç verilerini anında çekin.</p>
          </header>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
            <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="url"
                  placeholder="Ürün URL'sini yapıştırın..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Taranıyor...</> : 'Veri Çek'}
              </button>
            </form>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8 animate-pulse">
              {error}
            </div>
          )}

          {data && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="flex border-b overflow-x-auto bg-gray-50/50">
                {[
                  { id: 'Specification', icon: Box },
                  { id: 'OE Numaraları', icon: ExternalLink },
                  { id: 'Araçlar / Uygulamalar', icon: Table }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600 bg-white shadow-[0_4px_0_-2px_rgba(37,99,235,1)]'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.id}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <div className="flex justify-end mb-4">
                  <CopyButton tabName={activeTab} />
                </div>

                {activeTab === 'Specification' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.Specification.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">{item.key}</div>
                        <div className="text-lg font-bold text-gray-800">{item.value}</div>
                      </div>
                    ))}
                    {data.Specification.length === 0 && <p className="text-gray-400 italic">Veri bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'OE Numaraları' && (
                  <div className="space-y-6">
                    {data.OENumbers.map((item, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                          {item['Üretici Adı']}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {item.Oems.map((oem, oIdx) => (
                            <span key={oIdx} className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-md text-xs font-mono font-semibold">
                              {oem}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {data.OENumbers.length === 0 && <p className="text-gray-400 italic">Veri bulunamadı.</p>}
                  </div>
                )}

                {activeTab === 'Araçlar / Uygulamalar' && (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          {data.Vehicles.length > 0 && Object.keys(data.Vehicles[0]).map((header) => (
                            <th key={header} className="p-3 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.Vehicles.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            {Object.values(row).map((val, vIdx) => (
                              <td key={vIdx} className="p-3 text-xs text-gray-600">
                                {val || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.Vehicles.length === 0 && <p className="text-gray-400 italic p-8 text-center">Veri bulunamadı.</p>}
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

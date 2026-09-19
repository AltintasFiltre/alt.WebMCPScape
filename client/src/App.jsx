import React, { useState } from 'react';
import { ApiService } from './services/api';
import { useHistory } from './hooks/useHistory';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { CrossResultsView } from './components/CrossResultsView';
import { SingleScrapeView } from './components/SingleScrapeView';
import { ScrapingProgressBar } from './components/ScrapingProgressBar';

/**
 * App Root Component
 * 
 * SOLID Prensiplerine Uygun:
 * - State ve iş mantığı temiz custom hook ve API servislerine taşındı (SRP).
 * - Görsel bileşenler modüler hale getirildi (Header, Sidebar, SearchForm, CrossResultsView, SingleScrapeView, ScrapingProgressBar).
 * - Gerçek zamanlı SSE ilerleme takibi, tekil üreticiyi canlı tekrar tarama ve kalıcı JSON dosya önbelleği entegre edildi.
 */
function App() {
  const [mode, setMode] = useState('cross'); // 'cross' | 'url'
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState(null); // Tekil tekrar taranan üretici adı
  const [error, setError] = useState(null);

  // Cross arama sonuçları
  const [crossResults, setCrossResults] = useState(null);
  const [currentCrossCode, setCurrentCrossCode] = useState('');

  // Canlı Tarama İlerleme Durumu (SSE)
  const [progressState, setProgressState] = useState({
    active: false,
    totalScrapers: 12,
    completedCount: 0,
    currentScraper: '',
    sources: {}
  });

  // Tekil sayfa kazıma sonuçları
  const [scrapeData, setScrapeData] = useState(null);

  // History hook (Sunucu ve yerel disk senkronizasyonlu)
  const { history, saveToHistory, deleteHistoryItem, clearHistory } = useHistory();

  // Mode değiştirme
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    setInputVal('');
  };

  // Geçmişten seçim yapma (Önbellekteki veriyi anında getirir)
  const handleSelectHistory = async (entry) => {
    setError(null);
    if (entry.type === 'cross') {
      setMode('cross');
      setInputVal(entry.title);
      setCurrentCrossCode(entry.title);

      if (entry.data) {
        setCrossResults(entry.data);
      } else {
        // Disk önbelleğinden anında çek
        setLoading(true);
        try {
          const data = await ApiService.searchCrossReferences(entry.title, false);
          setCrossResults(data);
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      }
      setScrapeData(null);
    } else {
      setMode('url');
      setInputVal(entry.title);
      setScrapeData(entry.data);
      setCrossResults(null);
    }
  };

  // Tek bir üreticiyi tek başına canlı tekrar tarama (Tüm siteleri baştan taramadan)
  const handleRescanSingleSource = async (sourceName) => {
    if (!currentCrossCode || !sourceName) return;

    setLoadingSource(sourceName);
    setError(null);

    try {
      const response = await ApiService.searchSingleProvider(currentCrossCode, sourceName);
      if (response && response.updatedResponse) {
        setCrossResults(response.updatedResponse);
        saveToHistory('cross', currentCrossCode, response.updatedResponse);
      }
    } catch (err) {
      setError(`${sourceName} taranırken bir hata oluştu: ${err.message}`);
    } finally {
      setLoadingSource(null);
    }
  };

  // Arama formu submit (SSE ile Canlı İlerleme Takibi)
  const handleSubmit = async (e, forceRefresh = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputVal.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'cross') {
        setCrossResults(null);
        setCurrentCrossCode(inputVal.trim());

        // Canlı ilerleme state'ini başlat
        setProgressState({
          active: true,
          totalScrapers: 12,
          completedCount: 0,
          currentScraper: 'Katalog bağlantıları kuruluyor...',
          sources: {}
        });

        const data = await ApiService.searchCrossReferencesStream(
          inputVal.trim(),
          forceRefresh,
          (event) => {
            if (event.type === 'start') {
              const initialSources = {};
              (event.scrapers || []).forEach((s) => {
                initialSources[s.name] = {
                  name: s.name,
                  type: s.type,
                  status: 'pending',
                  foundCount: 0
                };
              });
              setProgressState((prev) => ({
                ...prev,
                totalScrapers: event.totalScrapers || 11,
                sources: initialSources
              }));
            } else if (event.type === 'scraper_start') {
              setProgressState((prev) => ({
                ...prev,
                currentScraper: event.name,
                sources: {
                  ...prev.sources,
                  [event.name]: {
                    ...(prev.sources[event.name] || { name: event.name }),
                    status: 'running'
                  }
                }
              }));
            } else if (event.type === 'scraper_done') {
              const rep = event.report;
              setProgressState((prev) => ({
                ...prev,
                completedCount: event.completedCount,
                sources: {
                  ...prev.sources,
                  [rep.name]: rep
                }
              }));
            } else if (event.type === 'complete') {
              setProgressState((prev) => ({
                ...prev,
                active: false
              }));
            }
          }
        );

        setCrossResults(data);
        saveToHistory('cross', inputVal.trim(), data);
      } else {
        setScrapeData(null);
        const data = await ApiService.scrapeUrl(inputVal.trim(), forceRefresh);
        setScrapeData(data);
        saveToHistory('url', inputVal.trim(), data);
      }
    } catch (err) {
      setError(err.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
      setProgressState((prev) => ({ ...prev, active: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar */}
      <Sidebar
        history={history}
        onSelect={handleSelectHistory}
        onClear={clearHistory}
        onDeleteItem={deleteHistoryItem}
        currentSelected={inputVal}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header & Mode Switcher */}
          <Header mode={mode} onModeChange={handleModeChange} />

          {/* Search Form Input */}
          <SearchForm
            mode={mode}
            value={inputVal}
            onChange={setInputVal}
            onSubmit={handleSubmit}
            loading={loading}
            history={history}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Canlı Tarama İlerleme Çubuğu ve Durum Kartları (Scraping esnasında görünür) */}
          {loading && mode === 'cross' && progressState.active && (
            <ScrapingProgressBar
              progressState={progressState}
              queryCode={currentCrossCode}
            />
          )}

          {/* Results: Cross Reference Mode */}
          {mode === 'cross' && !loading && (
            <CrossResultsView
              queryCode={currentCrossCode}
              searchResponse={crossResults}
              onForceRefresh={() => handleSubmit(null, true)}
              loading={loading}
              onRescanSource={handleRescanSingleSource}
              loadingSource={loadingSource}
            />
          )}

          {/* Results: Single URL Mode */}
          {mode === 'url' && (
            <SingleScrapeView
              data={scrapeData}
              onForceRefresh={() => handleSubmit(null, true)}
              loading={loading}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

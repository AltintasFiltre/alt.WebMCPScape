import React, { useState } from 'react';
import { ApiService } from './services/api';
import { useHistory } from './hooks/useHistory';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { CrossResultsView } from './components/CrossResultsView';
import { SingleScrapeView } from './components/SingleScrapeView';

/**
 * App Root Component
 * 
 * SOLID Prensiplerine Uygun:
 * - State ve iş mantığı temiz custom hook ve API servislerine taşındı (SRP).
 * - Görsel bileşenler modüler hale getirildi (Header, Sidebar, SearchForm, CrossResultsView, SingleScrapeView).
 * - Kod tekrarı ve monolitik karmaşa tamamen temizlendi.
 */
function App() {
  const [mode, setMode] = useState('cross'); // 'cross' | 'url'
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cross arama sonuçları
  const [crossResults, setCrossResults] = useState(null);
  const [currentCrossCode, setCurrentCrossCode] = useState('');

  // Tekil sayfa kazıma sonuçları
  const [scrapeData, setScrapeData] = useState(null);

  // History hook
  const { history, saveToHistory, clearHistory } = useHistory();

  // Mode değiştirme
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    setInputVal('');
  };

  // Geçmişten seçim yapma
  const handleSelectHistory = (entry) => {
    setError(null);
    if (entry.type === 'cross') {
      setMode('cross');
      setInputVal(entry.title);
      setCurrentCrossCode(entry.title);
      setCrossResults(entry.data);
      setScrapeData(null);
    } else {
      setMode('url');
      setInputVal(entry.title);
      setScrapeData(entry.data);
      setCrossResults(null);
    }
  };

  // Arama formu submit
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'cross') {
        setCrossResults(null);
        setCurrentCrossCode(inputVal.trim());
        const data = await ApiService.searchCrossReferences(inputVal.trim());
        setCrossResults(data);
        saveToHistory('cross', inputVal.trim(), data);
      } else {
        setScrapeData(null);
        const data = await ApiService.scrapeUrl(inputVal.trim());
        setScrapeData(data);
        saveToHistory('url', inputVal.trim(), data);
      }
    } catch (err) {
      setError(err.message || 'İşlem sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar */}
      <Sidebar
        history={history}
        onSelect={handleSelectHistory}
        onClear={clearHistory}
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
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Results: Cross Reference Mode */}
          {mode === 'cross' && (
            <CrossResultsView queryCode={currentCrossCode} searchResponse={crossResults} />
          )}

          {/* Results: Single URL Mode */}
          {mode === 'url' && (
            <SingleScrapeView data={scrapeData} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

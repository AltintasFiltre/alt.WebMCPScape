import { useState, useEffect } from 'react';

const STORAGE_KEY = 'filter_scraper_history';

/**
 * useHistory Custom Hook
 * Tarama geçmişini LocalStorage ile senkronize yönetir (SRP).
 */
export function useHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('History load error:', e);
    }
  }, []);

  const saveToHistory = (type, title, result) => {
    const newEntry = {
      id: Date.now(),
      type, // 'cross' | 'url'
      title,
      timestamp: new Date().toLocaleString(),
      data: result
    };
    const updated = [newEntry, ...history.filter((h) => h.title !== title)].slice(0, 30);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('History save error:', e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  };

  return {
    history,
    saveToHistory,
    clearHistory
  };
}

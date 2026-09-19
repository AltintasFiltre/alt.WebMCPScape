import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/api';

const STORAGE_KEY = 'filter_scraper_history';

/**
 * useHistory Custom Hook
 * Tarama geçmişini hem LocalStorage hem de Sunucu Dosya Önbelleği ile senkronize yönetir (SRP).
 */
export function useHistory() {
  const [history, setHistory] = useState([]);

  // Sunucudan ve LocalStorage'dan geçmişi yükle
  const loadHistory = useCallback(async () => {
    try {
      // 1. LocalStorage'dan hızlı yükle
      let localItems = [];
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        localItems = JSON.parse(saved);
      }

      // 2. Sunucu dosya geçmişini getir
      const serverItems = await ApiService.getHistory();
      if (Array.isArray(serverItems) && serverItems.length > 0) {
        // Sunucu geçmişi ile yerel geçmişi birleştir
        const merged = [...localItems];
        serverItems.forEach((sItem) => {
          if (!merged.some((m) => m.title.toUpperCase() === sItem.title.toUpperCase())) {
            merged.push({
              id: sItem.id || Date.now() + Math.random(),
              type: sItem.type || 'cross',
              title: sItem.title,
              timestamp: sItem.timestamp ? new Date(sItem.timestamp).toLocaleString() : new Date().toLocaleString(),
              data: null // Veri tıklandığında sunucu dosyasından otomatik gelecek
            });
          }
        });
        setHistory(merged.slice(0, 50));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 50)));
      } else {
        setHistory(localItems);
      }
    } catch (e) {
      console.error('History load error:', e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveToHistory = (type, title, result) => {
    const newEntry = {
      id: Date.now(),
      type, // 'cross' | 'url'
      title,
      timestamp: new Date().toLocaleString(),
      data: result
    };
    const updated = [newEntry, ...history.filter((h) => h.title.toUpperCase() !== title.toUpperCase())].slice(0, 50);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('History save error:', e);
    }
  };

  const deleteHistoryItem = async (title) => {
    const updated = history.filter((h) => h.title.toUpperCase() !== title.toUpperCase());
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await ApiService.deleteHistoryItem(title);
    } catch (e) {
      console.error('History delete error:', e);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      await ApiService.clearHistory();
    } catch (e) {
      console.error('History clear error:', e);
    }
  };

  return {
    history,
    saveToHistory,
    deleteHistoryItem,
    clearHistory,
    reloadHistory: loadHistory
  };
}

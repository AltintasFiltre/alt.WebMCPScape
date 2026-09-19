/**
 * API Service (Single Responsibility & Dependency Inversion)
 * Tüm backend HTTP isteklerini tek bir merkezden yönetir.
 */
const getBaseUrl = () => {
  const isDev = window.location.port === '5173';
  return isDev ? 'http://localhost:4002' : '';
};

export const ApiService = {
  async searchCrossReferences(code, forceRefresh = false) {
    if (!code || !code.trim()) {
      throw new Error('Filtre kodu gereklidir.');
    }
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/cross-search?code=${encodeURIComponent(code.trim())}${forceRefresh ? '&refresh=true' : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Muadil arama sırasında bir hata oluştu.');
    }
    return data;
  },

  /**
   * Canlı SSE Akışı ile Gerçek Zamanlı Muadil Arama & İlerleme Raporu
   */
  async searchCrossReferencesStream(code, forceRefresh = false, onProgress = null) {
    if (!code || !code.trim()) {
      throw new Error('Filtre kodu gereklidir.');
    }
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/cross-search-stream?code=${encodeURIComponent(code.trim())}${forceRefresh ? '&refresh=true' : ''}`;

    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(url);
      let finalResult = null;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'complete') {
            finalResult = data.data;
            if (typeof onProgress === 'function') {
              onProgress(data);
            }
            eventSource.close();
            resolve(finalResult);
          } else if (data.type === 'error') {
            eventSource.close();
            reject(new Error(data.error || 'Muadil arama sırasında hata oluştu.'));
          } else {
            if (typeof onProgress === 'function') {
              onProgress(data);
            }
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        eventSource.close();
        // Eğer zaten sonuç geldiyse hata fırlatma
        if (finalResult) {
          resolve(finalResult);
        } else {
          // Fallback olarak standart REST endpointini dene
          this.searchCrossReferences(code, forceRefresh)
            .then(resolve)
            .catch(reject);
        }
      };
    });
  },

  /**
   * Çift Referans Doğrulama (A ⟷ B) Canlı SSE Akışı
   */
  async searchDualCrossReferencesStream(codeA, codeB, forceRefresh = false, onProgress = null) {
    if (!codeA || !codeB) {
      throw new Error('Her iki referans kodu da gereklidir.');
    }
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/cross-search-dual-stream?codeA=${encodeURIComponent(codeA.trim())}&codeB=${encodeURIComponent(codeB.trim())}${forceRefresh ? '&refresh=true' : ''}`;

    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(url);
      let finalResult = null;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'complete') {
            finalResult = data.data;
            if (typeof onProgress === 'function') {
              onProgress(data);
            }
            eventSource.close();
            resolve(finalResult);
          } else if (data.type === 'error') {
            eventSource.close();
            reject(new Error(data.error || 'Çift referans doğrulama sırasında hata oluştu.'));
          } else {
            if (typeof onProgress === 'function') {
              onProgress(data);
            }
          }
        } catch (err) {
          console.error('Dual SSE parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        eventSource.close();
        if (finalResult) {
          resolve(finalResult);
        } else {
          reject(new Error('Çift referans akış bağlantısı kesildi.'));
        }
      };
    });
  },

  /**
   * Sadece TEK BİR üretici / katalog scraper'ını çalıştırır
   */
  async searchSingleProvider(code, scraperName) {
    if (!code || !scraperName) {
      throw new Error('Filtre kodu ve üretici adı gereklidir.');
    }
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/cross-search-single?code=${encodeURIComponent(code.trim())}&scraper=${encodeURIComponent(scraperName.trim())}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `${scraperName} taranırken bir hata oluştu.`);
    }
    return data;
  },

  /**
   * Filtre/OEM koduna ait ürün görsellerini getirir
   */
  async fetchOemImages(brand, oem) {
    if (!oem) return { images: [], googleSearchUrl: '' };
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/images?brand=${encodeURIComponent(brand || '')}&oem=${encodeURIComponent(oem.trim())}`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Fetch images error:', e);
    }
    return {
      brand,
      oem,
      images: [],
      googleSearchUrl: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${brand} ${oem} filter`.trim())}`
    };
  },

  async scrapeUrl(url) {
    if (!url || !url.trim()) {
      throw new Error('URL parametresi gereklidir.');
    }
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(url.trim())}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Veri çekilirken bir hata oluştu.');
    }
    return data;
  },

  async getHistory() {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/history`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Server history fetch error:', e);
    }
    return [];
  },

  async deleteHistoryItem(code) {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/history/${encodeURIComponent(code)}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (e) {
      console.warn('Server history delete error:', e);
      return false;
    }
  },

  async clearHistory() {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/history`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (e) {
      console.warn('Server history clear error:', e);
      return false;
    }
  }
};

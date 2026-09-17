/**
 * API Service (Single Responsibility & Dependency Inversion)
 * Tüm backend HTTP isteklerini tek bir merkezden yönetir.
 */
const getBaseUrl = () => {
  const isDev = window.location.port === '5173';
  return isDev ? 'http://localhost:4002' : '';
};

export const ApiService = {
  async searchCrossReferences(code) {
    if (!code || !code.trim()) {
      throw new Error('Filtre kodu gereklidir.');
    }
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/cross-search?code=${encodeURIComponent(code.trim())}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Muadil arama sırasında bir hata oluştu.');
    }
    return data;
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
  }
};

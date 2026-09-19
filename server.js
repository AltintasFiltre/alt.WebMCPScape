const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrape } = require('./scraper');
const { searchCrossReferences } = require('./crossScraper');
const { StorageService } = require('./src/services/StorageService');

const app = express();
const port = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Statik frontend dosyalarını servis et
app.use(express.static(path.join(__dirname, 'client/dist')));

// API endpoint for single page scraping (Dosya tabanlı önbellek destekli)
app.get('/api/scrape', async (req, res) => {
  const { url, refresh } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gereklidir.' });
  }

  const forceRefresh = refresh === 'true' || refresh === '1';

  try {
    // 1. Zorunlu yenileme istenmediyse diskteki JSON önbellekten oku
    if (!forceRefresh) {
      const cached = StorageService.getScrape(url);
      if (cached) {
        return res.json(cached);
      }
    }

    // 2. Önbellekte yoksa veya forceRefresh ise sayfayı kazı
    const data = await scrape(url);

    // 3. Sonuçları kalıcı JSON dosyası olarak diske kaydet
    if (data) {
      StorageService.saveScrape(url, data);
    }

    res.json({
      ...data,
      fromCache: false
    });
  } catch (error) {
    console.error('Scraping hatası:', error);
    res.status(500).json({ error: 'Veri çekilirken bir hata oluştu.', details: error.message });
  }
});

const { CrossReferenceService } = require('./src/services/CrossReferenceService');
const crossReferenceService = new CrossReferenceService();

// API endpoint for multi-site cross-reference search with SSE Live Progress
app.get('/api/cross-search-stream', async (req, res) => {
  const { code, refresh } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Filtre kodu parametresi (code) gereklidir.' });
  }

  const forceRefresh = refresh === 'true' || refresh === '1';

  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (res.flushHeaders) res.flushHeaders();

  const sendEvent = (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    // 1. Önbellek kontrolü
    if (!forceRefresh) {
      const cached = StorageService.getCrossReference(code);
      if (cached) {
        sendEvent({
          type: 'complete',
          data: {
            ...cached,
            fromCache: true
          }
        });
        return res.end();
      }
    }

    // 2. Canlı tarama ve anlık SSE ilerleme bildirimi
    const results = await crossReferenceService.search(code, (progressEvent) => {
      sendEvent(progressEvent);
    });

    // 3. Sonuçları kalıcı JSON olarak diske kaydet
    if (results && results.results) {
      StorageService.saveCrossReference(code, results);
    }

    res.end();
  } catch (error) {
    console.error('Cross-search stream error:', error);
    sendEvent({
      type: 'error',
      error: error.message || 'Muadil arama sırasında bir hata oluştu.'
    });
    res.end();
  }
});

// API endpoint: SADECE tek bir üretici/katalog scraper'ını çalıştır ve mevcut sonuca birleştir
app.get('/api/cross-search-single', async (req, res) => {
  const { code, scraper } = req.query;

  if (!code || !scraper) {
    return res.status(400).json({ error: 'Filtre kodu (code) ve üretici adı (scraper) gereklidir.' });
  }

  try {
    // 1. İlgili scraper'ı tek başına çalıştır
    const singleResult = await crossReferenceService.searchSingle(code, scraper);

    // 2. Mevcut kayıtlı sonucu diskten getir
    const existing = StorageService.getCrossReference(code);

    // 3. Mevcut sonuçla birleştir ve yeniden agrege et
    const updatedResponse = crossReferenceService.updateResponseWithSingleResult(existing, singleResult);

    // 4. Güncellenmiş sonucu diske kaydet
    StorageService.saveCrossReference(code, updatedResponse);

    res.json({
      singleResult,
      updatedResponse
    });
  } catch (error) {
    console.error(`Single search error for ${scraper}:`, error);
    res.status(500).json({ error: error.message || 'Üretici taranırken hata oluştu.' });
  }
});

const { ImageSearchService } = require('./src/services/ImageSearchService');
const { DualCrossVerificationService } = require('./src/services/DualCrossVerificationService');

// API endpoint: Çift Referans Doğrulama SSE Akışı (A ⟷ B Canlı Kesişim Taraması)
app.get('/api/cross-search-dual-stream', async (req, res) => {
  const { codeA, codeB, refresh } = req.query;

  if (!codeA || !codeB) {
    return res.status(400).json({ error: 'Her iki referans kodu (codeA ve codeB) gereklidir.' });
  }

  const forceRefresh = refresh === 'true' || refresh === '1';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent({
      type: 'start',
      queryCode: `${codeA} ⟷ ${codeB}`,
      totalScrapers: 12,
      isDual: true
    });

    // 1. Ref A için veri (Önbellek veya Canlı)
    let resA = null;
    if (!forceRefresh) {
      resA = StorageService.getCrossReference(codeA);
    }
    if (!resA) {
      resA = await crossReferenceService.search(codeA, (ev) => {
        sendEvent({ ...ev, prefix: `Ref A (${codeA})` });
      });
      if (resA?.results) StorageService.saveCrossReference(codeA, resA);
    }

    // 2. Ref B için veri (Önbellek veya Canlı)
    let resB = null;
    if (!forceRefresh) {
      resB = StorageService.getCrossReference(codeB);
    }
    if (!resB) {
      resB = await crossReferenceService.search(codeB, (ev) => {
        sendEvent({ ...ev, prefix: `Ref B (${codeB})` });
      });
      if (resB?.results) StorageService.saveCrossReference(codeB, resB);
    }

    // 3. Kesişim ve Çift Yönlü Doğrulama Analizi
    const dualAnalysis = DualCrossVerificationService.analyze(codeA, resA, codeB, resB);

    // 4. Diske kaydet
    const dualKey = `${codeA} + ${codeB}`;
    StorageService.saveCrossReference(dualKey, dualAnalysis);

    sendEvent({
      type: 'complete',
      data: dualAnalysis
    });

    res.end();
  } catch (error) {
    console.error('Dual cross-search stream error:', error);
    sendEvent({
      type: 'error',
      error: error.message || 'Çift referans doğrulama sırasında bir hata oluştu.'
    });
    res.end();
  }
});

// API endpoint for fetching OEM product images
app.get('/api/images', async (req, res) => {
  const { brand = '', oem = '' } = req.query;

  if (!oem) {
    return res.status(400).json({ error: 'OEM parametresi gereklidir.' });
  }

  try {
    const images = await ImageSearchService.searchImages(brand, oem, 6);
    const googleSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${brand} ${oem} filter`.trim())}`;

    res.json({
      brand,
      oem,
      images,
      googleSearchUrl
    });
  } catch (error) {
    console.error('Images search error:', error);
    res.status(500).json({ error: 'Görsel arama sırasında bir hata oluştu.' });
  }
});

// API endpoint for multi-site cross-reference search (Dosya tabanlı önbellek destekli)
app.get('/api/cross-search', async (req, res) => {
  const { code, refresh } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Filtre kodu parametresi (code) gereklidir.' });
  }

  const forceRefresh = refresh === 'true' || refresh === '1';

  try {
    // 1. Zorunlu yenileme istenmediyse diskteki JSON önbellekten oku
    if (!forceRefresh) {
      const cached = StorageService.getCrossReference(code);
      if (cached) {
        return res.json(cached);
      }
    }

    // 2. Önbellekte yoksa veya forceRefresh ise siteleri tara
    const results = await searchCrossReferences(code);

    // 3. Sonuçları kalıcı JSON dosyası olarak diske kaydet
    if (results && results.results) {
      StorageService.saveCrossReference(code, results);
    }

    res.json({
      ...results,
      fromCache: false
    });
  } catch (error) {
    console.error('Cross-search hatası:', error);
    res.status(500).json({ error: 'Muadil arama sırasında bir hata oluştu.', details: error.message });
  }
});

// API endpoint: Kayıtlı geçmiş listesi
app.get('/api/history', (req, res) => {
  try {
    const history = StorageService.getHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Geçmiş listesi alınamadı.' });
  }
});

// API endpoint: Tekil geçmiş / önbellek kaydını sil
app.delete('/api/history/:code', (req, res) => {
  const { code } = req.params;
  const success = StorageService.deleteItem(code);
  res.json({ success });
});

// API endpoint: Tüm geçmişi ve önbelleği temizle
app.delete('/api/history', (req, res) => {
  const success = StorageService.clearAll();
  res.json({ success });
});

// Diğer tüm rotaları frontend'e yönlendir (SPA desteği)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor.`);
});

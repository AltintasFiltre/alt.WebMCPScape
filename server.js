const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrape } = require('./scraper');
const { searchCrossReferences } = require('./crossScraper');

const app = express();
const port = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Statik frontend dosyalarını servis et
app.use(express.static(path.join(__dirname, 'client/dist')));

// API endpoint for single page scraping
app.get('/api/scrape', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parametresi gereklidir.' });
  }

  try {
    const data = await scrape(url);
    res.json(data);
  } catch (error) {
    console.error('Scraping hatası:', error);
    res.status(500).json({ error: 'Veri çekilirken bir hata oluştu.', details: error.message });
  }
});

// API endpoint for multi-site cross-reference search
app.get('/api/cross-search', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Filtre kodu parametresi (code) gereklidir.' });
  }

  try {
    const results = await searchCrossReferences(code);
    res.json(results);
  } catch (error) {
    console.error('Cross-search hatası:', error);
    res.status(500).json({ error: 'Muadil arama sırasında bir hata oluştu.', details: error.message });
  }
});

// Diğer tüm rotaları frontend'e yönlendir (SPA desteği)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor.`);
});

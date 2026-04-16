const { scrape } = require('./scraper');

(async () => {
  const url = 'https://catalog.micronicfilter.com/tr/product/0cab431b-d58a-4cb1-970e-0691e8859469';
  console.log("Micronic Test başlatılıyor...");
  try {
    const data = await scrape(url);
    console.log("Başarılı! Veri özeti:", JSON.stringify(data).slice(0, 500));
  } catch (err) {
    console.error("MICRONIC TEST HATASI:", err);
  }
})();

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  const url = 'https://catalog.micronicfilter.com/tr/product/0cab431b-d58a-4cb1-970e-0691e8859469';

  console.log(`Micronic Filter sayfası inceleniyor: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(5000);

    const data = await page.evaluate(() => {
      const info = {
        sections: Array.from(document.querySelectorAll('h1, h2, h3, h4, b, strong, .nav-link')).map(h => h.innerText.trim()).filter(t => t.length > 2),
        tables: Array.from(document.querySelectorAll('table')).map(t => ({
          rows: Array.from(t.querySelectorAll('tr')).map(r => Array.from(r.querySelectorAll('td, th')).map(c => c.innerText.trim()))
        }))
      };
      return info;
    });

    console.log("Bulunan Veriler:", JSON.stringify(data, null, 2));
    await page.screenshot({ path: 'micronic_debug.png' });

  } catch (error) {
    console.error("Hata:", error.message);
  } finally {
    await browser.close();
  }
})();

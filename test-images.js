import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('response', response => {
    if (response.url().includes('screenshot')) {
      console.log(`${response.status()} - ${response.url()}`);
    }
  });

  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });

  const images = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map(img => ({
      src: img.src,
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      currentSrc: img.currentSrc
    }));
  });

  console.log('\n📸 Images on page:');
  images.forEach((img, i) => {
    const loaded = img.complete && img.naturalWidth > 0;
    const status = loaded ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${img.src.split('/').pop() || 'unknown'}`);
    console.log(`   Loaded: ${loaded}, Size: ${img.naturalWidth}x${img.naturalHeight}`);
  });

  await browser.close();
})();

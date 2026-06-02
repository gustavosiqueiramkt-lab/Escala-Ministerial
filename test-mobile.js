import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log('🔍 Testing landing page in mobile viewport (375x812)...\n');

    // Wait for server
    let retries = 10;
    while (retries > 0) {
      try {
        await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded', timeout: 3000 });
        break;
      } catch (e) {
        retries--;
        if (retries === 0) throw new Error('Server not responding after 30s');
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log('✅ Page loaded\n');

    // Wait a bit for animations
    await new Promise(r => setTimeout(r, 1000));

    // Get viewport issues
    const issues = await page.evaluate(() => {
      const problems = [];

      // Check horizontal scroll at document level
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
        problems.push({
          type: 'HORIZONTAL_OVERFLOW',
          width: document.documentElement.scrollWidth,
          viewport: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        });
      }

      // Check each section
      document.querySelectorAll('section').forEach((section, idx) => {
        const rect = section.getBoundingClientRect();
        const sectionScroll = section.scrollWidth;
        const sectionViewport = section.clientWidth;

        // Check if section has internal horizontal overflow
        if (sectionScroll > sectionViewport + 1) {
          problems.push({
            type: 'SECTION_OVERFLOW',
            sectionIndex: idx,
            sectionText: section.querySelector('h2')?.textContent || 'No title',
            width: sectionScroll,
            viewport: sectionViewport,
            overflow: sectionScroll - sectionViewport
          });
        }

        // Check images that might be too large
        section.querySelectorAll('img').forEach(img => {
          const imgRect = img.getBoundingClientRect();
          if (imgRect.width > window.innerWidth) {
            problems.push({
              type: 'OVERSIZED_IMAGE',
              sectionIndex: idx,
              src: img.src.split('/').pop(),
              width: imgRect.width,
              viewport: window.innerWidth
            });
          }
        });
      });

      return problems;
    });

    // Check image sizes
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src.split('/').pop(),
        displayWidth: img.getBoundingClientRect().width,
        displayHeight: img.getBoundingClientRect().height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete
      }));
    });

    console.log('\n📸 Image loading check:');
    images.forEach(img => {
      const status = img.complete && img.naturalWidth > 0 ? '✅' : '❌';
      console.log(`${status} ${img.src}: ${img.displayWidth.toFixed(0)}x${img.displayHeight.toFixed(0)}px (actual: ${img.naturalWidth}x${img.naturalHeight})`);
    });

    if (issues.length === 0) {
      console.log('\n✅ No horizontal overflow issues detected');
    } else {
      console.log(`⚠️  Found ${issues.length} mobile issues:\n`);
      issues.forEach(issue => {
        console.log(`${issue.type}:`);
        console.log(`  ${JSON.stringify(issue, null, 2)}`);
      });
    }

    // Capture full page mobile
    await page.screenshot({
      path: 'mobile-full-page.png',
      fullPage: true
    });
    console.log('\n📸 Captured: mobile-full-page.png');

    // Scroll and capture each section
    const sections = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('section')).map(s => ({
        title: s.querySelector('h2')?.textContent || 'No title',
        top: s.getBoundingClientRect().top + window.scrollY
      }));
    });

    for (let i = 0; i < Math.min(sections.length, 5); i++) {
      await page.goto(`http://localhost:8080/#section-${i}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => window.scrollBy(0, 500));
      const sectionTitle = sections[i].title.slice(0, 30);
      await page.screenshot({
        path: `mobile-section-${i}.png`
      });
      console.log(`📸 Captured: mobile-section-${i}.png (${sectionTitle}...)`);
    }

    console.log('\n✅ Mobile test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

import { chromium } from 'playwright';
import fs from 'fs';

const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function auditPage(page, name, path = '/') {
  try {
    await page.goto(`http://localhost:8080${path}`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(1000);

    // Check for overflow issues
    const issues = await page.evaluate(() => {
      const problems = [];

      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
        problems.push({
          type: 'HORIZONTAL_OVERFLOW',
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        });
      }

      // Check all buttons are clickable
      document.querySelectorAll('button, a').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 44 && rect.height < 44 && el.offsetParent) {
          problems.push({
            type: 'SMALL_TAP_TARGET',
            text: el.textContent?.substring(0, 30),
            size: `${rect.width.toFixed(0)}x${rect.height.toFixed(0)}`
          });
        }
      });

      // Check text readability
      document.querySelectorAll('*').forEach(el => {
        if (el.offsetParent) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const textContent = el.textContent?.trim();

          if (fontSize < 12 && textContent && textContent.length > 20) {
            problems.push({
              type: 'SMALL_FONT',
              fontSize: fontSize.toFixed(1),
              text: textContent.substring(0, 30)
            });
          }
        }
      });

      return problems;
    });

    // Take screenshot
    await page.screenshot({ path: `audit-${name}.png` });

    return {
      name,
      path,
      status: issues.length === 0 ? '✅' : '⚠️',
      issueCount: issues.length,
      issues: issues.slice(0, 5)
    };
  } catch (error) {
    return {
      name,
      path,
      status: '❌',
      error: error.message.substring(0, 50)
    };
  }
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  const page = await context.newPage();

  console.log('🔍 Mobile App Audit (375x812px)\n');
  console.log('Testing key pages for mobile-friendliness...\n');

  const results = [];

  // Test main pages
  const pages = [
    ['Landing Page', '/'],
    ['Auth - Signup', '/auth?tab=signup'],
    ['Auth - Login', '/auth?tab=login'],
    ['Dashboard', '/dashboard'],
    ['Team', '/dashboard/team'],
    ['Services', '/dashboard/services'],
    ['Songs', '/dashboard/songs'],
    ['Pricing', '/pricing']
  ];

  for (const [name, path] of pages) {
    const result = await auditPage(page, name.replace(/\s+/g, '-').toLowerCase(), path);
    results.push(result);
    console.log(`${result.status} ${name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.issueCount > 0) {
      console.log(`   Issues found: ${result.issueCount}`);
      result.issues.forEach(issue => {
        console.log(`   - ${issue.type}`);
      });
    }
  }

  console.log('\n📊 Summary:');
  const passed = results.filter(r => r.status === '✅').length;
  const warned = results.filter(r => r.status === '⚠️').length;
  const failed = results.filter(r => r.status === '❌').length;

  console.log(`✅ Passed: ${passed}/${results.length}`);
  if (warned > 0) console.log(`⚠️  Warnings: ${warned}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);

  console.log('\n📸 Screenshots saved as audit-*.png');

  await browser.close();
})();

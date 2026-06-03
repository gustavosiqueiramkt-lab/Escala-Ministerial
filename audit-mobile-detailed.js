import { chromium } from 'playwright';

const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function analyzeLayout(page, name) {
  const analysis = await page.evaluate(() => {
    const issues = [];
    const elements = {
      buttons: 0,
      inputs: 0,
      smallText: 0,
      overflowX: 0
    };

    // Count elements
    elements.buttons = document.querySelectorAll('button').length;
    elements.inputs = document.querySelectorAll('input, textarea').length;

    // Check for horizontal overflow
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
      issues.push('⚠️ Horizontal overflow detected');
      elements.overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    }

    // Check small text
    let smallCount = 0;
    document.querySelectorAll('*').forEach(el => {
      if (el.offsetParent) {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 12 && el.textContent?.trim().length > 10) {
          smallCount++;
        }
      }
    });
    elements.smallText = smallCount;

    // Check touch targets
    let smallTargets = 0;
    document.querySelectorAll('button, a, input').forEach(el => {
      if (el.offsetParent) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          smallTargets++;
        }
      }
    });

    if (smallTargets > 0) {
      issues.push(`⚠️ ${smallTargets} small touch targets (< 44px)`);
    }

    return { issues, elements };
  });

  return {
    name,
    ...analysis
  };
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: MOBILE_VIEWPORT });
  const page = await context.newPage();

  console.log('📱 Detailed Mobile App Audit (375x812px)\n');

  // Check landing page
  console.log('Testing Landing Page...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle' });
  let result = await analyzeLayout(page, 'Landing Page');
  console.log(`✅ ${result.name}`);
  console.log(`   Buttons: ${result.elements.buttons}, Inputs: ${result.elements.inputs}`);
  if (result.elements.overflowX > 0) console.log(`   Overflow: ${result.elements.overflowX}px`);
  if (result.issues.length) result.issues.forEach(i => console.log(`   ${i}`));

  // Check auth pages
  console.log('\nTesting Auth Pages...');
  await page.goto('http://localhost:8080/auth?tab=signup', { waitUntil: 'networkidle' });
  result = await analyzeLayout(page, 'Signup Form');
  console.log(`✅ ${result.name}`);
  console.log(`   Buttons: ${result.elements.buttons}, Inputs: ${result.elements.inputs}`);
  if (result.issues.length) result.issues.forEach(i => console.log(`   ${i}`));

  await page.screenshot({ path: 'mobile-signup-form.png' });
  await page.screenshot({ path: 'mobile-form-responsive.png', fullPage: true });

  console.log('\n📱 Mobile-Friendly Features Check:');

  // Check viewport meta tag
  const viewportMeta = await page.evaluate(() => {
    return document.querySelector('meta[name="viewport"]')?.getAttribute('content');
  });
  console.log(`✅ Viewport meta: ${viewportMeta || 'Not found'}`);

  // Check touch optimization
  const touchFriendly = await page.evaluate(() => {
    const issues = [];

    // Check input types
    const emailInputs = Array.from(document.querySelectorAll('input[type="email"]')).length;
    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]')).length;
    const buttonSizes = Array.from(document.querySelectorAll('button')).filter(b => {
      const rect = b.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44;
    }).length;

    return {
      emailInputs,
      passwordInputs,
      buttonSizes: `${buttonSizes}/${Array.from(document.querySelectorAll('button')).length}`
    };
  });

  console.log(`✅ Email inputs: ${touchFriendly.emailInputs}`);
  console.log(`✅ Password inputs: ${touchFriendly.passwordInputs}`);
  console.log(`✅ Touch-friendly buttons: ${touchFriendly.buttonSizes}`);

  console.log('\n✅ Full page screenshots saved:');
  console.log('   - mobile-signup-form.png');
  console.log('   - mobile-form-responsive.png');

  await browser.close();
})();

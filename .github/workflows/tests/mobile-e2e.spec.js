const { test, expect, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://account-book-lenden-manager.vercel.app';
const OUT_DIR = path.join(process.cwd(), 'test-results');

test.use({
  ...devices['iPhone 13'], // 390x844 mobile viewport + touch
});

test('Real-user mobile E2E: firm setup, validation, data entry & persistence', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} -> ${req.failure()?.errorText || 'failed'}`);
  });

  // 1. Open Live App in Mobile View
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT_DIR, '01-initial-screen.png'), fullPage: true });

  // Check horizontal overflow on mobile
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  // 2. Test Empty Form Submission (Validation Check)
  const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save"), button:has-text("Submit")').first();
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT_DIR, '02-empty-submit-validation.png'), fullPage: true });
  }

  // 3. Fill Visible Text/Number Inputs with Dummy Data & Submit
  const textInputs = page.locator('input:visible:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])');
  const count = await textInputs.count();
  for (let i = 0; i < count; i++) {
    const input = textInputs.nth(i);
    const type = (await input.getAttribute('type')) || 'text';
    const placeholder = ((await input.getAttribute('placeholder')) || '').toLowerCase();

    if (type === 'number' || placeholder.includes('amount') || placeholder.includes('mobile') || placeholder.includes('phone')) {
      await input.fill(placeholder.includes('mobile') || placeholder.includes('phone') ? '9876543210' : '1500');
    } else if (type === 'date') {
      await input.fill('2026-11-23');
    } else if (placeholder.includes('gst')) {
      await input.fill('08AABCU9603R1ZM');
    } else {
      await input.fill(`Test Dummy ${i + 1}`);
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, '03-filled-form.png'), fullPage: true });

  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '04-after-submit.png'), fullPage: true });
  }

  // 4. Test Data Persistence Across Page Reload
  const bodyBeforeReload = await page.locator('body').innerText();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '05-after-reload.png'), fullPage: true });
  const bodyAfterReload = await page.locator('body').innerText();

  // Save structured error & diagnostic report
  const report = {
    url: APP_URL,
    viewport: '390x844 (iPhone 13)',
    hasHorizontalOverflow,
    dummyDataPersistedAfterReload: bodyAfterReload.includes('Test Dummy'),
    bodyLengthBeforeReload: bodyBeforeReload.length,
    bodyLengthAfterReload: bodyAfterReload.length,
    consoleErrors,
    pageErrors,
    failedRequests,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));

  // Fail test if critical runtime errors occurred
  expect(pageErrors, `Uncaught page errors: ${pageErrors.join(' | ')}`).toEqual([]);
});

const { test, expect, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://account-book-lenden-manager.vercel.app';
const OUT_DIR = path.join(process.cwd(), 'test-results');

test.use({
  ...devices['iPhone 13'], // 390x844 mobile viewport + touch
});

const BUSINESS_DATA = {
  firm: {
    legalName: 'Neelkanth Int Udyog & Briquettes',
    tradeName: 'Neelkanth Commercial',
    gstin: '08AAKCN4821R1Z5',
    mobile: '9829012345',
    address: 'Industrial Area, Hanumangarh, Rajasthan 335513',
  },
  ledger: {
    name: 'Rajasthan Coal & Fuel Suppliers',
    openingBalance: '25000',
    mobile: '9829055443',
    gstin: '08AABCR7712M1Z2',
    remarks: 'Supplier ledger for kiln fuel and raw material',
  },
  transaction: {
    party: 'Rajasthan Coal & Fuel Suppliers',
    item: 'High GCV Biomass Briquettes',
    quantity: '500',
    rate: '48',
    amount: '24000',
    voucherNo: 'VCH-2026-101',
    invoiceNo: 'INV-2026-204',
    date: '2026-11-23',
    narration: 'Commercial accounting verification entry - November 2026',
  },
};

function sanitizeText(text = '') {
  return text.replace(/\s+/g, ' ').trim();
}

async function fillFormSmartly(page, mode = 'transaction') {
  const inputs = page.locator(
    'input:visible:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
  );
  const inputCount = await inputs.count();

  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    if (!(await input.isEnabled().catch(() => false))) continue;

    const currentVal = await input.inputValue().catch(() => '');
    const type = ((await input.getAttribute('type')) || 'text').toLowerCase();
    const labelMeta = await input.evaluate((el) => {
      const id = el.getAttribute('id') || '';
      const associatedLabel = id
        ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || ''
        : '';
      const parentText = el.closest('div, label, fieldset')?.textContent || '';
      return [
        el.getAttribute('name') || '',
        el.getAttribute('placeholder') || '',
        el.getAttribute('aria-label') || '',
        associatedLabel,
        parentText.slice(0, 120),
      ]
        .join(' ')
        .toLowerCase();
    });

    if (labelMeta.includes('search')) continue;

    if (type === 'date' || labelMeta.includes('date')) {
      await input.fill(BUSINESS_DATA.transaction.date).catch(() => {});
      continue;
    }

    if (
      type === 'number' ||
      labelMeta.includes('amount') ||
      labelMeta.includes('rate') ||
      labelMeta.includes('price') ||
      labelMeta.includes('qty') ||
      labelMeta.includes('quantity') ||
      labelMeta.includes('balance') ||
      labelMeta.includes('total') ||
      labelMeta.includes('units') ||
      labelMeta.includes('pcs')
    ) {
      if (labelMeta.includes('qty') || labelMeta.includes('quantity') || labelMeta.includes('units') || labelMeta.includes('pcs')) {
        await input.fill(BUSINESS_DATA.transaction.quantity).catch(() => {});
      } else if (labelMeta.includes('rate') || labelMeta.includes('price')) {
        await input.fill(BUSINESS_DATA.transaction.rate).catch(() => {});
      } else if (mode === 'ledger') {
        await input.fill(BUSINESS_DATA.ledger.openingBalance).catch(() => {});
      } else {
        await input.fill(BUSINESS_DATA.transaction.amount).catch(() => {});
      }
      continue;
    }

    if (
      type === 'tel' ||
      labelMeta.includes('mobile') ||
      labelMeta.includes('phone') ||
      labelMeta.includes('contact')
    ) {
      await input.fill(mode === 'firm' ? BUSINESS_DATA.firm.mobile : BUSINESS_DATA.ledger.mobile).catch(() => {});
      continue;
    }

    if (labelMeta.includes('gst')) {
      await input.fill(mode === 'firm' ? BUSINESS_DATA.firm.gstin : BUSINESS_DATA.ledger.gstin).catch(() => {});
      continue;
    }

    if (labelMeta.includes('address') || labelMeta.includes('location') || labelMeta.includes('shahar')) {
      await input.fill(BUSINESS_DATA.firm.address).catch(() => {});
      continue;
    }

    if (labelMeta.includes('trade') || labelMeta.includes('brand')) {
      await input.fill(BUSINESS_DATA.firm.tradeName).catch(() => {});
      continue;
    }

    if (labelMeta.includes('invoice')) {
      await input.fill(BUSINESS_DATA.transaction.invoiceNo).catch(() => {});
      continue;
    }

    if (labelMeta.includes('voucher') || labelMeta.includes('receipt') || labelMeta.includes('ref')) {
      await input.fill(BUSINESS_DATA.transaction.voucherNo).catch(() => {});
      continue;
    }

    if (labelMeta.includes('item') || labelMeta.includes('material') || labelMeta.includes('product')) {
      await input.fill(BUSINESS_DATA.transaction.item).catch(() => {});
      continue;
    }

    if (labelMeta.includes('party') || labelMeta.includes('customer') || labelMeta.includes('supplier') || labelMeta.includes('account') || labelMeta.includes('khate')) {
      await input.fill(mode === 'ledger' ? BUSINESS_DATA.ledger.name : BUSINESS_DATA.transaction.party).catch(() => {});
      continue;
    }

    if (
      labelMeta.includes('narration') ||
      labelMeta.includes('remark') ||
      labelMeta.includes('note') ||
      labelMeta.includes('description')
    ) {
      await input.fill(BUSINESS_DATA.transaction.narration).catch(() => {});
      continue;
    }

    if (labelMeta.includes('firm') || labelMeta.includes('enterprise') || labelMeta.includes('company')) {
      await input.fill(BUSINESS_DATA.firm.legalName).catch(() => {});
      continue;
    }

    if (!currentVal) {
      await input.fill(mode === 'ledger' ? BUSINESS_DATA.ledger.name : BUSINESS_DATA.transaction.item).catch(() => {});
    }
  }

  const textareas = page.locator('textarea:visible');
  const taCount = await textareas.count();
  for (let j = 0; j < taCount; j++) {
    const ta = textareas.nth(j);
    if (await ta.isEnabled().catch(() => false)) {
      await ta.fill(BUSINESS_DATA.transaction.narration).catch(() => {});
    }
  }

  const selects = page.locator('select:visible');
  const selCount = await selects.count();
  for (let k = 0; k < selCount; k++) {
    const sel = selects.nth(k);
    const options = await sel.locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val !== null) {
        await sel.selectOption(val).catch(() => {});
      }
    }
  }
}

async function clickPrimaryAction(page, isFirmSetup = false) {
  const candidates = isFirmSetup
    ? ['button:visible:has-text("Create Enterprise")', 'button[type="submit"]:visible']
    : [
        'button:visible:has-text("Save & Create Account")',
        'button:visible:has-text("Save Invoice")',
        'button:visible:has-text("Save Purchase")',
        'button:visible:has-text("Save Voucher")',
        'button:visible:has-text("Save")',
        'button:visible:has-text("Submit")',
        'button:visible:has-text("Record")',
        'button:visible:has-text("Post")',
        'form button[type="submit"]:visible',
      ];

  for (const selector of candidates) {
    const btn = page.locator(selector).last();
    if (await btn.isVisible().catch(() => false)) {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      return selector;
    }
  }
  return null;
}

async function ensureBackOnDashboard(page) {
  const closeSelectors = [
    'button:visible:has-text("← Dashboard")',
    'button:visible:has-text("✕")',
    'button:visible:has-text("Close")',
    'button:visible:has-text("Back")',
  ];

  for (const sel of closeSelectors) {
    const btn = page.locator(sel).last();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  // Check if dashboard modules are visible; if still stuck in a modal, reload to return cleanly to Dashboard
  const isDashBack = await page.locator('text="All Accounting & ERP Modules"').isVisible().catch(() => false);
  if (!isDashBack) {
    await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

async function inspectLayoutMetrics(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const docOverflow = document.documentElement.scrollWidth > viewportWidth;
    const clippedOrOverflowing = [];

    const elements = Array.from(document.querySelectorAll('button, a, h1, h2, h3, label, input, select, span, p'));
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        rect.width === 0 ||
        rect.height === 0 ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      ) {
        continue;
      }

      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const exceedsViewport = rect.right > viewportWidth + 1 || rect.left < -1;
      const hasEllipsis = style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 2;

      if (exceedsViewport || hasEllipsis) {
        clippedOrOverflowing.push({
          tag: el.tagName.toLowerCase(),
          text: text.slice(0, 60),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth,
          hasEllipsis,
        });
      }
    }

    return {
      viewportWidth,
      docOverflow,
      clippedCount: clippedOrOverflowing.length,
      clippedSamples: clippedOrOverflowing.slice(0, 15),
    };
  });
}

test('Professional business user E2E across all accounting modules & aspects', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  page.on('dialog', async (dialog) => {
    await dialog.accept().catch(() => {});
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const moduleResults = [];
  let currentStep = '01-initial-load';

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ step: currentStep, text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push({
      step: currentStep,
      message: err.message,
      stack: (err.stack || '').split('\n').slice(0, 6),
    });
  });
  page.on('requestfailed', (req) => {
    failedRequests.push({
      step: currentStep,
      entry: `${req.method()} ${req.url()} -> ${req.failure()?.errorText || 'failed'}`,
    });
  });

  // 1. Initial Load & Mobile Layout Audit
  currentStep = '01-initial-load';
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT_DIR, '01-initial-screen.png'), fullPage: true });

  // 2. Empty Form Validation Check
  currentStep = '02-empty-submit-validation';
  const initialAction = await clickPrimaryAction(page, true);
  await page.screenshot({ path: path.join(OUT_DIR, '02-empty-submit-validation.png'), fullPage: true });

  // 3. Professional Firm Setup
  currentStep = '03-firm-setup';
  await fillFormSmartly(page, 'firm');
  await page.screenshot({ path: path.join(OUT_DIR, '03-firm-details-filled.png'), fullPage: true });
  const firmSubmittedWith = await clickPrimaryAction(page, true);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '04-dashboard-after-firm.png'), fullPage: true });

  const dashboardLayout = await inspectLayoutMetrics(page);

  // 4. Test All Accounting, Inventory, Kiln/Production & Voucher Aspects
  const aspectsToTest = [
    { name: 'Account Head / Ledger', mode: 'ledger', keywords: ['Add Account Head'] },
    { name: 'Sales / Tax Invoice', mode: 'transaction', keywords: ['Sales / Tax Invoice'] },
    { name: 'Purchase & Inward Stock', mode: 'transaction', keywords: ['Purchase & Inward Stock'] },
    { name: 'Voucher Entry (Payment/Receipt/JV)', mode: 'transaction', keywords: ['Voucher Entry'] },
    { name: 'Material Issue / Consumption', mode: 'transaction', keywords: ['Material Issue'] },
    { name: 'Production / Kiln / Brick Dispatch', mode: 'transaction', keywords: ['Production & Pakai'] },
    { name: 'Labour / Wages / Tractor', mode: 'transaction', keywords: ['Labour, Wages & Tractor'] },
    { name: 'Bill Settlement / Khata Milan', mode: 'transaction', keywords: ['Bill Settlement'] },
    { name: 'Financial Reports / Balance Sheet', mode: 'transaction', keywords: ['Financial Reports'] },
  ];

  let shotIndex = 5;

  for (const aspect of aspectsToTest) {
    currentStep = `module:${aspect.name}`;
    const errorsBefore = pageErrors.length + consoleErrors.length;
    const textBefore = await page.locator('body').innerText().catch(() => '');

    let clickedLabel = null;
    for (const kw of aspect.keywords) {
      const target = page.locator(`button:visible:has-text("${kw}")`).first();
      if (await target.isVisible().catch(() => false)) {
        clickedLabel = sanitizeText(await target.innerText().catch(() => kw));
        await target.scrollIntoViewIfNeeded().catch(() => {});
        await target.click({ force: true }).catch(() => {});
        await page.waitForTimeout(800);
        break;
      }
    }

    if (!clickedLabel) {
      moduleResults.push({
        aspect: aspect.name,
        found: false,
        actionTriggered: null,
        triggeredErrorOrConsole: false,
        uiChanged: false,
      });
      continue;
    }

    await fillFormSmartly(page, aspect.mode);
    const actionUsed = await clickPrimaryAction(page, false);
    const textAfter = await page.locator('body').innerText().catch(() => '');
    const errorsAfter = pageErrors.length + consoleErrors.length;

    if (shotIndex <= 14) {
      const fileName = `${String(shotIndex).padStart(2, '0')}-${aspect.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28)}.png`;
      await page.screenshot({ path: path.join(OUT_DIR, fileName), fullPage: true });
      shotIndex++;
    }

    moduleResults.push({
      aspect: aspect.name,
      found: true,
      clickedLabel,
      actionTriggered: actionUsed,
      triggeredErrorOrConsole: errorsAfter > errorsBefore,
      uiChanged: textAfter !== textBefore,
    });

    await ensureBackOnDashboard(page);
  }

  // 5. Reload Persistence & Balance Check
  currentStep = '05-after-reload';
  const beforeReloadText = await page.locator('body').innerText();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '15-after-reload-final.png'), fullPage: true });
  const afterReloadText = await page.locator('body').innerText();

  const report = {
    url: APP_URL,
    viewport: '390x844 (iPhone 13)',
    initialAction,
    firmSubmittedWith,
    dashboardLayout,
    moduleResults,
    persistedFirmName: afterReloadText.includes('Neelkanth Int Udyog'),
    persistedPartyOrItem:
      afterReloadText.includes('Rajasthan Coal & Fuel Suppliers') ||
      afterReloadText.includes('High GCV Biomass Briquettes'),
    beforeReloadLength: beforeReloadText.length,
    afterReloadLength: afterReloadText.length,
    consoleErrors,
    pageErrors,
    failedRequests,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));

  expect(pageErrors, `Uncaught page errors: ${pageErrors.map((e) => e.message).join(' | ')}`).toEqual([]);
});

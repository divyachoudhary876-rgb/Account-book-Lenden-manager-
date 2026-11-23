const { test, expect, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://account-book-lenden-manager.vercel.app';
const OUT_DIR = path.join(process.cwd(), 'test-results');

test.setTimeout(90000);

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

async function fillVisibleInputs(page, mode = 'transaction') {
  const inputs = page.locator(
    'input:visible:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])'
  );
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    const inp = inputs.nth(i);
    if (!(await inp.isEnabled().catch(() => false))) continue;

    const type = ((await inp.getAttribute('type')) || 'text').toLowerCase();
    const meta = await inp.evaluate((el) => {
      const id = el.getAttribute('id') || '';
      const lbl = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || '' : '';
      const ctx = el.closest('div, label, fieldset')?.textContent || '';
      return [
        el.getAttribute('name') || '',
        el.getAttribute('placeholder') || '',
        el.getAttribute('aria-label') || '',
        lbl,
        ctx.slice(0, 120),
      ]
        .join(' ')
        .toLowerCase();
    });

    if (meta.includes('search')) continue;

    if (type === 'date' || meta.includes('date')) {
      await inp.fill(BUSINESS_DATA.transaction.date).catch(() => {});
    } else if (
      type === 'number' ||
      meta.includes('amount') ||
      meta.includes('rate') ||
      meta.includes('price') ||
      meta.includes('qty') ||
      meta.includes('quantity') ||
      meta.includes('balance') ||
      meta.includes('total') ||
      meta.includes('units') ||
      meta.includes('pcs')
    ) {
      if (meta.includes('qty') || meta.includes('quantity') || meta.includes('units') || meta.includes('pcs')) {
        await inp.fill(BUSINESS_DATA.transaction.quantity).catch(() => {});
      } else if (meta.includes('rate') || meta.includes('price')) {
        await inp.fill(BUSINESS_DATA.transaction.rate).catch(() => {});
      } else if (mode === 'ledger') {
        await inp.fill(BUSINESS_DATA.ledger.openingBalance).catch(() => {});
      } else {
        await inp.fill(BUSINESS_DATA.transaction.amount).catch(() => {});
      }
    } else if (type === 'tel' || meta.includes('mobile') || meta.includes('phone')) {
      await inp.fill(mode === 'firm' ? BUSINESS_DATA.firm.mobile : BUSINESS_DATA.ledger.mobile).catch(() => {});
    } else if (meta.includes('gst')) {
      await inp.fill(mode === 'firm' ? BUSINESS_DATA.firm.gstin : BUSINESS_DATA.ledger.gstin).catch(() => {});
    } else if (meta.includes('address') || meta.includes('shahar')) {
      await inp.fill(BUSINESS_DATA.firm.address).catch(() => {});
    } else if (meta.includes('trade')) {
      await inp.fill(BUSINESS_DATA.firm.tradeName).catch(() => {});
    } else if (meta.includes('invoice')) {
      await inp.fill(BUSINESS_DATA.transaction.invoiceNo).catch(() => {});
    } else if (meta.includes('voucher') || meta.includes('receipt')) {
      await inp.fill(BUSINESS_DATA.transaction.voucherNo).catch(() => {});
    } else if (meta.includes('item') || meta.includes('material')) {
      await inp.fill(BUSINESS_DATA.transaction.item).catch(() => {});
    } else if (
      meta.includes('party') ||
      meta.includes('customer') ||
      meta.includes('supplier') ||
      meta.includes('account') ||
      meta.includes('khate')
    ) {
      await inp.fill(mode === 'ledger' ? BUSINESS_DATA.ledger.name : BUSINESS_DATA.transaction.party).catch(() => {});
    } else if (meta.includes('narration') || meta.includes('remark') || meta.includes('note')) {
      await inp.fill(BUSINESS_DATA.transaction.narration).catch(() => {});
    } else if (meta.includes('firm') || meta.includes('enterprise')) {
      await inp.fill(BUSINESS_DATA.firm.legalName).catch(() => {});
    }
  }

  const selects = page.locator('select:visible');
  const selCount = await selects.count();
  for (let k = 0; k < selCount; k++) {
    const sel = selects.nth(k);
    const options = await sel.locator('option').all();
    if (options.length > 1) {
      const val = await options[1].getAttribute('value');
      if (val && val !== 'CREATE_NEW' && val !== 'ADD_NEW_FY') {
        await sel.selectOption(val).catch(() => {});
      }
    }
  }
}

async function submitCurrentFormIfAny(page, allowCreateFirm = false) {
  const createFirmVisible = await page
    .locator('text="Register New Business Enterprise / Firm"')
    .isVisible()
    .catch(() => false);

  if (createFirmVisible && !allowCreateFirm) {
    return 'WRONG_MODAL_OPENED:Register New Business Enterprise / Firm';
  }

  const btn = page.locator('form button[type="submit"]:visible').last();
  if (await btn.isVisible().catch(() => false)) {
    await btn.scrollIntoViewIfNeeded().catch(() => {});
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    return 'form button[type="submit"]';
  }
  return null;
}

async function resetToDashboard(page) {
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(450);
}

test('Professional E2E & capture exact 404 URLs across all modules', async ({ page }) => {
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
    pageErrors.push({ step: currentStep, message: err.message });
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      failedRequests.push({
        step: currentStep,
        status: res.status(),
        url: res.url(),
      });
    }
  });
  page.on('requestfailed', (req) => {
    failedRequests.push({
      step: currentStep,
      status: 'REQUEST_FAILED',
      url: req.url(),
      reason: req.failure()?.errorText || 'failed',
    });
  });

  // 1. Initial Load & Firm Setup
  currentStep = '0

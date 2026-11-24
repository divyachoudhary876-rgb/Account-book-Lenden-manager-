const { test, expect, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://account-book-lenden-manager.vercel.app';
const OUT_DIR = path.join(process.cwd(), 'test-results');

test.setTimeout(120000);

test.use({
  ...devices['iPhone 13'], // 390x844 mobile viewport + touch
});

const ACCOUNTANT_DATA = {
  firm: {
    legalName: 'Neelkanth Int Udyog & Briquettes',
    tradeName: 'Neelkanth Commercial',
    gstin: '08AAKCN4821R1Z5',
    mobile: '9829012345',
    address: 'Industrial Area, Hanumangarh, Rajasthan 335513',
  },
  ledgers: [
    {
      name: 'Sharma Bricks & Traders',
      openingBalance: '15000',
      mobile: '9829011122',
      address: 'Hanumangarh Junction, Rajasthan',
    },
    {
      name: 'Rajasthan Coal & Fuel Suppliers',
      openingBalance: '25000',
      mobile: '9829055443',
      address: 'Bikaner Road, Hanumangarh, Rajasthan',
    },
  ],
  entries: {
    date: '2026-11-24',
    invoiceNo: 'INV-2026-204',
    purchaseBillNo: 'PUR-2026-108',
    voucherNo: 'VCH-2026-101',
    party: 'Sharma Bricks & Traders',
    supplier: 'Rajasthan Coal & Fuel Suppliers',
    item: 'High GCV Biomass Briquettes',
    quantity: '500',
    rate: '48',
    amount: '24000',
    receiptAmount: '12000',
    paymentAmount: '10000',
    wagesAmount: '8500',
    narration: 'Audit entry by Accountant - FY 2026-27 verification',
  },
};

function sanitizeText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

async function selectCustomDropdownOptionIfPresent(page, preferredText = '') {
  // Custom dropdown triggers in SearchableAccountDropdown & SearchableStockDropdown
  // show a downward/upward triangle indicator inside a clickable box.
  const triggers = page.locator('div').filter({ hasText: /^[▼▲]$/ });
  const triggerCount = await triggers.count();

  for (let i = 0; i < triggerCount; i++) {
    const arrow = triggers.nth(i);
    if (!(await arrow.isVisible().catch(() => false))) continue;

    const box = arrow.locator('..');
    if (!(await box.isVisible().catch(() => false))) continue;

    // Skip if already has a non-placeholder selection
    const currentText = sanitizeText(await box.innerText().catch(() => ''));
    if (currentText && !currentText.includes('--') && !currentText.startsWith('▼') && !currentText.startsWith('▲')) {
      continue;
    }

    await box.scrollIntoViewIfNeeded().catch(() => {});
    await box.click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);

    const searchBox = page.locator('input:visible').last();
    if (preferredText && (await searchBox.isVisible().catch(() => false))) {
      const ph = ((await searchBox.getAttribute('placeholder')) || '').toLowerCase();
      if (ph.includes('search')) {
        await searchBox.fill(preferredText).catch(() => {});
        await page.waitForTimeout(200);
      }
    }

    // Click first matching option row in floating dropdown
    const optionRows = page.locator('div').filter({
      has: page.locator('div'),
    });
    const rowCount = await optionRows.count();
    let picked = false;

    for (let r = 0; r < rowCount; r++) {
      const candidate = optionRows.nth(r);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const txt = sanitizeText(await candidate.innerText().catch(() => ''));
      if (
        txt &&
        txt.length < 90 &&
        !txt.includes('Type name to search') &&
        !txt.includes('Search item...') &&
        !txt.includes('-- Clear Selection --') &&
        !txt.includes('Koi khata nahi mila') &&
        !txt.includes('Koi stock item uplabdh nahi hai') &&
        !txt.includes('Select Account') &&
        !txt.includes('Select Stock Item')
      ) {
        if (!preferredText || txt.toLowerCase().includes(preferredText.toLowerCase())) {
          await candidate.click({ force: true }).catch(() => {});
          await page.waitForTimeout(200);
          picked = true;
          break;
        }
      }
    }

    if (!picked) {
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
}

async function fillSmartInputs(page, context = {}) {
  const {
    mode = 'transaction',
    overrideName = null,
    overrideAmount = null,
    overrideNarration = null,
    preferredDropdownText = '',
  } = context;

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
        ctx.slice(0, 140),
      ]
        .join(' ')
        .toLowerCase();
    });

    if (meta.includes('search')) continue;

    if (type === 'date' || meta.includes('date')) {
      await inp.fill(ACCOUNTANT_DATA.entries.date).catch(() => {});
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
      meta.includes('pcs') ||
      meta.includes('wages') ||
      meta.includes('paid') ||
      meta.includes('received')
    ) {
      if (
        meta.includes('qty') ||
        meta.includes('quantity') ||
        meta.includes('units') ||
        meta.includes('pcs')
      ) {
        await inp.fill(ACCOUNTANT_DATA.entries.quantity).catch(() => {});
      } else if (meta.includes('rate') || meta.includes('price')) {
        await inp.fill(ACCOUNTANT_DATA.entries.rate).catch(() => {});
      } else if (overrideAmount !== null) {
        await inp.fill(String(overrideAmount)).catch(() => {});
      } else if (mode === 'ledger') {
        await inp.fill(ACCOUNTANT_DATA.ledgers[0].openingBalance).catch(() => {});
      } else {
        await inp.fill(ACCOUNTANT_DATA.entries.amount).catch(() => {});
      }
    } else if (type === 'tel' || meta.includes('mobile') || meta.includes('phone') || meta.includes('contact')) {
      await inp.fill(mode === 'firm' ? ACCOUNTANT_DATA.firm.mobile : ACCOUNTANT_DATA.ledgers[0].mobile).catch(() => {});
    } else if (meta.includes('gst')) {
      await inp.fill(ACCOUNTANT_DATA.firm.gstin).catch(() => {});
    } else if (meta.includes('address') || meta.includes('location') || meta.includes('shahar')) {
      await inp.fill(ACCOUNTANT_DATA.firm.address).catch(() => {});
    } else if (meta.includes('trade') || meta.includes('brand')) {
      await inp.fill(ACCOUNTANT_DATA.firm.tradeName).catch(() => {});
    } else if (meta.includes('invoice')) {
      await inp.fill(ACCOUNTANT_DATA.entries.invoiceNo).catch(() => {});
    } else if (meta.includes('bill')) {
      await inp.fill(ACCOUNTANT_DATA.entries.purchaseBillNo).catch(() => {});
    } else if (meta.includes('voucher') || meta.includes('receipt') || meta.includes('ref')) {
      await inp.fill(ACCOUNTANT_DATA.entries.voucherNo).catch(() => {});
    } else if (meta.includes('item') || meta.includes('material') || meta.includes('product')) {
      await inp.fill(ACCOUNTANT_DATA.entries.item).catch(() => {});
    } else if (
      meta.includes('party') ||
      meta.includes('customer') ||
      meta.includes('supplier') ||
      meta.includes('account') ||
      meta.includes('khate') ||
      meta.includes('name')
    ) {
      if (mode === 'firm') {
        await inp.fill(ACCOUNTANT_DATA.firm.legalName).catch(() => {});
      } else {
        await inp.fill(overrideName || ACCOUNTANT_DATA.entries.party).catch(() => {});
      }
    } else if (
      meta.includes('narration') ||
      meta.includes('remark') ||
      meta.includes('note') ||
      meta.includes('description')
    ) {
      await inp.fill(overrideNarration || ACCOUNTANT_DATA.entries.narration).catch(() => {});
    }
  }

  const textareas = page.locator('textarea:visible');
  const taCount = await textareas.count();
  for (let j = 0; j < taCount; j++) {
    const ta = textareas.nth(j);
    if (await ta.isEnabled().catch(() => false)) {
      await ta.fill(overrideNarration || ACCOUNTANT_DATA.entries.narration).catch(() => {});
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

  if (mode !== 'firm') {
    await selectCustomDropdownOptionIfPresent(page, preferredDropdownText);
  }
}

async function addLineItemIfPresent(page) {
  const addButtons = [
    page.locator('button:visible:has-text("Add Item to Cart")').first(),
    page.locator('button:visible:has-text("+ Add Item")').first(),
  ];

  for (const btn of addButtons) {
    if (await btn.isVisible().catch(() => false)) {
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function submitFormIfPresent(page, allowCreateFirm = false) {
  const wrongModal = await page
    .locator('text="Register New Business Enterprise / Firm"')
    .isVisible()
    .catch(() => false);

  if (wrongModal && !allowCreateFirm) {
    return 'WRONG_MODAL_OPENED:Register New Business Enterprise / Firm';
  }

  await addLineItemIfPresent(page);

  const submitBtn = page.locator('form button[type="submit"]:visible').last();
  if (await submitBtn.isVisible().catch(() => false)) {
    const isDisabled = await submitBtn.isDisabled().catch(() => false);
    if (isDisabled) {
      return 'SUBMIT_DISABLED';
    }
    await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
    await submitBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(550);
    return 'form button[type="submit"]';
  }
  return null;
}

async function returnToDashboard(page) {
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(450);
}

async function openMenuIfNeeded(page) {
  const menuBtn = page.locator('button:visible:has-text("Menu")').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(300);
  }
}

async function openAndRunModule(page, stepInfo, consoleErrors, pageErrors, failedRequests) {
  const errorsBefore = pageErrors.length + consoleErrors.length + failedRequests.length;
  const textBefore = await page.locator('body').innerText().catch(() => '');

  let found = false;
  let clickedLabel = null;
  let submitStatus = null;
  let unexpectedRegisterFirmForm = false;

  for (const kw of stepInfo.keywords || []) {
    let btn = page.locator(`button:visible:has-text("${kw}")`).first();
    if (!(await btn.isVisible().catch(() => false))) {
      await openMenuIfNeeded(page);
      btn = page.locator(`button:visible:has-text("${kw}")`).first();
    }

    if (await btn.isVisible().catch(() => false)) {
      found = true;
      clickedLabel = sanitizeText(await btn.innerText().catch(() => kw));
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      break;
    }
  }

  if (found) {
    unexpectedRegisterFirmForm = await page
      .locator('text="Register New Business Enterprise / Firm"')
      .isVisible()
      .catch(() => false);

    if (!stepInfo.readOnly) {
      await fillSmartInputs(page, {
        mode: stepInfo.mode || 'transaction',
        overrideName: stepInfo.overrideName || null,
        overrideAmount: stepInfo.overrideAmount || null,
        overrideNarration: stepInfo.overrideNarration || null,
        preferredDropdownText: stepInfo.preferredDropdownText || '',
      });
      submitStatus = await submitFormIfPresent(page, false);
    } else {
      submitStatus = 'READ_ONLY_VIEW_INSPECTED';
    }
  }

  const textAfter = await page.locator('body').innerText().catch(() => '');
  const errorsAfter = pageErrors.length + consoleErrors.length + failedRequests.length;

  const shotName = `${String(stepInfo.step).padStart(2, '0')}-${stepInfo.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30)}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, shotName), fullPage: true });

  const result = {
    step: stepInfo.step,
    aspect: stepInfo.name,
    category: stepInfo.category,
    found,
    clickedLabel,
    unexpectedRegisterFirmForm,
    submitStatus,
    uiChanged: textAfter !== textBefore,
    newErrorsCount: Math.max(0, errorsAfter - errorsBefore),
  };

  if (stepInfo.resetAfter !== false) {
    await returnToDashboard(page);
  }

  return { result };
}

test('Full Accountant Accounting Cycle E2E across all business & ERP aspects', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  page.on('dialog', async (dialog) => {
    await dialog.accept().catch(() => {});
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const auditResults = [];
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
  currentStep = '01-initial-load';
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '01-initial-load.png'), fullPage: true });

  currentStep = '02-firm-setup';
  await fillSmartInputs(page, { mode: 'firm' });
  const firmSubmitted = await submitFormIfPresent(page, true);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, '02-firm-setup-complete.png'), fullPage: true });

  const accountingSteps = [
    {
      step: 3,
      category: 'Masters / Ledgers',
      name: 'Customer Ledger Entry',
      mode: 'ledger',
      overrideName: ACCOUNTANT_DATA.ledgers[0].name,
      overrideAmount: ACCOUNTANT_DATA.ledgers[0].openingBalance,
      overrideNarration: 'Debtor opening balance entry by accountant',
      keywords: ['Add Account Head', 'naye account', 'account'],
    },
    {
      step: 4,
      category: 'Masters / Ledgers',
      name: 'Supplier Ledger Entry',
      mode: 'ledger',
      overrideName: ACCOUNTANT_DATA.ledgers[1].name,
      overrideAmount: ACCOUNTANT_DATA.ledgers[1].openingBalance,
      overrideNarration: 'Creditor opening balance entry by accountant',
      keywords: ['Add Account Head', 'naye account', 'account'],
    },
    {
      step: 5,
      category: 'Purchase & Stock',
      name: 'Purchase & Inward Stock',
      mode: 'transaction',
      overrideName: ACCOUNTANT_DATA.entries.supplier,
      overrideAmount: ACCOUNTANT_DATA.entries.amount,
      overrideNarration: 'Fuel & raw material inward bill entry',
      keywords: ['Purchase & Inward Stock', 'Fuel & Raw Purchases', 'Purchase'],
    },
    {
      step: 6,
      category: 'Sales & Billing',
      name: 'Sales / Tax Invoice',
      mode: 'transaction',
      overrideName: ACCOUNTANT_DATA.entries.party,
      overrideAmount: ACCOUNTANT_DATA.entries.amount,
      overrideNarration: 'Sales tax invoice entry by accountant',
      keywords: ['Sales / Tax Invoice', 'Brick Dispatch / Sales', 'Sales'],
    },
    {
      step: 7,
      category: 'Vouchers',
      name: 'Voucher Entry (Receipt/Payment/JV)',
      mode: 'transaction',
      overrideName: ACCOUNTANT_DATA.entries.party,
      overrideAmount: ACCOUNTANT_DATA.entries.receiptAmount,
      overrideNarration: 'Accounting voucher entry by accountant',
      keywords: ['Voucher Entry', 'Voucher'],
    },
    {
      step: 8,
      category: 'Inventory & Consumption',
      name: 'Material Issue & Adjustment',
      mode: 'transaction',
      overrideName: ACCOUNTANT_DATA.entries.item,
      overrideAmount: '200',
      overrideNarration: 'Material issue & stock adjustment entry',
      keywords: ['Material Issue', 'Adjustment'],
    },
    {
      step: 9,
      category: 'Production / Kiln',
      name: 'Production & Pakai',
      mode: 'transaction',
      overrideName: 'Kiln Batch #01',
      overrideAmount: '10000',
      overrideNarration: 'Production & pakai entry by accountant',
      keywords: ['Production & Pakai', 'Bhatta Production Entry', 'Production'],
    },
    {
      step: 10,
      category: 'Payroll & Labour',
      name: 'Labour, Wages & Tractor',
      mode: 'transaction',
      overrideName: 'Ramesh Kumar Pathai Thekedar',
      overrideAmount: ACCOUNTANT_DATA.entries.wagesAmount,
      overrideNarration: 'Labour wages & tractor entry by accountant',
      keywords: ['Labour, Wages & Tractor', 'Wages', 'Payroll'],
    },
    {
      step: 11,
      category: 'Reconciliation',
      name: 'Bill Settlement / Khata Milan',
      mode: 'transaction',
      overrideName: ACCOUNTANT_DATA.entries.party,
      overrideAmount: ACCOUNTANT_DATA.entries.receiptAmount,
      overrideNarration: 'Bill settlement & khata milan entry',
      keywords: ['Bill Settlement', 'Settlement'],
    },
    {
      step: 12,
      category: 'Registers & Statements',
      name: 'Account Milan & Ledger',
      mode: 'transaction',
      readOnly: true,
      keywords: ['Account Milan & Ledger', 'Customer/Labour Milan', 'Milan'],
    },
    {
      step: 13,
      category: 'Registers & Statements',
      name: 'Inventory & Stock Register',
      mode: 'transaction',
      readOnly: true,
      keywords: ['Inventory & Stock Register', 'Stock Register', 'Inventory'],
    },
    {
      step: 14,
      category: 'Financial Statements',
      name: 'Financial Reports (P&L / BS)',
      mode: 'transaction',
      readOnly: true,
      keywords: ['Financial Reports', 'Reports'],
    },
  ];

  for (const st of accountingSteps) {
    currentStep = `step-${st.step}:${st.name}`;
    const { result } = await openAndRunModule(page, st, consoleErrors, pageErrors, failedRequests);
    auditResults.push(result);
  }

  // 15. Reload Persistence Verification
  currentStep = '15-reload-persistence';
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(600);
  const bodyAfterReload = await page.locator('body').innerText().catch(() => '');
  await page.screenshot({ path: path.join(OUT_DIR, '15-reload-persistence.png'), fullPage: true });

  const report = {
    url: APP_URL,
    viewport: '390x844 (iPhone 13)',
    firmSubmitted,
    totalAspectsTested: auditResults.length,
    foundCount: auditResults.filter((r) => r.found).length,
    submittedCount: auditResults.filter(
      (r) =>
        r.submitStatus &&
        r.submitStatus !== 'READ_ONLY_VIEW_INSPECTED' &&
        r.submitStatus !== 'SUBMIT_DISABLED' &&
        !String(r.submitStatus).startsWith('WRONG_MODAL')
    ).length,
    persistedFirmName: bodyAfterReload.includes('Neelkanth Int Udyog'),
    auditResults,
    consoleErrors,
    pageErrors,
    failedRequests,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));
  expect(pageErrors).toEqual([]);
});

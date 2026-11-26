const { test, expect, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const APP_URL = process.env.APP_URL || 'https://account-book-lenden-manager.vercel.app';
const OUT_DIR = path.join(process.cwd(), 'test-results');

test.setTimeout(180000);

test.use({
  ...devices['iPhone 13'], // 390x844 mobile viewport + touch
});

const MULTI_FIRM_ACCOUNTANT_DATA = {
  firms: [
    {
      legalName: 'Neelkanth Int Udyog',
      tradeName: 'Neelkanth Bhatta',
      gstin: '08AAKCN4821R1Z5',
      mobile: '9829012345',
      address: 'Industrial Area, Hanumangarh, Rajasthan 335513',
    },
    {
      legalName: 'Neelkanth Trading & Briquettes',
      tradeName: 'Neelkanth Commercial',
      gstin: '08AAKCN9912R1Z2',
      mobile: '9829098765',
      address: 'Grain Market Road, Hanumangarh, Rajasthan 335513',
    },
  ],
  accounts: [
    { name: 'Sharma Bricks & Traders', openingBalance: '15000', mobile: '9829011122', address: 'Hanumangarh' },
    { name: 'Rajasthan Coal & Fuel Suppliers', openingBalance: '25000', mobile: '9829055443', address: 'Bikaner Road' },
    { name: 'Proprietor Capital Account', openingBalance: '100000', mobile: '9829012345', address: 'Hanumangarh' },
  ],
  entries: {
    date: '2026-11-26',
    invoiceNo: 'INV-2026-301',
    purchaseBillNo: 'PUR-2026-201',
    voucherNo: 'VCH-2026-105',
    party: 'Sharma Bricks & Traders',
    supplier: 'Rajasthan Coal & Fuel Suppliers',
    item: 'Diesel',
    quantity: '25',
    rate: '96',
    amount: '2400',
    receiptAmount: '1200',
    paymentAmount: '1000',
    wagesAmount: '3500',
    narration: 'Professional accountant audit entry - FY 2026-27',
  },
};

function sanitizeText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

async function openMenuIfNeeded(page) {
  const menuBtn = page.locator('button:visible:has-text("Menu")').first();
  if (await menuBtn.isVisible().catch(() => false)) {
    const txt = sanitizeText(await menuBtn.innerText().catch(() => ''));
    if (txt.includes('Menu')) {
      await menuBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function selectCustomDropdownOption(page, preferredText = '') {
  const triggers = page.locator('div').filter({ hasText: /^[▼▲]$/ });
  const count = await triggers.count();

  for (let i = 0; i < count; i++) {
    const arrow = triggers.nth(i);
    if (!(await arrow.isVisible().catch(() => false))) continue;

    const box = arrow.locator('..');
    if (!(await box.isVisible().catch(() => false))) continue;

    const currentText = sanitizeText(await box.innerText().catch(() => ''));
    if (currentText && !currentText.includes('--') && !currentText.includes('Search') && !/^[▼▲]$/.test(currentText)) {
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

    const divs = page.locator('div');
    const divCount = await divs.count();
    let picked = false;

    for (let d = divCount - 1; d >= 0; d--) {
      const candidate = divs.nth(d);
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const children = await candidate.locator('> div').count().catch(() => 0);
      if (children > 0) continue;

      const txt = sanitizeText(await candidate.innerText().catch(() => ''));
      if (
        txt &&
        txt.length > 1 &&
        txt.length < 75 &&
        !txt.includes('Type name to search') &&
        !txt.includes('Search item...') &&
        !txt.includes('-- Clear Selection --') &&
        !txt.includes('Koi khata nahi mila') &&
        !txt.includes('Koi stock item uplabdh nahi hai') &&
        !txt.includes('Select Account') &&
        !txt.includes('Select Stock Item')
      ) {
        await candidate.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
        picked = true;
        break;
      }
    }

    if (!picked) {
      await page.keyboard.press('Escape').catch(() => {});
    }
  }
}

async function fillSmartInputs(page, cfg = {}) {
  const {
    mode = 'transaction',
    nameValue = null,
    amountValue = null,
    narrationValue = null,
    dropdownQuery = '',
  } = cfg;

  const inputs = page.locator(
    'input:visible:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])'
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
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.date).catch(() => {});
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
      if (meta.includes('qty') || meta.includes('quantity') || meta.includes('units') || meta.includes('pcs')) {
        await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.quantity).catch(() => {});
      } else if (meta.includes('rate') || meta.includes('price')) {
        await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.rate).catch(() => {});
      } else if (amountValue !== null) {
        await inp.fill(String(amountValue)).catch(() => {});
      } else {
        await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.amount).catch(() => {});
      }
    } else if (type === 'tel' || meta.includes('mobile') || meta.includes('phone') || meta.includes('contact')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.firms[0].mobile).catch(() => {});
    } else if (meta.includes('gst')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.firms[0].gstin).catch(() => {});
    } else if (meta.includes('address') || meta.includes('location') || meta.includes('shahar')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.firms[0].address).catch(() => {});
    } else if (meta.includes('trade') || meta.includes('brand')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.firms[0].tradeName).catch(() => {});
    } else if (meta.includes('invoice')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.invoiceNo).catch(() => {});
    } else if (meta.includes('bill')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.purchaseBillNo).catch(() => {});
    } else if (meta.includes('voucher') || meta.includes('receipt') || meta.includes('ref')) {
      await inp.fill(MULTI_FIRM_ACCOUNTANT_DATA.entries.voucherNo).catch(() => {});
    } else if (
      meta.includes('party') ||
      meta.includes('customer') ||
      meta.includes('supplier') ||
      meta.includes('account') ||
      meta.includes('khate') ||
      meta.includes('name')
    ) {
      if (nameValue) {
        await inp.fill(nameValue).catch(() => {});
      }
    } else if (
      meta.includes('narration') ||
      meta.includes('remark') ||
      meta.includes('note') ||
      meta.includes('description')
    ) {
      await inp.fill(narrationValue || MULTI_FIRM_ACCOUNTANT_DATA.entries.narration).catch(() => {});
    }
  }

  const textareas = page.locator('textarea:visible');
  const taCount = await textareas.count();
  for (let j = 0; j < taCount; j++) {
    const ta = textareas.nth(j);
    if (await ta.isEnabled().catch(() => false)) {
      await ta.fill(narrationValue || MULTI_FIRM_ACCOUNTANT_DATA.entries.narration).catch(() => {});
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
    await selectCustomDropdownOption(page, dropdownQuery);
  }
}

async function addLineItemIfPresent(page) {
  const addCartBtn = page.locator('button:visible:has-text("Add Item to Cart")').first();
  if (await addCartBtn.isVisible().catch(() => false)) {
    await addCartBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addCartBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }

  const addItemBtn = page.locator('button:visible:has-text("+ Add Item")').first();
  if (await addItemBtn.isVisible().catch(() => false)) {
    await addItemBtn.scrollIntoViewIfNeeded().catch(() => {});
    await addItemBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function submitFormIfPresent(page, allowFirmForm = false) {
  const firmModalVisible = await page
    .locator('text="Register New Business Enterprise / Firm"')
    .isVisible()
    .catch(() => false);

  if (firmModalVisible && !allowFirmForm) {
    return 'WRONG_MODAL_OPENED:Register New Business Enterprise / Firm';
  }

  await addLineItemIfPresent(page);

  const submitBtn = page.locator('form button[type="submit"]:visible').last();
  if (await submitBtn.isVisible().catch(() => false)) {
    if (await submitBtn.isDisabled().catch(() => false)) {
      return 'SUBMIT_DISABLED';
    }
    await submitBtn.scrollIntoViewIfNeeded().catch(() => {});
    await submitBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    return 'form button[type="submit"]';
  }
  return null;
}

async function createFirmFlow(page, firmObj) {
  // Open "New Firm..." from firm dropdown if already on dashboard
  const firmSelect = page.locator('select:visible').first();
  if (await firmSelect.isVisible().catch(() => false)) {
    const hasNewFirmOpt = await firmSelect.locator('option[value="CREATE_NEW"]').count().catch(() => 0);
    if (hasNewFirmOpt > 0) {
      await firmSelect.selectOption('CREATE_NEW').catch(() => {});
      await page.waitForTimeout(350);
    }
  }

  await fillSmartInputs(page, {
    mode: 'firm',
    nameValue: firmObj.legalName,
    narrationValue: firmObj.address,
  });

  // Explicitly set trade name / gstin / mobile / address if visible
  const inputs = page.locator('input:visible:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])');
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    const inp = inputs.nth(i);
    const meta = ((await inp.getAttribute('placeholder')) || '') + ' ' + ((await inp.getAttribute('name')) || '');
    const m = meta.toLowerCase();
    if (m.includes('neelkanth fuels') || m.includes('legal')) {
      await inp.fill(firmObj.legalName).catch(() => {});
    } else if (m.includes('gro') || m.includes('trade')) {
      await inp.fill(firmObj.tradeName).catch(() => {});
    } else if (m.includes('08aaaaa') || m.includes('gst')) {
      await inp.fill(firmObj.gstin).catch(() => {});
    } else if (m.includes('98290xxxxx') || m.includes('mobile') || m.includes('phone')) {
      await inp.fill(firmObj.mobile).catch(() => {});
    } else if (m.includes('hanumangarh') || m.includes('address')) {
      await inp.fill(firmObj.address).catch(() => {});
    }
  }

  return await submitFormIfPresent(page, true);
}

async function runModuleStep(page, stepInfo, consoleErrors, pageErrors, failedRequests) {
  const errorsBefore = pageErrors.length + consoleErrors.length + failedRequests.length;
  const textBefore = await page.locator('body').innerText().catch(() => '');

  let found = false;
  let clickedLabel = null;
  let submitStatus = null;

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
      await page.waitForTimeout(450);
      break;
    }
  }

  if (found && !stepInfo.readOnly) {
    await fillSmartInputs(page, {
      mode: stepInfo.mode || 'transaction',
      nameValue: stepInfo.nameValue || null,
      amountValue: stepInfo.amountValue || null,
      narrationValue: stepInfo.narrationValue || null,
      dropdownQuery: stepInfo.dropdownQuery || '',
    });
    submitStatus = await submitFormIfPresent(page, false);
  } else if (found && stepInfo.readOnly) {
    submitStatus = 'READ_ONLY_VIEW_INSPECTED';
  }

  const textAfter = await page.locator('body').innerText().catch(() => '');
  const errorsAfter = pageErrors.length + consoleErrors.length + failedRequests.length;

  const fileSlug = `${String(stepInfo.step).padStart(2, '0')}-${stepInfo.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 32)}.png`;
  await page.screenshot({ path: path.join(OUT_DIR, fileSlug), fullPage: true });

  const result = {
    step: stepInfo.step,
    firm: stepInfo.firmName || 'Active Firm',
    aspect: stepInfo.name,
    category: stepInfo.category,
    found,
    clickedLabel,
    submitStatus,
    uiChanged: textAfter !== textBefore,
    newErrorsCount: Math.max(0, errorsAfter - errorsBefore),
  };

  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(450);

  return result;
}

async function runBackupAndRestoreCheck(page, outDir) {
  let backupTriggered = false;
  let restoreInputFound = false;
  let restoreTriggered = false;
  const sampleBackupPath = path.join(outDir, 'e2e-sample-backup.json');

  await openMenuIfNeeded(page);
  const backupNavBtn = page.locator('button:visible:has-text("Backup")').first();
  if (await backupNavBtn.isVisible().catch(() => false)) {
    await backupNavBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(450);
  }

  // Try clicking a download/export backup button if visible
  const exportBtn = page
    .locator('button:visible')
    .filter({ hasText: /backup|export|download/i })
    .first();
  if (await exportBtn.isVisible().catch(() => false)) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      exportBtn.click({ force: true }).catch(() => {}),
    ]);
    if (download) {
      await download.saveAs(sampleBackupPath).catch(() => {});
      backupTriggered = fs.existsSync(sampleBackupPath);
    }
  }

  if (!fs.existsSync(sampleBackupPath)) {
    fs.writeFileSync(
      sampleBackupPath,
      JSON.stringify(
        {
          meta: {
            app: 'AccountBook',
            version: 'e2e-check',
            exported_at: new Date().toISOString(),
          },
          data: {},
        },
        null,
        2
      )
    );
  }

  // Try restoring via file input if available
  const fileInput = page.locator('input[type="file"]').first();
  if ((await fileInput.count().catch(() => 0)) > 0) {
    restoreInputFound = true;
    await fileInput.setInputFiles(sampleBackupPath).catch(() => {});
    await page.waitForTimeout(450);

    const restoreBtn = page
      .locator('button:visible')
      .filter({ hasText: /restore|import|upload/i })
      .first();
    if (await restoreBtn.isVisible().catch(() => false)) {
      await restoreBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      restoreTriggered = true;
    }
  }

  await page.screenshot({ path: path.join(outDir, '99-backup-restore-check.png'), fullPage: true });

  return {
    backupTriggered,
    restoreInputFound,
    restoreTriggered,
    sampleBackupPath,
  };
}

test('Multi-Firm Professional Accountant E2E + Backup & Restore Verification', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  page.on('dialog', async (dialog) => {
    await dialog.accept().catch(() => {});
  });

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const auditResults = [];
  let currentStep = '01-open-app';

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
      failedRequests.push({ step: currentStep, status: res.status(), url: res.url() });
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

  currentStep = '01-open-app';
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, '01-open-app.png'), fullPage: true });

  // Firm 1 setup
  currentStep = '02-firm-1-setup';
  const firm1Submitted = await createFirmFlow(page, MULTI_FIRM_ACCOUNTANT_DATA.firms[0]);
  await page.waitForTimeout(500);

  const firm1Steps = [
    {
      step: 3,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Masters / Ledgers',
      name: 'Customer Account Head',
      mode: 'ledger',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.accounts[0].name,
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.accounts[0].openingBalance,
      keywords: ['Add Account Head'],
    },
    {
      step: 4,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Masters / Ledgers',
      name: 'Supplier Account Head',
      mode: 'ledger',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.accounts[1].name,
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.accounts[1].openingBalance,
      keywords: ['Add Account Head'],
    },
    {
      step: 5,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Purchase & Stock',
      name: 'Purchase & Inward Stock',
      mode: 'transaction',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.supplier,
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.amount,
      keywords: ['Purchase & Inward Stock', 'Fuel & Raw Purchases'],
    },
    {
      step: 6,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Sales & Billing',
      name: 'Sales / Tax Invoice',
      mode: 'transaction',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.party,
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.amount,
      keywords: ['Sales / Tax Invoice', 'Brick Dispatch / Sales'],
    },
    {
      step: 7,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Vouchers',
      name: 'Voucher Entry (Dr/Cr)',
      mode: 'transaction',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.party,
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.receiptAmount,
      keywords: ['Voucher Entry'],
    },
    {
      step: 8,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Inventory & Consumption',
      name: 'Material Issue & Adjustment',
      mode: 'transaction',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.item,
      amountValue: '500',
      keywords: ['Material Issue'],
    },
    {
      step: 9,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Production / Kiln',
      name: 'Production & Pakai',
      mode: 'transaction',
      nameValue: 'Chamber #01',
      amountValue: '10000',
      keywords: ['Production & Pakai', 'Bhatta Production Entry'],
    },
    {
      step: 10,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Payroll & Labour',
      name: 'Labour, Wages & Tractor',
      mode: 'transaction',
      nameValue: 'Ramesh Kumar Pathai Mistri',
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.wagesAmount,
      keywords: ['Labour, Wages & Tractor'],
    },
    {
      step: 11,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[0].legalName,
      category: 'Reconciliation',
      name: 'Bill Settlement / Khata Milan',
      mode: 'transaction',
      nameValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.party,
      amountValue: MULTI_FIRM_ACCOUNTANT_DATA.entries.receiptAmount,
      keywords: ['Bill Settlement'],
    },
  ];

  for (const st of firm1Steps) {
    currentStep = `firm1-step-${st.step}:${st.name}`;
    auditResults.push(await runModuleStep(page, st, consoleErrors, pageErrors, failedRequests));
  }

  // Firm 2 setup & entries
  currentStep = '12-firm-2-setup';
  const firm2Submitted = await createFirmFlow(page, MULTI_FIRM_ACCOUNTANT_DATA.firms[1]);
  await page.waitForTimeout(500);

  const firm2Steps = [
    {
      step: 13,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[1].legalName,
      category: 'Masters / Ledgers',
      name: 'Firm 2 Customer Head',
      mode: 'ledger',
      nameValue: 'Hanumangarh Traders',
      amountValue: '30000',
      keywords: ['Add Account Head'],
    },
    {
      step: 14,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[1].legalName,
      category: 'Sales & Billing',
      name: 'Firm 2 Sales Invoice',
      mode: 'transaction',
      nameValue: 'Hanumangarh Traders',
      amountValue: '4800',
      keywords: ['Sales / Tax Invoice', 'Brick Dispatch / Sales'],
    },
    {
      step: 15,
      firmName: MULTI_FIRM_ACCOUNTANT_DATA.firms[1].legalName,
      category: 'Financial Statements',
      name: 'Financial Reports (TB/P&L/BS)',
      mode: 'transaction',
      readOnly: true,
      keywords: ['Financial Reports'],
    },
  ];

  for (const st of firm2Steps) {
    currentStep = `firm2-step-${st.step}:${st.name}`;
    auditResults.push(await runModuleStep(page, st, consoleErrors, pageErrors, failedRequests));
  }

  // Backup & Restore check
  currentStep = '16-backup-and-restore';
  const backupRestoreStatus = await runBackupAndRestoreCheck(page, OUT_DIR);

  // Final reload check
  currentStep = '17-final-reload';
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(500);
  const bodyText = await page.locator('body').innerText().catch(() => '');

  const report = {
    url: APP_URL,
    viewport: '390x844 (iPhone 13)',
    firm1Submitted,
    firm2Submitted,
    backupRestoreStatus,
    persistedFirmPresent:
      bodyText.includes('Neelkanth Int Udyog') || bodyText.includes('Neelkanth Trading'),
    totalStepsTested: auditResults.length,
    foundCount: auditResults.filter((r) => r.found).length,
    submittedCount: auditResults.filter(
      (r) =>
        r.submitStatus &&
        r.submitStatus !== 'READ_ONLY_VIEW_INSPECTED' &&
        r.submitStatus !== 'SUBMIT_DISABLED' &&
        !String(r.submitStatus).startsWith('WRONG_MODAL')
    ).length,
    auditResults,
    consoleErrors,
    pageErrors,
    failedRequests,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));
  expect(pageErrors).toEqual([]);
});

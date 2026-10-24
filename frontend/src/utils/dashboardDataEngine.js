/**
 * Frontend Utility: Dashboard Data Engine
 * Primary Dynamic Dashboard KPI Aggregation Engine with Strict Firm Isolation & Indian Accounting Standards (Ind AS) Compliance.
 */

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';
import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const normalizeKey = (name = '') => {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

export const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return String(firmInput.id || firmInput.firm_id || firmInput.firmId || '').trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

export const getFYDateRange = (fyString = '2026-27') => {
  try {
    const clean = String(fyString || '2026-27').replace(/FY\s*/i, '').trim();
    const parts = clean.split('-');
    if (parts.length === 2) {
      let startYear = parseInt(parts[0], 10);
      let endYear = startYear + 1;
      if (startYear < 100) startYear += 2000;
      if (endYear < 100) endYear += 2000;
      return {
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`,
        label: `FY ${startYear}-${(endYear % 100).toString().padStart(2, '0')}`
      };
    }
  } catch (e) {}
  return { startDate: '2026-04-01', endDate: '2027-03-31', label: 'FY 2026-27' };
};

export const getDynamicDashboardMetrics = (firmInput, selectedFY = '2026-27') => {
  const firmId = resolveFirmId(firmInput);

  let category = 'BRICK_KILN';
  if (firmInput && typeof firmInput === 'object') {
    category = String(firmInput.category || firmInput.business_category || firmInput.businessCategory || 'BRICK_KILN').toUpperCase();
  } else {
    try {
      const activeProf = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      if (activeProf.category || activeProf.business_category) {
        category = String(activeProf.category || activeProf.business_category).toUpperCase();
      }
    } catch (e) {}
  }

  const { startDate, endDate } = getFYDateRange(selectedFY);

  let rawVouchers = [];
  try {
    if (typeof getUniversalVouchersByFirm === 'function') {
      rawVouchers = getUniversalVouchersByFirm(firmId) || [];
    }
  } catch (e) {}

  const vKeys = [
    `app_vouchers_${firmId}`,
    `account_book_vouchers_${firmId}`,
    `app_invoices_${firmId}`,
    `sales_invoices_${firmId}`,
    `purchase_bills_${firmId}`,
    'app_vouchers',
    'account_book_vouchers',
    'sales_invoices',
    'purchase_bills',
    'app_invoices'
  ];

  const uniqueMap = new Map();
  vKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(v => {
            if (v) {
              const txFirm = String(v.firm_id || v.firmId || '').trim();
              if (txFirm && txFirm !== firmId && txFirm !== 'FIRM-001' && firmId !== 'FIRM-001') return;
              const uid = v.id || v.voucher_number || v.reference_no || `${v.voucher_date || v.date}-${v.amount || v.total_amount || 0}-${v.dr_account || ''}-${v.cr_account || ''}`;
              if (!uniqueMap.has(uid)) {
                uniqueMap.set(uid, v);
              }
            }
          });
        }
      }
    } catch (err) {}
  });

  rawVouchers = Array.from(uniqueMap.values());

  // Ingest Payroll / Wages
  const payrollKeys = [`payroll_records_${firmId}`, `worker_wages_${firmId}`, `worker_ledgers_${firmId}`, `wage_entries_${firmId}`];
  payrollKeys.forEach(pk => {
    try {
      const pVal = JSON.parse(localStorage.getItem(pk) || '[]');
      if (Array.isArray(pVal)) {
        pVal.forEach(p => {
          if (!p) return;
          const pDate = p.date || p.work_date || p.voucher_date || new Date().toISOString().slice(0, 10);
          const pAmt = parseFloat(p.amount || p.total_amount || p.kul_amount || p.earned || 0);
          const workerName = String(p.worker_name || p.worker || p.party || 'Labour Wages').trim();
          const expenseAcc = String(p.expense_account || p.category || 'Pathai & Labour Expenses').trim();
          
          if (pAmt > 0) {
            rawVouchers.push({
              id: p.id || `PAYROLL-${Math.random()}`,
              voucher_date: pDate,
              voucher_type: 'PAYROLL',
              reference_no: p.reference_no || 'WAGE',
              dr_account: expenseAcc,
              cr_account: workerName,
              amount: pAmt,
              narration: p.remarks || p.description || 'Labour Wages Entry'
            });
          }
        });
      }
    } catch (e) {}
  });

  // Ingest Material Consumption
  const consumptionKeys = [
    `material_consumption_records_${firmId}`, 
    `universal_material_adjustments_${firmId}`,
    `material_adjustments_${firmId}`,
    `app_consumption_${firmId}`,
    'material_consumption_records',
    'universal_material_adjustments'
  ];

  const consumptionRecordsList = [];
  consumptionKeys.forEach(ck => {
    try {
      const cVal = JSON.parse(localStorage.getItem(ck) || '[]');
      if (Array.isArray(cVal)) {
        cVal.forEach(c => {
          if (!c) return;
          consumptionRecordsList.push(c);
          const cDate = c.date || c.voucher_date || new Date().toISOString().slice(0, 10);
          
          const cAmt = parseFloat(
            c.total_value || 
            c.amount || 
            c.value || 
            c.total || 
            c.total_amount || 
            (Number(c.qty || c.quantity || 0) * Number(c.rate || c.unit_rate || 0)) ||
            (Array.isArray(c.items) && c.items.reduce((s, it) => s + Number(it.total || it.amount || (Number(it.qty || it.quantity || 0) * Number(it.rate || it.unit_rate || 0)) || 0), 0)) ||
            0
          );

          const expAcc = String(c.expense_category || c.expense_account || '').trim();
          const stockAcc = String(c.item_name || c.name || (c.items && c.items[0] && (c.items[0].name || c.items[0].item_name)) || 'Raw Material').trim() + ' Stock Account';

          if (cAmt > 0 && expAcc) {
            rawVouchers.push({
              id: c.id || `CONS-${Math.random()}`,
              voucher_date: cDate,
              voucher_type: 'CONSUMPTION',
              reference_no: c.reference_no || 'CONS',
              dr_account: expAcc,
              cr_account: stockAcc,
              amount: cAmt,
              narration: c.uses_for || c.remarks || c.description || 'Material Issue'
            });
          }
        });
      }
    } catch (e) {}
  });

  let stockItems = [];
  try {
    if (typeof getStockItemsByFirm === 'function') {
      stockItems = getStockItemsByFirm(firmId) || [];
    }
  } catch (e) {}

  if (!stockItems || stockItems.length === 0) {
    const invKeys = [`inventory_items_${firmId}`, `app_stock_${firmId}`, 'inventory_items'];
    for (const k of invKeys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          stockItems = parsed.map(item => ({
            ...item,
            current_stock: parseFloat(item.current_stock || item.stock || item.qty || 0),
            unit_purchase_price: parseFloat(item.unit_purchase_price || item.purchase_price || item.cost_price || item.unit_valuation || item.rate || 0)
          }));
          break;
        }
      } catch (err) {}
    }
  }

  let accounts = [];
  try {
    if (typeof getFirmMasterAccounts === 'function') {
      accounts = getFirmMasterAccounts(firmId) || [];
    }
  } catch (e) {}

  if (!accounts || accounts.length === 0) {
    const accKeys = [`app_accounts_${firmId}`, `account_heads_${firmId}`, 'app_accounts'];
    for (const k of accKeys) {
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          accounts = parsed;
          break;
        }
      } catch (err) {}
    }
  }

  const vouchers = rawVouchers.filter(v => {
    if (!v) return false;
    const vDate = v.voucher_date || v.date || '';
    if (vDate && (vDate < startDate || vDate > endDate)) return false;
    return true;
  });

  const balanceMap = {};
  accounts.forEach(acc => {
    const name = (acc.account_name || acc.name || '').trim();
    if (!name) return;
    const balanceType = String(acc.balance_type || acc.balanceType || 'Dr').trim().toUpperCase();
    balanceMap[normalizeKey(name)] = {
      name: name,
      primary_type: (acc.primary_type || acc.type || 'ASSETS').toUpperCase(),
      sub_group: acc.sub_group || acc.group || 'General',
      opening: parseFloat(acc.opening_balance || acc.openingBalance || 0),
      balance_type: balanceType,
      dr: 0,
      cr: 0
    };
  });

  let totalSales = 0;
  let totalPurchases = 0;

  vouchers.forEach(v => {
    if (!v) return;
    const vType = String(v.voucher_type || v.type || '').toUpperCase();
    const vAmount = parseFloat(v.amount || v.total_amount || 0);

    if (vType === 'SALES') totalSales += vAmount;
    if (vType === 'PURCHASE') totalPurchases += vAmount;

    if (Array.isArray(v.entries) && v.entries.length > 0) {
      v.entries.forEach(entry => {
        const accName = (entry.account_name || entry.party || '').trim();
        const normKey = normalizeKey(accName);
        const amt = parseFloat(entry.amount || entry.debit || entry.credit || 0);
        const isDr = (entry.type || '').toUpperCase() === 'DR' || parseFloat(entry.debit || 0) > 0;
        const isCr = (entry.type || '').toUpperCase() === 'CR' || parseFloat(entry.credit || 0) > 0;

        if (accName && amt > 0) {
          if (!balanceMap[normKey]) {
            balanceMap[normKey] = {
              name: accName,
              primary_type: isDr ? 'ASSETS' : 'LIABILITIES',
              sub_group: 'General Ledger',
              opening: 0,
              balance_type: isDr ? 'DR' : 'CR',
              dr: 0,
              cr: 0
            };
          }
          if (isDr) balanceMap[normKey].dr += amt;
          if (isCr) balanceMap[normKey].cr += amt;
        }
      });
    } else {
      const dr = (v.dr_account || v.debit_account || v.dr_party || '').trim();
      const cr = (v.cr_account || v.credit_account || v.cr_party || '').trim();

      if (dr && vAmount > 0) {
        const normDr = normalizeKey(dr);
        if (!balanceMap[normDr]) {
          balanceMap[normDr] = { name: dr, primary_type: 'ASSETS', sub_group: 'General Ledger', opening: 0, balance_type: 'DR', dr: 0, cr: 0 };
        }
        balanceMap[normDr].dr += vAmount;
      }

      if (cr && vAmount > 0) {
        const normCr = normalizeKey(cr);
        if (!balanceMap[normCr]) {
          balanceMap[normCr] = { name: cr, primary_type: 'LIABILITIES', sub_group: 'General Ledger', opening: 0, balance_type: 'CR', dr: 0, cr: 0 };
        }
        balanceMap[normCr].cr += vAmount;
      }
    }
  });

  let totalReceivables = 0;
  let totalPayables = 0;
  let cashAndBank = 0;

  const receivableRows = [];
  const payableRows = [];
  const cashBankRows = [];

  // Helper lists of pure operational overhead words that should never be treated as party payables/receivables
  const pureExpenseKeywords = [
    'factory manufacturing expenses', 'office expenses', 'kitchen expenses', 'electricity expense',
    'gadi kiraya expense', 'chimni construction expense', 'repair & maintenance', 'discount a/c',
    'mining duty & charges', 'royalty', 'stamp', 'registry', 'petrol', 'diesel stock account', 'stock account'
  ];

  Object.values(balanceMap).forEach(acc => {
    const openingSigned = acc.balance_type === 'DR' ? acc.opening : -acc.opening;
    const rawNet = openingSigned + acc.dr - acc.cr;
    const lowerName = acc.name.toLowerCase();
    const grp = (acc.sub_group || '').toLowerCase();
    const type = acc.primary_type;

    // Skip pure overhead expense names immediately
    if (pureExpenseKeywords.some(kw => lowerName.includes(kw))) {
      return;
    }

    // 1. Cash & Bank
    if (
      lowerName.includes('cash') || 
      lowerName.includes('bank') || 
      lowerName.includes('sbi') || 
      lowerName.includes('pnb') || 
      grp.includes('bank') || 
      grp.includes('cash')
    ) {
      cashAndBank += rawNet;
      cashBankRows.push({ name: acc.name, sub_group: acc.sub_group, balance: rawNet, balance_type: rawNet < 0 ? 'Cr' : 'Dr' });
    } 
    // 2. Receivables: Net Debit balance (> 0) strictly for customers, debtors, advances
    else if (rawNet > 0) {
      const isOverhead = type === 'EXPENSES' || type === 'INCOME' || grp.includes('expense') || grp.includes('income') || grp.includes('general ledger');
      const isAssetOrStock = type === 'FIXED ASSETS' || grp.includes('fixed asset') || lowerName.includes('stock') || grp.includes('stock') || grp.includes('inventory');
      
      if (!isOverhead && !isAssetOrStock) {
        totalReceivables += rawNet;
        receivableRows.push({ name: acc.name, sub_group: acc.sub_group || 'Sundry Debtors', amount: rawNet });
      }
    } 
    // 3. Payables: Net Credit balance (< 0) strictly for suppliers, creditors, vendors, thekedar, workers, drivers, munsari
    else if (rawNet < 0) {
      const isOverhead = type === 'EXPENSES' || type === 'INCOME' || grp.includes('expense') || grp.includes('income') || grp.includes('general ledger');
      const isAsset = type === 'FIXED ASSETS' || grp.includes('fixed asset');
      
      if (!isOverhead && !isAsset) {
        const absVal = Math.abs(rawNet);
        totalPayables += absVal;
        payableRows.push({ name: acc.name, sub_group: acc.sub_group || 'Sundry Creditors', amount: absVal });
      }
    }
  });

  const totalStockValuation = stockItems.reduce((acc, item) => {
    if (!item || item.is_service || item.item_type === 'SERVICE') return acc;
    const qty = parseFloat(item.current_stock || item.stock || item.qty || 0);
    const rate = parseFloat(
      item.unit_purchase_price || 
      item.purchase_price || 
      item.cost_price || 
      item.unit_valuation || 
      item.rate || 
      0
    );
    return acc + (qty > 0 && rate > 0 ? (qty * rate) : 0);
  }, 0);

  let cards = [];
  let actions = [];
  let displayCategory = 'ईंट भट्ठा (Brick Kiln)';

  if (category.includes('BRICK') || category.includes('BHATTA')) {
    displayCategory = 'ईंट भट्ठा (Brick Kiln)';
    const rawBricks = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('kacchi') || n.includes('raw') || n.includes('कच्ची');
    })?.current_stock || 0;

    const pakkiBricks = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('pakki') || n.includes('red') || n.includes('पक्की');
    })?.current_stock || 0;

    const coalStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('coal') || n.includes('fuel') || n.includes('कोयला') || n.includes('diesel');
    })?.current_stock || 0;

    cards = [
      { label: 'Raw Bricks (कच्ची ईंटें)', value: `${parseFloat(rawBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#0284c7', icon: '🧱' },
      { label: 'Finished Bricks (पक्की ईंटें)', value: `${parseFloat(pakkiBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#d97706', icon: '🏗' },
      { label: 'Fuel / Coal Stock', value: `${parseFloat(coalStock || 0).toFixed(2)} Units`, color: '#475569', icon: '⚡' },
      { label: 'Live Stock Value', value: `₹${round2(totalStockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📊' }
    ];

    actions = [
      { key: 'sales', label: 'Brick Dispatch / Sales', icon: '🧾', bg: '#0284c7' },
      { key: 'production', label: 'Bhatta Production Entry', icon: '🧱', bg: '#d97706' },
      { key: 'purchase', label: 'Fuel & Raw Purchases', icon: '🛍️', bg: '#059669' },
      { key: 'milan', label: 'Customer/Labour Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else {
    displayCategory = 'General Trading & Distribution';
    cards = [
      { label: 'Total Stock Valuation', value: `₹${round2(totalStockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📦' },
      { label: 'Active Product SKUs', value: `${stockItems.length} Items`, color: '#0284c7', icon: '🏷️' },
      { label: 'Sales Turnover', value: `₹${round2(totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#0891b2', icon: '📈' },
      { label: 'Payables Total', value: `₹${round2(totalPayables).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#dc2626', icon: '⚠️' }
    ];

    actions = [
      { key: 'sales', label: 'Create Sales Invoice', icon: '🧾', bg: '#0284c7' },
      { key: 'purchase', label: 'Stock Purchase Inward', icon: '🛍️', bg: '#059669' },
      { key: 'inventory', label: 'Stock & Price Master', icon: '📦', bg: '#0891b2' },
      { key: 'milan', label: 'Party Account Milan', icon: '📑', bg: '#7c3aed' }
    ];
  }

  return {
    receivables: Math.max(0, round2(totalReceivables)),
    payables: Math.max(0, round2(totalPayables)),
    cashAndBank: round2(cashAndBank),
    totalSales: round2(totalSales),
    totalPurchases: round2(totalPurchases),
    totalStockValuation: round2(totalStockValuation),
    consumptionCount: consumptionRecordsList.length || vouchers.filter(v => String(v.voucher_type || '').toUpperCase() === 'CONSUMPTION').length,
    receivableRows,
    payableRows,
    cashBankRows,
    categorySpecifics: {
      category: displayCategory,
      cards,
      actions
    }
  };
};

export const getCalculatedDashboardMetrics = getDynamicDashboardMetrics;

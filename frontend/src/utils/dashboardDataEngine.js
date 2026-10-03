// frontend/src/utils/dashboardDataEngine.js

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';
import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';
import { StorageService } from './storageSync.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

// Resolve clean Firm ID irrespective of object or string argument
export const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return String(firmInput.id || firmInput.firm_id || firmInput.firmId || '').trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

// Clean financial year date range
export const getFYDateRange = (fyString = '2026-27') => {
  try {
    const clean = String(fyString).replace(/FY\s*/i, '').trim();
    const parts = clean.split('-');
    if (parts.length === 2) {
      let startYear = parseInt(parts[0], 10);
      let endYear = startYear + 1;
      if (startYear < 100) startYear += 2000;
      if (endYear < 100) endYear += 2000;
      return {
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`
      };
    }
  } catch (e) {}
  return { startDate: '2026-04-01', endDate: '2027-03-31' };
};

export const getDynamicDashboardMetrics = (firmInput, selectedFY = '2026-27') => {
  const firmId = resolveFirmId(firmInput);
  
  // Category determination
  let category = 'BRICK_KILN';
  if (firmInput && typeof firmInput === 'object') {
    category = String(firmInput.category || firmInput.business_category || firmInput.businessCategory || 'BRICK_KILN').toUpperCase();
  } else {
    try {
      const activeProf = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      if (activeProf.category) category = String(activeProf.category).toUpperCase();
    } catch (e) {}
  }

  const { startDate, endDate } = getFYDateRange(selectedFY);

  // 1. Fetch vouchers robustly across both primary buckets and legacy keys
  let rawVouchers = [];
  try {
    if (typeof getUniversalVouchersByFirm === 'function') {
      rawVouchers = getUniversalVouchersByFirm(firmId) || [];
    }
  } catch (e) {}

  if (rawVouchers.length === 0) {
    const vKey1 = `app_vouchers_${firmId}`;
    const vKey2 = `account_book_vouchers_${firmId}`;
    const raw1 = JSON.parse(localStorage.getItem(vKey1) || '[]');
    const raw2 = JSON.parse(localStorage.getItem(vKey2) || '[]');
    const map = new Map();
    [...raw1, ...raw2].forEach(v => {
      if (v) {
        const uid = v.id || v.reference_no || v.voucher_number || `${v.date}-${v.amount}`;
        if (!map.has(uid)) map.set(uid, v);
      }
    });
    rawVouchers = Array.from(map.values());
  }

  // 2. Fetch inventory items robustly
  let stockItems = [];
  try {
    if (typeof getStockItemsByFirm === 'function') {
      stockItems = getStockItemsByFirm(firmId) || [];
    }
  } catch (e) {}

  if (stockItems.length === 0) {
    const invKeys = [`inventory_items_${firmId}`, `app_stock_${firmId}`, 'inventory_items'];
    for (const k of invKeys) {
      const parsed = JSON.parse(localStorage.getItem(k) || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        stockItems = parsed;
        break;
      }
    }
  }

  // 3. Fetch accounts robustly
  let accounts = [];
  try {
    if (typeof getFirmMasterAccounts === 'function') {
      accounts = getFirmMasterAccounts(firmId) || [];
    }
  } catch (e) {}

  if (accounts.length === 0) {
    const accKeys = [`app_accounts_${firmId}`, `account_heads_${firmId}`, 'app_accounts'];
    for (const k of accKeys) {
      const parsed = JSON.parse(localStorage.getItem(k) || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        accounts = parsed;
        break;
      }
    }
  }

  // Filter vouchers within the selected FY (if voucher date exists)
  const vouchers = rawVouchers.filter(v => {
    if (!v) return false;
    const vDate = v.voucher_date || v.date || '';
    if (vDate && (vDate < startDate || vDate > endDate)) return false;
    return true;
  });

  // 4. Double-entry ledger aggregation
  const balanceMap = {};
  accounts.forEach(acc => {
    const name = (acc.account_name || acc.name || '').trim();
    if (!name) return;
    balanceMap[name.toLowerCase()] = {
      name: name,
      primary_type: (acc.primary_type || acc.type || 'EXPENSES').toUpperCase(),
      sub_group: acc.sub_group || acc.group || 'General',
      opening: parseFloat(acc.opening_balance || acc.openingBalance || 0),
      balance_type: acc.balance_type || acc.balanceType || 'Dr',
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

    // Handle compound entries array
    if (Array.isArray(v.entries) && v.entries.length > 0) {
      v.entries.forEach(entry => {
        const accName = (entry.account_name || entry.party || '').trim();
        const lowName = accName.toLowerCase();
        const amt = parseFloat(entry.amount || entry.debit || entry.credit || 0);
        const isDr = (entry.type || '').toUpperCase() === 'DR' || parseFloat(entry.debit || 0) > 0;
        const isCr = (entry.type || '').toUpperCase() === 'CR' || parseFloat(entry.credit || 0) > 0;

        if (accName && amt > 0) {
          if (!balanceMap[lowName]) {
            balanceMap[lowName] = {
              name: accName,
              primary_type: isDr ? 'EXPENSES' : 'INCOME',
              sub_group: 'General',
              opening: 0,
              balance_type: isDr ? 'Dr' : 'Cr',
              dr: 0,
              cr: 0
            };
          }
          if (isDr) balanceMap[lowName].dr += amt;
          if (isCr) balanceMap[lowName].cr += amt;
        }
      });
    } else {
      // Single Dr/Cr vouchers
      const dr = (v.dr_account || v.debit_account || '').trim();
      const cr = (v.cr_account || v.credit_account || '').trim();

      if (dr && vAmount > 0) {
        const lowDr = dr.toLowerCase();
        if (!balanceMap[lowDr]) {
          balanceMap[lowDr] = { name: dr, primary_type: 'EXPENSES', sub_group: 'General', opening: 0, balance_type: 'Dr', dr: 0, cr: 0 };
        }
        balanceMap[lowDr].dr += vAmount;
      }

      if (cr && vAmount > 0) {
        const lowCr = cr.toLowerCase();
        if (!balanceMap[lowCr]) {
          balanceMap[lowCr] = { name: cr, primary_type: 'INCOME', sub_group: 'General', opening: 0, balance_type: 'Cr', dr: 0, cr: 0 };
        }
        balanceMap[lowCr].cr += vAmount;
      }
    }
  });

  let totalReceivables = 0;
  let totalPayables = 0;
  let cashAndBank = 0;

  Object.values(balanceMap).forEach(acc => {
    const rawNet = (acc.balance_type === 'Dr' ? acc.opening : -acc.opening) + (acc.dr - acc.cr);
    const lowerName = acc.name.toLowerCase();
    const type = acc.primary_type;
    const group = (acc.sub_group || '').toLowerCase();

    if (
      lowerName.includes('cash') || 
      lowerName.includes('bank') || 
      group.includes('bank') || 
      group.includes('cash')
    ) {
      cashAndBank += rawNet;
    } else if (
      type === 'ASSETS' || 
      group.includes('debtor') || 
      group.includes('customer') || 
      lowerName.includes('customer')
    ) {
      if (rawNet > 0) totalReceivables += rawNet;
    } else if (
      type === 'LIABILITIES' || 
      group.includes('creditor') || 
      group.includes('supplier') || 
      group.includes('thekedar') || 
      group.includes('labor') || 
      lowerName.includes('supplier')
    ) {
      if (rawNet < 0) totalPayables += Math.abs(rawNet);
    }
  });

  // 5. Stock Inventory Valuation
  const totalStockValuation = stockItems.reduce((acc, item) => {
    if (!item || item.is_service || item.item_type === 'SERVICE') return acc;
    const qty = parseFloat(item.current_stock || item.stock || item.qty || 0);
    const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.purchasePrice || item.rate || 0);
    return acc + (qty > 0 && rate > 0 ? (qty * rate) : 0);
  }, 0);

  // 6. Category Specific KPI Cards
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

  const cards = [
    { label: 'Raw Bricks (कच्ची ईंटें)', value: `${parseFloat(rawBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#0284c7', icon: '🧱' },
    { label: 'Finished Bricks (पक्की ईंटें)', value: `${parseFloat(pakkiBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#d97706', icon: '🏗️' },
    { label: 'Fuel / Coal Stock', value: `${parseFloat(coalStock || 0).toFixed(2)} Units`, color: '#475569', icon: '⚡' },
    { label: 'Live Stock Value', value: `₹${round2(totalStockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📊' }
  ];

  const actions = [
    { key: 'sales', label: 'Brick Dispatch / Sales', icon: '🧾', bg: '#0284c7' },
    { key: 'production', label: 'Bhatta Production Entry', icon: '🧱', bg: '#d97706' },
    { key: 'purchase', label: 'Fuel & Raw Purchases', icon: '🛍️', bg: '#059669' },
    { key: 'milan', label: 'Customer/Labour Milan', icon: '📑', bg: '#7c3aed' }
  ];

  return {
    receivables: Math.max(0, round2(totalReceivables)),
    payables: Math.max(0, round2(totalPayables)),
    cashAndBank: round2(cashAndBank),
    totalSales: round2(totalSales),
    totalPurchases: round2(totalPurchases),
    totalStockValuation: round2(totalStockValuation),
    categorySpecifics: {
      category: category.includes('BRICK') || category.includes('BHATTA') ? 'ईंट भट्ठा (Brick Kiln)' : 'Manufacturing & Trading',
      cards,
      actions
    }
  };
};

export const getCalculatedDashboardMetrics = getDynamicDashboardMetrics;

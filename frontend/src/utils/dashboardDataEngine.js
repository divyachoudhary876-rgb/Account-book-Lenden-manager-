// frontend/src/utils/dashboardDataEngine.js

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';
import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';
import { StorageService } from './storageSync.js';

// Safe 2-decimal financial rounding (Ind AS precision)
const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Resolve clean Firm ID string irrespective of whether an object or string was passed
 */
export const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return String(firmInput.id || firmInput.firm_id || firmInput.firmId || '').trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

/**
 * Clean financial year string and calculate exact date boundaries
 * e.g., 'FY 2026-27' or '2026-27' -> { startDate: '2026-04-01', endDate: '2027-03-31' }
 */
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
  } catch (e) {
    console.error("FY Date Range parsing error:", e);
  }
  return { startDate: '2026-04-01', endDate: '2027-03-31', label: 'FY 2026-27' };
};

/**
 * Primary Dynamic Dashboard KPI Aggregation Engine
 */
export const getDynamicDashboardMetrics = (firmInput, selectedFY = '2026-27') => {
  const firmId = resolveFirmId(firmInput);

  // 1. Resolve Industry Category
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

  // 2. Multi-Bucket Universal Voucher Extraction (Zero Cross-Firm Leakage)
  let rawVouchers = [];
  try {
    if (typeof getUniversalVouchersByFirm === 'function') {
      rawVouchers = getUniversalVouchersByFirm(firmId) || [];
    }
  } catch (e) {}

  if (!rawVouchers || rawVouchers.length === 0) {
    const vKeys = [
      `app_vouchers_${firmId}`,
      `account_book_vouchers_${firmId}`,
      `app_invoices_${firmId}`,
      `sales_invoices_${firmId}`,
      `purchase_bills_${firmId}`
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
                if (txFirm && txFirm !== firmId) return; // Strict boundary check
                const uid = v.id || v.voucher_number || v.reference_no || `${v.voucher_date || v.date}-${v.amount || v.total_amount || 0}`;
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
  }

  // 3. Multi-Bucket Inventory Items Fetching with Rate Fallback
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

  // 4. Firm Master Accounts Loading
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

  // Filter vouchers within the selected FY (if voucher has date)
  const vouchers = rawVouchers.filter(v => {
    if (!v) return false;
    const vDate = v.voucher_date || v.date || '';
    if (vDate && (vDate < startDate || vDate > endDate)) return false;
    return true;
  });

  // 5. Account Head Double-Entry Milan Aggregation
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

    // A. Parse Compound Multi-Line Entries (Ind AS compliant)
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
              sub_group: 'General Ledger',
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
    } 
    // B. Parse Single Dr/Cr Simple Voucher
    else {
      const dr = (v.dr_account || v.debit_account || v.dr_party || '').trim();
      const cr = (v.cr_account || v.credit_account || v.cr_party || '').trim();

      if (dr && vAmount > 0) {
        const lowDr = dr.toLowerCase();
        if (!balanceMap[lowDr]) {
          balanceMap[lowDr] = { name: dr, primary_type: 'EXPENSES', sub_group: 'General Ledger', opening: 0, balance_type: 'Dr', dr: 0, cr: 0 };
        }
        balanceMap[lowDr].dr += vAmount;
      }

      if (cr && vAmount > 0) {
        const lowCr = cr.toLowerCase();
        if (!balanceMap[lowCr]) {
          balanceMap[lowCr] = { name: cr, primary_type: 'INCOME', sub_group: 'General Ledger', opening: 0, balance_type: 'Cr', dr: 0, cr: 0 };
        }
        balanceMap[lowCr].cr += vAmount;
      }
    }
  });

  let totalReceivables = 0; // Sundry Debtors
  let totalPayables = 0;    // Sundry Creditors & Labour/Suppliers
  let cashAndBank = 0;

  Object.values(balanceMap).forEach(acc => {
    const rawNet = (acc.balance_type === 'Dr' ? acc.opening : -acc.opening) + (acc.dr - acc.cr);
    const lowerName = acc.name.toLowerCase();
    const type = acc.primary_type;
    const group = (acc.sub_group || '').toLowerCase();

    // Cash & Bank Head Classification
    if (
      lowerName.includes('cash') || 
      lowerName.includes('bank') || 
      lowerName.includes('sbi') || 
      lowerName.includes('pnb') || 
      group.includes('bank') || 
      group.includes('cash')
    ) {
      cashAndBank += rawNet;
    } 
    // Debtors / Receivables
    else if (
      type === 'ASSETS' || 
      group.includes('debtor') || 
      group.includes('customer') || 
      lowerName.includes('customer')
    ) {
      if (rawNet > 0) totalReceivables += rawNet;
    } 
    // Creditors / Payables (Suppliers, Labour, Thekedars)
    else if (
      type === 'LIABILITIES' || 
      group.includes('creditor') || 
      group.includes('supplier') || 
      group.includes('thekedar') || 
      group.includes('labor') || 
      group.includes('labour') || 
      lowerName.includes('supplier')
    ) {
      if (rawNet < 0) totalPayables += Math.abs(rawNet);
    }
  });

  // 6. Live Stock Valuation with Exhaustive Multi-Key Rate Fallback
  const totalStockValuation = stockItems.reduce((acc, item) => {
    if (!item || item.is_service || item.item_type === 'SERVICE') return acc;
    const qty = parseFloat(item.current_stock || item.stock || item.qty || 0);
    const rate = parseFloat(
      item.unit_purchase_price || 
      item.purchase_price || 
      item.cost_price || 
      item.unit_valuation || 
      item.purchasePrice || 
      item.rate || 
      0
    );
    return acc + (qty > 0 && rate > 0 ? (qty * rate) : 0);
  }, 0);

  // 7. Domain Specific Metrics (Bhatta vs Biomass vs Trading)
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
      { label: 'Finished Bricks (पक्की ईंटें)', value: `${parseFloat(pakkiBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#d97706', icon: '🏗️️' },
      { label: 'Fuel / Coal Stock', value: `${parseFloat(coalStock || 0).toFixed(2)} Units`, color: '#475569', icon: '⚡' },
      { label: 'Live Stock Value', value: `₹${round2(totalStockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📊' }
    ];

    actions = [
      { key: 'sales', label: 'Brick Dispatch / Sales', icon: '🧾', bg: '#0284c7' },
      { key: 'production', label: 'Bhatta Production Entry', icon: '🧱', bg: '#d97706' },
      { key: 'purchase', label: 'Fuel & Raw Purchases', icon: '🛍️', bg: '#059669' },
      { key: 'milan', label: 'Customer/Labour Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else if (category.includes('BIOMASS') || category.includes('BRIQUETTE')) {
    displayCategory = 'बायोमास ब्रिकेट (Biomass Briquettes)';
    const huskStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('husk') || n.includes('तूड़ी') || n.includes('raw') || n.includes('sawdust');
    })?.current_stock || 0;

    const briquettesStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('briquette') || n.includes('finished') || n.includes('बायोमास');
    })?.current_stock || 0;

    const dieselStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('diesel') || n.includes('डीजल');
    })?.current_stock || 0;

    cards = [
      { label: 'Agro-Husk (तूड़ी स्टॉक)', value: `${parseFloat(huskStock || 0).toFixed(2)} MT`, color: '#d97706', icon: '🌾' },
      { label: 'Finished Briquettes', value: `${parseFloat(briquettesStock || 0).toFixed(2)} MT`, color: '#059669', icon: '🪵' },
      { label: 'Diesel / Generator Fuel', value: `${parseFloat(dieselStock || 0).toFixed(2)} Ltr`, color: '#0284c7', icon: '⛽' },
      { label: 'Stock Valuation', value: `₹${round2(totalStockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#4f46e5', icon: '💰' }
    ];

    actions = [
      { key: 'sales', label: 'Briquette Sales Invoice', icon: '🧾', bg: '#0284c7' },
      { key: 'purchase', label: 'Agro Raw Inward (+IN)', icon: '🌾', bg: '#d97706' },
      { key: 'inventory', label: 'Live Plant Inventory', icon: '📦', bg: '#059669' },
      { key: 'milan', label: 'Factory Account Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else {
    displayCategory = 'General Trading & Distribution';
    const lowStockCount = stockItems.filter(i => parseFloat(i.current_stock || 0) <= 5).length;

    cards = [
      { label: 'Total Stock Valuation', value: `₹${round2(totalStockValuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📦' },
      { label: 'Active Product SKUs', value: `${stockItems.length} Items`, color: '#0284c7', icon: '🏷️' },
      { label: 'Sales Turnover', value: `₹${round2(totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#0891b2', icon: '📈' },
      { label: 'Low Stock Warnings', value: `${lowStockCount} Items`, color: lowStockCount > 0 ? '#dc2626' : '#64748b', icon: '⚠️' }
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
    categorySpecifics: {
      category: displayCategory,
      cards,
      actions
    }
  };
};

export const getCalculatedDashboardMetrics = getDynamicDashboardMetrics;

/**
 * Frontend Utility: Dashboard Data Engine
 * Primary Dynamic Dashboard KPI Aggregation Engine with Strict Firm Isolation.
 */

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';
import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

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

  vouchers.forEach(

// frontend/src/utils/statementEngine.js
import { getFirmScopedStorageKey, getActiveFirmId } from './firmIsolationEngine';

/**
 * Helper to strip parenthetical Hindi/Devanagari script to get core base name
 * e.g., "Ramlal (रामलाल)" -> "ramlal", "Coal / Fuel (कोयला)" -> "coal / fuel"
 */
const getBaseName = (str = '') => {
  return String(str || '')
    .replace(/\s*\([\u0900-\u097F\s]+\)/g, '')
    .trim()
    .toLowerCase();
};

/**
 * Resilient bilingual matcher comparing legacy English, Hindi, and composite names
 */
const normalizeMatch = (target = '', candidate = '') => {
  if (!target || !candidate) return false;
  const t = String(target).trim().toLowerCase();
  const c = String(candidate).trim().toLowerCase();
  if (t === c) return true;

  const tBase = getBaseName(t);
  const cBase = getBaseName(c);

  return tBase !== '' && tBase === cBase;
};

/**
 * Helper to resolve exact sanitized firmId
 */
const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return String(firmInput.id || firmInput.firm_id || firmInput.firmId || '').trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

/**
 * Strictly Firm-Isolated voucher fetcher (Includes Simple, Compound, Sales Invoices & Purchases)
 */
export const getAllUniversalVouchers = (firmInput = 'FIRM-001') => {
  try {
    const firmId = resolveFirmId(firmInput);
    let rawTx = [];

    // 1. Fetch strictly from all firm-scoped transaction buckets
    const scopedKeys = [
      `app_vouchers_${firmId}`,
      `account_book_vouchers_${firmId}`,
      `app_invoices_${firmId}`,
      `sales_invoices_${firmId}`,
      `purchase_bills_${firmId}`,
      `app_payroll_entries_${firmId}`
    ];

    scopedKeys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) rawTx.push(...parsed);
        } catch (e) {}
      }
    });

    // 2. Deduplicate by unique ID and enforce firm boundary
    const uniqueMap = new Map();
    rawTx.forEach(tx => {
      if (!tx) return;
      const txFirm = String(tx.firm_id || tx.firmId || '').trim();
      if (txFirm && txFirm !== firmId) {
        return; // Strict cross-firm boundary enforcement
      }

      const uId = tx.id || tx.voucher_number || tx.reference_no || `${tx.voucher_date || tx.date}-${tx.amount || tx.total_amount || 0}-${Math.random()}`;
      if (!uniqueMap.has(uId)) {
        uniqueMap.set(uId, tx);
      }
    });

    return Array.from(uniqueMap.values());
  } catch (e) {
    console.error("Error loading universal vouchers:", e);
    return [];
  }
};

/**
 * Retrieve account heads strictly isolated for the active firm
 */
export const getAccountHeads = (firmInput = 'FIRM-001') => {
  try {
    const firmId = resolveFirmId(firmInput);
    let rawAccounts = [];

    const scopedKeys = [
      `app_accounts_${firmId}`,
      `account_heads_${firmId}`
    ];

    scopedKeys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) rawAccounts.push(...parsed);
        } catch (e) {}
      }
    });

    const uniqueMap = new Map();
    rawAccounts.forEach(acc => {
      if (!acc) return;
      const accFirm = String(acc.firm_id || acc.firmId || '').trim();
      if (accFirm && accFirm !== firmId) {
        return;
      }

      const name = (acc.account_name || acc.name || '').trim();
      if (name && !uniqueMap.has(name.toLowerCase())) {
        uniqueMap.set(name.toLowerCase(), {
          ...acc,
          account_name: name,
          name: name,
          name_en: acc.name_en || getBaseName(name),
          name_hi: acc.name_hi || '',
          opening_balance: parseFloat(acc.opening_balance || acc.openingBalance || 0),
          balance_type: acc.balance_type || acc.balanceType || 'Dr'
        });
      }
    });

    return Array.from(uniqueMap.values());
  } catch {
    return [];
  }
};

/**
 * Generate Double-Entry Account Milan Ledger Statement (Supports Bilingual, Compound & Itemized Lines)
 */
export const getAccountLedgerStatement = (firmIdInput = 'FIRM-001', targetAccountName = '') => {
  const cleanTarget = (targetAccountName || '').trim();
  if (!cleanTarget) {
    return {
      accountName: '',
      openingBalance: 0,
      openingBalanceType: 'Dr',
      entries: [],
      totalDebit: 0,
      totalCredit: 0,
      closingBalance: 0,
      closingBalanceType: 'Dr'
    };
  }

  const firmId = resolveFirmId(firmIdInput);
  const accounts = getAccountHeads(firmId);
  const vouchers = getAllUniversalVouchers(firmId);

  // Resilient bilingual account head lookup
  const matchedAccount = accounts.find(a => {
    const aName = a.account_name || a.name || '';
    const aEn = a.name_en || '';
    return normalizeMatch(cleanTarget, aName) || normalizeMatch(cleanTarget, aEn);
  });

  const displayAccountName = matchedAccount?.account_name || cleanTarget;
  const openingBal = parseFloat(matchedAccount?.opening_balance || matchedAccount?.openingBalance || 0);
  const balanceType = matchedAccount?.balance_type || matchedAccount?.balanceType || 'Dr';

  let runningBalance = balanceType === 'Dr' ? openingBal : -openingBal;
  let totalDebit = 0;
  let

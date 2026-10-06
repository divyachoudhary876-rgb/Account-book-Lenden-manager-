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
  let totalCredit = 0;

  // Filter vouchers where account participates using bilingual matching
  const relevantVouchers = vouchers
    .filter(v => {
      if (!v) return false;
      const dr = (v.dr_account || v.debit_account || v.dr_party || '').trim();
      const cr = (v.cr_account || v.credit_account || v.cr_party || '').trim();
      
      if (normalizeMatch(cleanTarget, dr) || normalizeMatch(cleanTarget, cr)) return true;

      // Check compound entries array
      if (Array.isArray(v.entries) && v.entries.length > 0) {
        return v.entries.some(e => normalizeMatch(cleanTarget, e.account_name || e.party || ''));
      }

      // Check worker/contractor and expense ledger fields
      if (v.worker && normalizeMatch(cleanTarget, v.worker)) return true;
      if (v.expense_ledger && normalizeMatch(cleanTarget, v.expense_ledger)) return true;

      return false;
    })
    .sort((a, b) => new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0));

  const ledgerEntries = [];

  relevantVouchers.forEach((v, index) => {
    let debitAmount = 0;
    let creditAmount = 0;
    let counterParty = '';

    // A. Compound entries evaluation
    if (Array.isArray(v.entries) && v.entries.length > 0) {
      let isMatched = false;
      const otherParties = [];

      v.entries.forEach(e => {
        const accName = (e.account_name || e.party || '').trim();
        const amt = parseFloat(e.amount || e.debit || e.credit || 0);
        const type = (e.type || '').toUpperCase();

        if (normalizeMatch(cleanTarget, accName)) {
          isMatched = true;
          if (type === 'DR' || parseFloat(e.debit || 0) > 0) debitAmount += amt;
          if (type === 'CR' || parseFloat(e.credit || 0) > 0) creditAmount += amt;
        } else if (accName) {
          otherParties.push(accName);
        }
      });

      if (isMatched) {
        counterParty = otherParties.join(', ') || 'Various Accounts';
      }
    } 
    // B. Worker wage entry evaluation
    else if (v.worker && (normalizeMatch(cleanTarget, v.worker) || normalizeMatch(cleanTarget, v.expense_ledger))) {
      const amt = parseFloat(v.total_amount || v.amount || 0);
      if (normalizeMatch(cleanTarget, v.worker)) {
        creditAmount = amt;
        counterParty = v.expense_ledger || 'Wages Expense';
      } else {
        debitAmount = amt;
        counterParty = v.worker || 'Labour Party';
      }
    }
    // C. Simple Dr/Cr evaluation
    else {
      const drName = (v.dr_account || v.debit_account || v.dr_party || '').trim();
      const crName = (v.cr_account || v.credit_account || v.cr_party || '').trim();
      const amt = parseFloat(v.amount || v.total_amount || 0);

      if (normalizeMatch(cleanTarget, drName)) {
        debitAmount = amt;
        counterParty = crName || 'Various Accounts';
      }
      if (normalizeMatch(cleanTarget, crName)) {
        creditAmount = amt;
        counterParty = drName || 'Various Accounts';
      }
    }

    if (debitAmount > 0 || creditAmount > 0) {
      totalDebit += debitAmount;
      totalCredit += creditAmount;
      runningBalance += (debitAmount - creditAmount);

      let itemNote = '';
      if (Array.isArray(v.items) && v.items.length > 0) {
        itemNote = v.items.map(it => `${it.itemName || it.name || 'Item'} (${it.qty || it.quantity || 0} ${it.unit || 'Pcs'} @ ₹${it.rate || 0})`).join(', ');
      }

      const finalParticulars = [
        debitAmount > 0 ? `To ${counterParty}` : `By ${counterParty}`,
        itemNote,
        v.narration || v.notes || ''
      ].filter(Boolean).join(' | ');

      ledgerEntries.push({
        index: ledgerEntries.length + 1,
        id: v.id,
        date: v.voucher_date || v.date || '2026-04-01',
        voucher_type: (v.voucher_type || v.type || 'JOURNAL').toUpperCase(),
        voucher_no: v.reference_no || v.voucher_number || (v.id ? String(v.id).slice(-6) : `REF-${index + 1}`),
        particulars: finalParticulars,
        opposite_account: counterParty,
        debit: debitAmount,
        credit: creditAmount,
        running_balance: Math.abs(runningBalance),
        balance_type: runningBalance >= 0 ? 'Dr' : 'Cr',
        narration: v.narration || v.notes || ''
      });
    }
  });

  return {
    accountName: displayAccountName,
    primaryType: matchedAccount?.primary_type || matchedAccount?.type || 'ASSETS',
    subGroup: matchedAccount?.sub_group || matchedAccount?.group || 'General Ledger',
    openingBalance: openingBal,
    openingBalanceType: balanceType,
    entries: ledgerEntries,
    totalDebit: parseFloat(totalDebit.toFixed(2)),
    totalCredit: parseFloat(totalCredit.toFixed(2)),
    closingBalance: parseFloat(Math.abs(runningBalance).toFixed(2)),
    closingBalanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
  };
};

/**
 * Export account statement to CSV format
 */
export const downloadCSVStatement = (statement, firmName = 'Firm') => {
  if (!statement || !statement.entries) return;

  const headers = ['#', 'Date', 'Voucher Type', 'Ref No', 'Particulars', 'Debit (Rs)', 'Credit (Rs)', 'Balance', 'Type', 'Narration'];
  const rows = statement.entries.map(e => [
    e.index,
    e.date,
    e.voucher_type,
    e.voucher_no,
    `"${(e.particulars || '').replace(/"/g, '""')}"`,
    e.debit.toFixed(2),
    e.credit.toFixed(2),
    e.running_balance.toFixed(2),
    e.balance_type,
    `"${(e.narration || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    `"Account Statement: ${statement.accountName}"`,
    `"Firm: ${firmName}"`,
    `"Opening Balance: Rs. ${statement.openingBalance.toFixed(2)} ${statement.openingBalanceType}"`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `"Total Debit",${statement.totalDebit.toFixed(2)},"Total Credit",${statement.totalCredit.toFixed(2)}`,
    `"Closing Balance",Rs. ${statement.closingBalance.toFixed(2)} ${statement.closingBalanceType}`
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${statement.accountName.replace(/\s+/g, '_')}_Statement.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Aliases for backwards compatibility
export const getAccountStatement = getAccountLedgerStatement;

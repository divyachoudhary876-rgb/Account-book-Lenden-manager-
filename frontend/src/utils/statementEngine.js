// frontend/src/utils/statementEngine.js
import { getFirmScopedStorageKey, getActiveFirmId } from './firmIsolationEngine';

/**
 * Universal voucher fetcher that scans ALL possible keys in localStorage (scoped, global, backup snapshots)
 */
export const getAllUniversalVouchers = (firmInput = 'FIRM-001') => {
  try {
    let rawTx = [];
    const firmId = getActiveFirmId(firmInput);

    // 1. Check direct scoped keys for this firm
    const scopedKeys = [
      getFirmScopedStorageKey('app_vouchers', firmInput),
      getFirmScopedStorageKey('account_book_vouchers', firmInput),
      getFirmScopedStorageKey('vouchers', firmInput),
      getFirmScopedStorageKey('transactions', firmInput),
      `app_vouchers_${firmId}`,
      `account_book_vouchers_${firmId}`
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

    // 2. Check global base keys and backup restore keys
    const globalKeys = [
      'app_vouchers', 'account_book_vouchers', 'vouchers', 
      'transactions', 'daybook', 'journal_entries', 'account_book_vouchers_default_firm_id'
    ];

    globalKeys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) rawTx.push(...parsed);
          else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.vouchers)) rawTx.push(...parsed.vouchers);
            if (Array.isArray(parsed.transactions)) rawTx.push(...parsed.transactions);
            Object.values(parsed).forEach(sub => {
              if (Array.isArray(sub)) rawTx.push(...sub);
            });
          }
        } catch (e) {}
      }
    });

    // 3. Deep scan ALL localStorage keys for any voucher/transaction/backup data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('voucher') || key.includes('transaction') || key.includes('daybook') || key.includes('journal') || key.includes('backup'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              rawTx.push(...parsed);
            } else if (parsed && typeof parsed === 'object') {
              if (parsed.data && typeof parsed.data === 'object') {
                Object.values(parsed.data).forEach(subVal => {
                  if (Array.isArray(subVal)) rawTx.push(...subVal);
                });
              }
              Object.values(parsed).forEach(subVal => {
                if (Array.isArray(subVal)) rawTx.push(...subVal);
              });
            }
          } catch (err) {}
        }
      }
    }

    // Deduplicate entries by unique ID or signature
    const uniqueMap = new Map();
    rawTx.forEach(tx => {
      if (!tx) return;
      const uId = tx.id || tx.voucher_number || tx.reference_no || `${tx.voucher_date || tx.date}-${tx.amount || tx.total_amount || tx.grand_total}-${tx.dr_account || tx.debit_account || ''}-${tx.cr_account || tx.credit_account || ''}`;
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
 * Retrieve account heads for a firm with backup fallback & deep scan
 */
export const getAccountHeads = (firmInput = 'FIRM-001') => {
  try {
    const firmId = getActiveFirmId(firmInput);
    let rawAccounts = [];

    const scopedKeys = [
      getFirmScopedStorageKey('app_accounts', firmInput),
      getFirmScopedStorageKey('account_heads', firmInput),
      `app_accounts_${firmId}`
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

    const globalKeys = ['app_accounts', 'account_heads', 'accounts_list', 'ledgers'];
    globalKeys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) rawAccounts.push(...parsed);
        } catch (e) {}
      }
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('account') || key.includes('ledger') || key.includes('party') || key.includes('backup'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) rawAccounts.push(...parsed);
            else if (parsed && typeof parsed === 'object') {
              if (parsed.data && typeof parsed.data === 'object') {
                Object.values(parsed.data).forEach(sub => {
                  if (Array.isArray(sub)) rawAccounts.push(...sub);
                });
              }
              Object.values(parsed).forEach(sub => {
                if (Array.isArray(sub)) rawAccounts.push(...sub);
              });
            }
          } catch (e) {}
        }
      }
    }

    const uniqueMap = new Map();
    rawAccounts.forEach(acc => {
      if (!acc) return;
      const name = (acc.account_name || acc.name || '').trim().toLowerCase();
      if (name && !uniqueMap.has(name)) {
        uniqueMap.set(name, acc);
      }
    });

    return Array.from(uniqueMap.values());
  } catch {
    return [];
  }
};

/**
 * Generate Double-Entry Account Milan Ledger Statement adhering to strict accounting rules
 */
export const getAccountLedgerStatement = (firmId = 'FIRM-001', targetAccountName = '') => {
  if (!targetAccountName) {
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

  const accounts = getAccountHeads(firmId);
  const vouchers = getAllUniversalVouchers(firmId);

  const matchedAccount = accounts.find(
    a => (a.account_name || '').trim().toLowerCase() === targetAccountName.trim().toLowerCase()
  );

  const openingBal = parseFloat(matchedAccount?.opening_balance || 0);
  const balanceType = matchedAccount?.balance_type || 'Dr';

  let runningBalance = balanceType === 'Dr' ? openingBal : -openingBal;
  let totalDebit = 0;
  let totalCredit = 0;

  const targetLower = targetAccountName.trim().toLowerCase();

  const relevantVouchers = vouchers
    .filter(v => {
      const dr = (v.dr_account || v.debit_account || v.dr_party || '').trim().toLowerCase();
      const cr = (v.cr_account || v.credit_account || v.cr_party || '').trim().toLowerCase();
      return dr === targetLower || cr === targetLower;
    })
    .sort((a, b) => new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0));

  const ledgerEntries = relevantVouchers.map((v, index) => {
    const drName = (v.dr_account || v.debit_account || v.dr_party || '').trim();
    const crName = (v.cr_account || v.credit_account || v.cr_party || '').trim();
    const amt = parseFloat(v.amount || v.total_amount || 0);

    const isDebit = drName.toLowerCase() === targetLower;
    const isCredit = crName.toLowerCase() === targetLower;

    let debitAmount = 0;
    let creditAmount = 0;
    let counterParty = '';

    if (isDebit) {
      debitAmount = amt;
      totalDebit += amt;
      runningBalance += amt;
      counterParty = crName || 'Various Account';
    } else if (isCredit) {
      creditAmount = amt;
      totalCredit += amt;
      runningBalance -= amt;
      counterParty = drName || 'Various Account';
    }

    return {
      index: index + 1,
      id: v.id,
      date: v.voucher_date || v.date || '2026-04-01',
      voucher_type: v.voucher_type || v.type || 'JOURNAL',
      voucher_no: v.voucher_number || v.reference_no || `REF-${index + 1}`,
      particulars: isDebit ? `To ${counterParty}` : `By ${counterParty}`,
      opposite_account: counterParty,
      debit: debitAmount,
      credit: creditAmount,
      running_balance: Math.abs(runningBalance),
      balance_type: runningBalance >= 0 ? 'Dr' : 'Cr',
      narration: v.narration || v.notes || ''
    };
  });

  return {
    accountName: targetAccountName,
    primaryType: matchedAccount?.primary_type || 'ASSETS',
    subGroup: matchedAccount?.sub_group || 'General Ledger',
    openingBalance: openingBal,
    openingBalanceType: balanceType,
    entries: ledgerEntries,
    totalDebit: totalDebit,
    totalCredit: totalCredit,
    closingBalance: Math.abs(runningBalance),
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
    `"${e.particulars.replace(/"/g, '""')}"`,
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

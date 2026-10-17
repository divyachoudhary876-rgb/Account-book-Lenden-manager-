// frontend/src/utils/statementEngine.js

import { IDBStorage } from './indexedDbStorage.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return String(firmInput.id || firmInput.firm_id || firmInput.firmId || '').trim();
  }
  return IDBStorage.getItem('app_active_firm_id') || 'FIRM-1790909076433';
};

export const getAllUniversalVouchers = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const vouchers = IDBStorage.getItem(`account_book_vouchers_${firmId}`, []) || [];

    const uniqueMap = new Map();
    vouchers.forEach(tx => {
      if (!tx) return;
      const txFirm = String(tx.firm_id || tx.firmId || '').trim();
      if (txFirm && txFirm !== firmId) return;

      const uId = tx.id || tx.voucher_number || tx.reference_no || `${tx.voucher_date || tx.date}-${tx.amount || tx.total_amount || 0}`;
      if (!uniqueMap.has(uId)) {
        uniqueMap.set(uId, tx);
      }
    });

    return Array.from(uniqueMap.values());
  } catch (e) {
    console.error("[statementEngine] Error loading vouchers:", e);
    return [];
  }
};

export const getAccountHeads = (firmInput) => {
  try {
    const firmId = resolveFirmId(firmInput);
    const accounts = IDBStorage.getItem(`account_heads_${firmId}`, []) || 
                     IDBStorage.getItem(`app_accounts_${firmId}`, []) || [];

    const uniqueMap = new Map();
    accounts.forEach(acc => {
      if (!acc) return;
      const name = (acc.account_name || acc.name || '').trim();
      if (name && !uniqueMap.has(name.toLowerCase())) {
        uniqueMap.set(name.toLowerCase(), {
          ...acc,
          account_name: name,
          name: name,
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

export const getAccountLedgerStatement = (firmIdInput, targetAccountName = '') => {
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
  const targetLower = cleanTarget.toLowerCase();

  const matchedAccount = accounts.find(
    a => (a.account_name || a.name || '').trim().toLowerCase() === targetLower
  );

  const openingBal = parseFloat(matchedAccount?.opening_balance || matchedAccount?.openingBalance || 0);
  const balanceType = matchedAccount?.balance_type || matchedAccount?.balanceType || 'Dr';

  let runningBalance = balanceType === 'Dr' ? openingBal : -openingBal;
  let totalDebit = 0;
  let totalCredit = 0;

  const relevantVouchers = vouchers
    .filter(v => {
      if (!v) return false;
      const dr = (v.dr_account || v.debit_account || '').trim().toLowerCase();
      const cr = (v.cr_account || v.credit_account || '').trim().toLowerCase();
      
      if (dr === targetLower || cr === targetLower) return true;

      if (Array.isArray(v.entries) && v.entries.length > 0) {
        return v.entries.some(e => (e.account_name || e.party || '').trim().toLowerCase() === targetLower);
      }

      if (v.worker && String(v.worker).trim().toLowerCase() === targetLower) return true;
      if (v.expense_ledger && String(v.expense_ledger).trim().toLowerCase() === targetLower) return true;

      return false;
    })
    .sort((a, b) => new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0));

  const ledgerEntries = [];

  relevantVouchers.forEach((v, index) => {
    let debitAmount = 0;
    let creditAmount = 0;
    let counterParty = '';

    if (Array.isArray(v.entries) && v.entries.length > 0) {
      let isMatched = false;
      const otherParties = [];

      v.entries.forEach(e => {
        const accName = (e.account_name || e.party || '').trim();
        const amt = parseFloat(e.amount || e.debit || e.credit || 0);
        const type = (e.type || '').toUpperCase();

        if (accName.toLowerCase() === targetLower) {
          isMatched = true;
          if (type === 'DR' || parseFloat(e.debit || 0) > 0) debitAmount += amt;
          if (type === 'CR' || parseFloat(e.credit || 0) > 0) creditAmount += amt;
        } else if (accName) {
          otherParties.push(accName);
        }
      });

      if (isMatched) {
        counterParty = otherParties.join(', ') || 'Various Account';
      }
    } else {
      const drName = (v.dr_account || v.debit_account || '').trim();
      const crName = (v.cr_account || v.credit_account || '').trim();
      const amt = parseFloat(v.amount || v.total_amount || 0);

      if (drName.toLowerCase() === targetLower) {
        debitAmount = amt;
        counterParty = crName || 'Various Account';
      }
      if (crName.toLowerCase() === targetLower) {
        creditAmount = amt;
        counterParty = drName || 'Various Account';
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
        v.narration || ''
      ].filter(Boolean).join(' | ');

      ledgerEntries.push({
        index: ledgerEntries.length + 1,
        id: v.id,
        date: v.voucher_date || v.date || '2026-04-01',
        voucher_type: (v.voucher_type || v.type || 'JOURNAL').toUpperCase(),
        voucher_no: v.reference_no || v.voucher_number || `REF-${index + 1}`,
        particulars: finalParticulars,
        opposite_account: counterParty,
        debit: debitAmount,
        credit: creditAmount,
        running_balance: Math.round(Math.abs(runningBalance) * 100) / 100,
        balance_type: runningBalance >= 0 ? 'Dr' : 'Cr',
        narration: v.narration || ''
      });
    }
  });

  return {
    accountName: cleanTarget,
    primaryType: matchedAccount?.primary_type || matchedAccount?.type || 'ASSETS',
    subGroup: matchedAccount?.sub_group || matchedAccount?.group || 'General Ledger',
    openingBalance: openingBal,
    openingBalanceType: balanceType,
    entries: ledgerEntries,
    totalDebit: round2(totalDebit),
    totalCredit: round2(totalCredit),
    closingBalance: round2(Math.abs(runningBalance)),
    closingBalanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
  };
};

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

export const getAccountStatement = getAccountLedgerStatement;

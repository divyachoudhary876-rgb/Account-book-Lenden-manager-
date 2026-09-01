// frontend/src/utils/statementEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';

export const getAccountHeads = (firmId) => {
  return getFirmMasterAccounts(firmId);
};

export const getAllUniversalVouchers = (firmId) => {
  let all = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('app_vouchers') || key.includes('vouchers'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) all = all.concat(parsed);
        }
      }
    }
    const map = new Map();
    all.forEach(v => {
      if (v && v.id) map.set(v.id, v);
    });
    all = Array.from(map.values());
  } catch (e) {
    all = [];
  }
  return all;
};

export const getAccountLedgerStatement = (firmId, accountName) => {
  if (!accountName) {
    return { transactions: [], netBalance: 0, balanceType: 'Cr', totalDebit: 0, totalCredit: 0 };
  }

  const vouchers = getAllUniversalVouchers(firmId);
  const targetName = accountName.toLowerCase().trim();

  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let txList = [];

  const sortedVouchers = vouchers.sort((a, b) => 
    new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0)
  );

  sortedVouchers.forEach(v => {
    const dr = (v.dr_account || '').toLowerCase();
    const cr = (v.cr_account || '').toLowerCase();
    const amt = parseFloat(v.amount || 0);

    const isDebit = dr.includes(targetName);
    const isCredit = cr.includes(targetName);

    if (isDebit || isCredit) {
      if (isDebit) {
        runningBalance += amt;
        totalDebit += amt;
      }
      if (isCredit) {
        runningBalance -= amt;
        totalCredit += amt;
      }

      txList.push({
        id: v.id,
        date: v.voucher_date || v.date || '2026-09-01',
        voucher_type: v.voucher_type || 'JOURNAL',
        particulars: isDebit ? `To ${v.cr_account}` : `By ${v.dr_account}`,
        debit: isDebit ? amt : 0,
        credit: isCredit ? amt : 0,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
        narration: v.narration || ''
      });
    }
  });

  return {
    transactions: txList,
    netBalance: Math.abs(runningBalance),
    balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
    totalDebit,
    totalCredit
  };
};

export const getAccountStatement = getAccountLedgerStatement;

export const downloadCSVStatement = (firmName, accountName, statementData) => {
  const { transactions, netBalance, balanceType, totalDebit, totalCredit } = statementData;
  if (!transactions || transactions.length === 0) {
    alert("⚠️ No transactions to export for this account.");
    return;
  }

  let csvRows = [];
  csvRows.push(`"ACCOUNT STATEMENT / MILAN LEDGER"`);
  csvRows.push(`"Firm: ${firmName || 'Enterprise'}"`);
  csvRows.push(`"Account: ${accountName}"`);
  csvRows.push(`"Generated: ${new Date().toLocaleDateString()}"`);
  csvRows.push("");
  csvRows.push(`"Date","Voucher Ref","Type","Particulars","Debit (Dr)","Credit (Cr)","Running Balance","Dr/Cr","Narration"`);

  transactions.forEach(t => {
    csvRows.push(`"${t.date}","${t.id}","${t.voucher_type}","${t.particulars}","${t.debit.toFixed(2)}","${t.credit.toFixed(2)}","${t.balance.toFixed(2)}","${t.balanceType}","${(t.narration || '').replace(/"/g, '""')}"`);
  });

  csvRows.push("");
  csvRows.push(`"TOTAL","","","","${totalDebit.toFixed(2)}","${totalCredit.toFixed(2)}","${netBalance.toFixed(2)}","${balanceType}",""`);

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Statement_${accountName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

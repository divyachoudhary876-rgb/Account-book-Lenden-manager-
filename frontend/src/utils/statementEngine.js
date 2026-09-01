// frontend/src/utils/statementEngine.js

import { getFirmMasterAccounts } from './accountMasterEngine.js';

export const getAllUniversalVouchers = (firmId = 'FIRM-001') => {
  try {
    let vouchers = JSON.parse(localStorage.getItem(`app_vouchers_${firmId}`) || '[]');
    return Array.isArray(vouchers) ? vouchers : [];
  } catch {
    return [];
  }
};

export const getAccountLedgerStatement = (firmId = 'FIRM-001', accountName) => {
  if (!accountName) return { transactions: [], netBalance: 0, balanceType: 'Dr', totalDebit: 0, totalCredit: 0 };

  const vouchers = getAllUniversalVouchers(firmId);
  const target = accountName.trim().toLowerCase();
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let transactions = [];

  const sorted = [...vouchers].sort((a, b) => new Date(a.voucher_date || a.date) - new Date(b.voucher_date || b.date));

  sorted.forEach(v => {
    const isDr = (v.dr_account || '').toLowerCase() === target;
    const isCr = (v.cr_account || '').toLowerCase() === target;
    const amt = parseFloat(v.amount || 0);

    if (isDr || isCr) {
      if (isDr) { runningBalance += amt; totalDebit += amt; }
      if (isCr) { runningBalance -= amt; totalCredit += amt; }

      transactions.push({
        id: v.id,
        date: v.voucher_date || v.date,
        voucher_type: v.voucher_type,
        particulars: isDr ? `To ${v.cr_account}` : `By ${v.dr_account}`,
        debit: isDr ? amt : 0,
        credit: isCr ? amt : 0,
        balance: Math.abs(runningBalance),
        balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
        narration: v.narration || ''
      });
    }
  });

  return {
    transactions,
    netBalance: Math.abs(runningBalance),
    balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
    totalDebit,
    totalCredit
  };
};

export const downloadCSVStatement = (firmName, accountName, statementData) => {
  const { transactions, netBalance, balanceType, totalDebit, totalCredit } = statementData;
  if (!transactions || transactions.length === 0) return alert("No transactions found to export.");

  let rows = [
    `"ACCOUNT STATEMENT / MILAN: ${accountName}"`,
    `"Firm: ${firmName || 'Enterprise'}"`,
    `"Date","Voucher Ref","Type","Particulars","Debit (Dr)","Credit (Cr)","Running Balance","Dr/Cr","Narration"`,
    ...transactions.map(t => `"${t.date}","${t.id}","${t.voucher_type}","${t.particulars}","${t.debit.toFixed(2)}","${t.credit.toFixed(2)}","${t.balance.toFixed(2)}","${t.balanceType}","${(t.narration || '').replace(/"/g, '""')}"`),
    `"TOTAL","","","","${totalDebit.toFixed(2)}","${totalCredit.toFixed(2)}","${netBalance.toFixed(2)}","${balanceType}",""`
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Statement_${accountName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  a.click();
};

export const getAccountHeads = getFirmMasterAccounts;

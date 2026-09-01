// frontend/src/utils/statementEngine.js

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
    all.forEach(v => { if (v && v.id) map.set(v.id, v); });
    all = Array.from(map.values());
  } catch (e) { all = []; }
  return all;
};

export const getAccountHeads = (firmId) => {
  let accounts = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('app_accounts') || key.includes('accounts'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) accounts = accounts.concat(parsed);
        }
      }
    }
    const map = new Map();
    accounts.forEach(a => { if (a && a.account_name) map.set(a.account_name.toLowerCase(), a); });
    accounts = Array.from(map.values());
  } catch (e) { accounts = []; }
  return accounts;
};

export const getAccountStatement = (firmId, accountName) => {
  if (!accountName) return { transactions: [], netBalance: 0, balanceType: 'Cr' };

  const vouchers = getAllUniversalVouchers(firmId);
  const targetName = accountName.toLowerCase().trim();

  let runningBalance = 0;
  let txList = [];

  vouchers.forEach(v => {
    const dr = (v.dr_account || '').toLowerCase();
    const cr = (v.cr_account || '').toLowerCase();
    const amt = parseFloat(v.amount || 0);

    let isDebit = dr.includes(targetName);
    let isCredit = cr.includes(targetName);

    if (isDebit || isCredit) {
      if (isDebit) runningBalance += amt;
      if (isCredit) runningBalance -= amt;

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
    balanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
  };
};

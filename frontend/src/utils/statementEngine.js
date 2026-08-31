// frontend/src/utils/statementEngine.js

export const getAccountHeads = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_accounts_${targetId}`;
  let accounts = [];
  try {
    const raw = localStorage.getItem(key);
    accounts = raw ? JSON.parse(raw) : [];
  } catch (e) { accounts = []; }

  if (accounts.length === 0) {
    accounts = [
      { id: 'ACC-1', account_name: 'Diesel Account' },
      { id: 'ACC-2', account_name: 'Cash-in-Hand A/C' },
      { id: 'ACC-3', account_name: 'Rk Supplier A/C' },
      { id: 'ACC-4', account_name: 'Coal / Fuel Account' }
    ];
    localStorage.setItem(key, JSON.stringify(accounts));
  }
  return accounts;
};

export const getAccountLedgerStatement = (firmId, accountName,fromDate, toDate) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }

  return vouchers.filter(v => {
    const matchAccount = (v.dr_account === accountName || v.cr_account === accountName);
    const vDate = v.date || new Date().toISOString().split('T')[0];
    const matchDate = (!fromDate || vDate >= fromDate) && (!toDate || vDate <= toDate);
    return matchAccount && matchDate;
  });
};

export const downloadCSVStatement = (firmName, accountName, transactions) => {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += `STATEMENT OF ACCOUNT: ${accountName}\nFirm: ${firmName}\n\nDate,Voucher Ref,Particulars,Debit (Rs),Credit (Rs)\n`;

  transactions.forEach(t => {
    const drVal = t.dr_account === accountName ? t.amount : 0;
    const crVal = t.cr_account === accountName ? t.amount : 0;
    csvContent += `${t.date || '2026-08-31'},${t.id},${t.dr_account} / ${t.cr_account},${drVal},${crVal}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Statement_${accountName.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

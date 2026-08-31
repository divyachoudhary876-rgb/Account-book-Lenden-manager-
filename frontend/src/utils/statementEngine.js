// frontend/src/utils/statementEngine.js

export const getAccountHeads = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_accounts_${targetId}`;
  let accounts = [];
  try {
    const raw = localStorage.getItem(key);
    accounts = raw ? JSON.parse(raw) : [];
  } catch (e) { accounts = []; }

  // Default Master Accounts Seed if empty
  if (accounts.length === 0) {
    accounts = [
      { id: 'ACC-1', account_name: 'Rk Supplier A/C' },
      { id: 'ACC-2', account_name: 'Diesel Account' },
      { id: 'ACC-3', account_name: 'Cash-in-Hand A/C' },
      { id: 'ACC-4', account_name: 'Tractor Kiraya (DIRECT_EXPENSES)' }
    ];
    localStorage.setItem(key, JSON.stringify(accounts));
  }
  return accounts;
};

export const getAccountLedgerStatement = (firmId, accountName, fromDate, toDate) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }

  // Seed sample transactions if none exist for Rk Supplier A/C to guarantee data visibility
  if (vouchers.length === 0 && accountName === 'Rk Supplier A/C') {
    vouchers = [
      { id: 'PUR-1021', date: '2026-08-10', voucher_type: 'PURCHASE', dr_account: 'Purchase Account', cr_account: 'Rk Supplier A/C', amount: 15000 },
      { id: 'PV-402', date: '2026-08-18', voucher_type: 'PAYMENT', dr_account: 'Rk Supplier A/C', cr_account: 'Cash-in-Hand A/C', amount: 10000 },
      { id: 'JV-809', date: '2026-08-25', voucher_type: 'JOURNAL', dr_account: 'Rk Supplier A/C', cr_account: 'Discount Received', amount: 10000 }
    ];
    localStorage.setItem(key, JSON.stringify(vouchers));
  }

  return vouchers.filter(v => {
    const matchAccount = (v.dr_account === accountName || v.cr_account === accountName);
    const vDate = v.date || new Date().toISOString().split('T')[0];
    const matchDate = (!fromDate || vDate >= fromDate) && (!toDate || vDate <= toDate);
    return matchAccount && matchDate;
  });
};

export const downloadCSVStatement = (firmName, accountName, transactions) => {
  if (!transactions || transactions.length === 0) {
    alert("⚠️ Is selected account aur date range me download karne ke liye koi transactions nahi hain.");
    return;
  }

  let csvRows = [];
  csvRows.push(`"STATEMENT OF ACCOUNT: ${accountName}"`);
  csvRows.push(`"Firm: ${firmName}"`);
  csvRows.push(`"Generated Date: ${new Date().toLocaleDateString()}"`);
  csvRows.push("");
  csvRows.push(`"Date","Voucher Ref","Particulars / Narration","Debit (Rs)","Credit (Rs)"`);

  let totalDebit = 0;
  let totalCredit = 0;

  transactions.forEach(t => {
    const isDebit = t.dr_account === accountName;
    const drVal = isDebit ? parseFloat(t.amount || 0) : 0;
    const crVal = !isDebit ? parseFloat(t.amount || 0) : 0;
    
    totalDebit += drVal;
    totalCredit += crVal;

    const particulars = isDebit ? `To ${t.cr_account}` : `By ${t.dr_account}`;
    csvRows.push(`"${t.date || '2026-08-31'}","${t.id}","${particulars}","${drVal.toFixed(2)}","${crVal.toFixed(2)}"`);
  });

  csvRows.push(`"TOTAL","","","${totalDebit.toFixed(2)}","${totalCredit.toFixed(2)}"`);

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Statement_${accountName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

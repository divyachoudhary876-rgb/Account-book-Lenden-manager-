// frontend/src/utils/statementEngine.js

export const getAccountHeads = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_accounts_${targetId}`;
  let accounts = [];
  try {
    const raw = localStorage.getItem(key);
    accounts = raw ? JSON.parse(raw) : [];
  } catch (e) { accounts = []; }

  // Clean initialization without dummy accounts
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

  // Strict User Transaction Filter (No Hardcoded Fallback Seed Data)
  return vouchers.filter(v => {
    const matchAccount = (v.dr_account === accountName || v.cr_account === accountName);
    const vDate = v.date || new Date().toISOString().split('T')[0];
    const matchDate = (!fromDate || vDate >= fromDate) && (!toDate || vDate <= toDate);
    return matchAccount && matchDate;
  });
};

export const downloadCSVStatement = (firmName, accountName, transactions) => {
  if (!transactions || transactions.length === 0) {
    alert("⚠️ No transactions found for export in the selected range.");
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
    csvRows.push(`"${t.date || ''}","${t.id}","${particulars}","${drVal.toFixed(2)}","${crVal.toFixed(2)}"`);
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

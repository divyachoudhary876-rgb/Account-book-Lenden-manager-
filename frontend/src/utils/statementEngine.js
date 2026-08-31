// frontend/src/utils/statementEngine.js

const DEFAULT_SYSTEM_ACCOUNTS = [
  { id: 'ACC-CASH', account_name: 'Cash-in-Hand A/C', account_group: 'CASH' },
  { id: 'ACC-BANK', account_name: 'Main Bank Account', account_group: 'BANK' },
  { id: 'ACC-SALES', account_name: 'Sales Account', account_group: 'INCOME' },
  { id: 'ACC-PURCHASE', account_name: 'Purchase Account', account_group: 'EXPENSE' }
];

export const getAccountHeads = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_accounts_${targetId}`;
  let accounts = [];

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      accounts = JSON.parse(raw);
    }
  } catch (e) {
    accounts = [];
  }

  // Preserve user-created accounts and merge baseline system accounts
  if (!accounts || accounts.length === 0) {
    accounts = [...DEFAULT_SYSTEM_ACCOUNTS];
  } else {
    DEFAULT_SYSTEM_ACCOUNTS.forEach(def => {
      const exists = accounts.some(a => a.account_name.toLowerCase() === def.account_name.toLowerCase());
      if (!exists) {
        accounts.unshift(def);
      }
    });
  }

  localStorage.setItem(key, JSON.stringify(accounts));
  return accounts;
};

export const createQuickAccountHead = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  if (!accountData.account_name || !accountData.account_name.trim()) {
    throw new Error("⚠️ Account Name is required.");
  }

  const key = `app_accounts_${targetId}`;
  const accounts = getAccountHeads(targetId);
  const name = accountData.account_name.trim();

  const exists = accounts.some(a => a.account_name.toLowerCase() === name.toLowerCase());
  if (exists) {
    throw new Error(`⚠️ Account "${name}" already exists.`);
  }

  const newAccount = {
    id: `ACC-${Date.now()}`,
    account_name: name,
    account_group: accountData.account_group || 'SUNDRY_DEBTOR',
    gstin: accountData.gstin || '',
    phone: accountData.phone || ''
  };

  accounts.push(newAccount);
  localStorage.setItem(key, JSON.stringify(accounts));
  window.dispatchEvent(new Event('storage'));
  return newAccount;
};

export const getAccountLedgerStatement = (firmId, accountName, fromDate, toDate) => {
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
  if (!transactions || transactions.length === 0) {
    alert("⚠️ No transactions to export.");
    return;
  }

  let csvRows = [];
  csvRows.push(`"STATEMENT OF ACCOUNT: ${accountName}"`);
  csvRows.push(`"Firm: ${firmName}"`);
  csvRows.push(`"Generated Date: ${new Date().toLocaleDateString()}"`);
  csvRows.push("");
  csvRows.push(`"Date","Voucher Ref","Particulars","Debit (Rs)","Credit (Rs)"`);

  transactions.forEach(t => {
    const isDebit = t.dr_account === accountName;
    const drVal = isDebit ? parseFloat(t.amount || 0) : 0;
    const crVal = !isDebit ? parseFloat(t.amount || 0) : 0;
    const particulars = isDebit ? `To ${t.cr_account}` : `By ${t.dr_account}`;
    csvRows.push(`"${t.date || ''}","${t.id}","${particulars}","${drVal.toFixed(2)}","${crVal.toFixed(2)}"`);
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Statement_${accountName.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

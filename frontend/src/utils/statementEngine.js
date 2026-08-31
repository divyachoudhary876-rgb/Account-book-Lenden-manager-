  document.body.removeChild(link);
};
// frontend/src/utils/statementEngine.js

// Default Baseline Accounts (Seed only when storage is completely empty)
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

  // Seed default accounts ONLY if localStorage key does not exist at all
  if (!accounts || accounts.length === 0) {
    accounts = [...DEFAULT_SYSTEM_ACCOUNTS];
    localStorage.setItem(key, JSON.stringify(accounts));
  } else {
    // Ensure essential system accounts always exist alongside user created accounts
    DEFAULT_SYSTEM_ACCOUNTS.forEach(defAcc => {
      const exists = accounts.some(a => a.account_name.toLowerCase() === defAcc.account_name.toLowerCase());
      if (!exists) {
        accounts.unshift(defAcc);
      }
    });
    localStorage.setItem(key, JSON.stringify(accounts));
  }

  return accounts;
};

export const createQuickAccountHead = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  if (!accountData.account_name || accountData.account_name.trim() === '') {
    throw new Error("⚠️ Account Name is required.");
  }

  const key = `app_accounts_${targetId}`;
  const accounts = getAccountHeads(targetId);

  const trimmedName = accountData.account_name.trim();
  const exists = accounts.some(a => a.account_name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    throw new Error(`⚠️ Account "${trimmedName}" already exists.`);
  }

  const newAcc = {
    id: `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    account_name: trimmedName,
    account_group: accountData.account_group || 'SUNDRY_DEBTOR',
    gstin: accountData.gstin || '',
    phone: accountData.phone || '',
    billing_address: accountData.billing_address || ''
  };

  accounts.push(newAcc);
  localStorage.setItem(key, JSON.stringify(accounts));

  // Trigger global storage event to sync all open screens & modals
  window.dispatchEvent(new Event('storage'));
  return newAcc;
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
    alert("⚠️ Selected account me export karne ke liye koi transactions nahi hain.");
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

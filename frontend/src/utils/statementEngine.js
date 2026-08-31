// frontend/src/utils/statementEngine.js

// Fetch ONLY user-created accounts from Master Storage
export const getAccountHeads = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const primaryKey = `app_accounts_${targetId}`;
  const secondaryKey = `app_accounts_master_${targetId}`;
  let accounts = [];

  try {
    const primaryData = JSON.parse(localStorage.getItem(primaryKey) || 'null');
    const secondaryData = JSON.parse(localStorage.getItem(secondaryKey) || 'null');

    let rawList = [];
    if (Array.isArray(primaryData)) rawList = rawList.concat(primaryData);
    if (Array.isArray(secondaryData)) rawList = rawList.concat(secondaryData);

    // Deduplicate accounts created by user
    const accountMap = new Map();
    rawList.forEach(item => {
      if (item && item.account_name) {
        const normKey = item.account_name.trim().toLowerCase();
        if (!accountMap.has(normKey)) {
          accountMap.set(normKey, {
            id: item.id || `ACC-${Date.now()}`,
            account_name: item.account_name.trim(),
            account_group: item.account_group || 'GENERAL'
          });
        }
      }
    });

    accounts = Array.from(accountMap.values());
  } catch (e) {
    accounts = [];
  }

  // Pure User Accounts List (Zero Pre-seeded Default Accounts)
  return accounts;
};

// Pure Custom Account Creation
export const createQuickAccountHead = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  if (!accountData.account_name || !accountData.account_name.trim()) {
    throw new Error("⚠️ Account Name is required.");
  }

  const primaryKey = `app_accounts_${targetId}`;
  const currentAccounts = getAccountHeads(targetId);
  const trimmedName = accountData.account_name.trim();

  const exists = currentAccounts.some(a => a.account_name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    throw new Error(`⚠️ Account "${trimmedName}" already exists.`);
  }

  const newAccount = {
    id: `ACC-${Date.now()}`,
    account_name: trimmedName,
    account_group: accountData.account_group || 'SUNDRY_DEBTORS',
    gstin: accountData.gstin || '',
    phone: accountData.phone || ''
  };

  currentAccounts.push(newAccount);
  localStorage.setItem(primaryKey, JSON.stringify(currentAccounts));

  // Trigger sync across all forms
  window.dispatchEvent(new Event('accounts_updated'));
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
    alert("⚠️ Selected account has no transactions to export.");
    return;
  }

  let csvRows = [];
  csvRows.push(`"STATEMENT OF ACCOUNT: ${accountName}"`);
  csvRows.push(`"Firm: ${firmName}"`);
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

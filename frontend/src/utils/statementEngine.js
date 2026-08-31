// frontend/src/utils/statementEngine.js

// Universal Account Master Lookup Engine
export const getAccountHeads = (firmId) => {
  let combinedAccounts = [];

  try {
    // 1. Scan all localStorage keys for any account entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('app_accounts') || key.startsWith('app_account_masters'))) {
        const rawData = localStorage.getItem(key);
        if (rawData) {
          const parsed = JSON.parse(rawData);
          if (Array.isArray(parsed)) {
            combinedAccounts = combinedAccounts.concat(parsed);
          }
        }
      }
    }

    // 2. Deduplicate by Account Name (Case-Insensitive)
    const accountMap = new Map();
    combinedAccounts.forEach(acc => {
      if (acc && acc.account_name) {
        const cleanName = acc.account_name.trim();
        if (!accountMap.has(cleanName.toLowerCase())) {
          accountMap.set(cleanName.toLowerCase(), {
            id: acc.id || `ACC-${Date.now()}-${Math.random()}`,
            account_name: cleanName,
            account_group: acc.account_group || acc.sub_group || 'GENERAL'
          });
        }
      }
    });

    combinedAccounts = Array.from(accountMap.values());
  } catch (e) {
    combinedAccounts = [];
  }

  // Save back to master global store
  if (combinedAccounts.length > 0) {
    localStorage.setItem('app_accounts_master_global', JSON.stringify(combinedAccounts));
    if (firmId) {
      localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(combinedAccounts));
    }
  }

  return combinedAccounts;
};

// Create Account Head Logic (Pushes to Global Master Store)
export const createQuickAccountHead = (firmId, accountData) => {
  if (!accountData.account_name || !accountData.account_name.trim()) {
    throw new Error("⚠️ Account / Party Name is required.");
  }

  const trimmedName = accountData.account_name.trim();
  const currentAccounts = getAccountHeads(firmId);

  const exists = currentAccounts.some(a => a.account_name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    throw new Error(`⚠️ Account "${trimmedName}" already exists in Master Registry.`);
  }

  const newAccount = {
    id: `ACC-${Date.now()}`,
    account_name: trimmedName,
    account_group: accountData.account_group || 'SUNDRY_DEBTORS',
    created_at: new Date().toISOString()
  };

  currentAccounts.push(newAccount);

  // Sync across all storage keys
  const targetId = firmId || 'FIRM-001';
  localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(currentAccounts));
  localStorage.setItem('app_accounts_master_global', JSON.stringify(currentAccounts));

  // Dispatch event for real-time reactivity
  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));
  return newAccount;
};

export const getAccountLedgerStatement = (firmId, accountName, fromDate, toDate) => {
  let vouchers = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('app_vouchers')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) vouchers = vouchers.concat(parsed);
        }
      }
    }
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

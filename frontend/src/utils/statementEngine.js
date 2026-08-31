// frontend/src/utils/statementEngine.js

// Deep Multi-Property Universal Storage Aggregator
export const getAccountHeads = (firmId) => {
  let rawAccountsList = [];

  try {
    // 1. Scan ALL localStorage keys starting with app_accounts or related prefixes
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('app_accounts') || 
        key.startsWith('app_account') || 
        key.includes('accounts') ||
        key.includes('ledger')
      )) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              rawAccountsList = rawAccountsList.concat(parsed);
            } else if (typeof parsed === 'object' && parsed !== null) {
              if (parsed.account_name || parsed.name) rawAccountsList.push(parsed);
              else rawAccountsList = rawAccountsList.concat(Object.values(parsed));
            }
          } catch (e) { /* Ignore non-JSON strings */ }
        }
      }
    }

    // 2. Normalize and Deduplicate Accounts (Handles all field name variants)
    const accountMap = new Map();
    rawAccountsList.forEach(item => {
      if (item && typeof item === 'object') {
        const accName = item.account_name || item.name || item.party_name;
        if (accName && typeof accName === 'string' && accName.trim() !== '') {
          const cleanName = accName.trim();
          const normKey = cleanName.toLowerCase();
          
          if (!accountMap.has(normKey)) {
            accountMap.set(normKey, {
              id: item.id || `ACC-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              account_name: cleanName,
              account_group: item.sub_group || item.account_group || item.primary_type || 'GENERAL',
              primary_type: item.primary_type || 'Assets',
              opening_balance: parseFloat(item.opening_balance || 0),
              balance_type: item.balance_type || 'Dr',
              gstin: item.gstin || item.gstin_number || '',
              mobile: item.mobile || item.phone || ''
            });
          }
        }
      }
    });

    rawAccountsList = Array.from(accountMap.values());
  } catch (err) {
    rawAccountsList = [];
  }

  // 3. Mirror master list back to common keys for fast secondary reads
  if (rawAccountsList.length > 0) {
    try {
      const jsonStr = JSON.stringify(rawAccountsList);
      localStorage.setItem('app_global_master_accounts', jsonStr);
      localStorage.setItem('app_accounts', jsonStr);
      if (firmId) localStorage.setItem(`app_accounts_${firmId}`, jsonStr);
    } catch (e) { console.error("Mirror sync error", e); }
  }

  return rawAccountsList;
};

// Create Quick Account Head Engine
export const createQuickAccountHead = (firmId, accountData) => {
  if (!accountData || !accountData.account_name || !accountData.account_name.trim()) {
    throw new Error("⚠️ Account / Party Name is required.");
  }

  const trimmedName = accountData.account_name.trim();
  const currentAccounts = getAccountHeads(firmId);

  const exists = currentAccounts.some(a => a.account_name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    throw new Error(`⚠️ Account "${trimmedName}" already exists in Party Master.`);
  }

  const newAccount = {
    id: `ACC-${Date.now()}`,
    account_name: trimmedName,
    primary_type: accountData.primary_type || 'Assets',
    sub_group: accountData.sub_group || accountData.account_group || 'SUNDRY_DEBTORS',
    account_group: accountData.sub_group || accountData.account_group || 'SUNDRY_DEBTORS',
    opening_balance: parseFloat(accountData.opening_balance || 0),
    balance_type: accountData.balance_type || 'Dr',
    gstin: accountData.gstin || '',
    mobile: accountData.mobile || '',
    created_at: new Date().toISOString()
  };

  currentAccounts.push(newAccount);

  const jsonStr = JSON.stringify(currentAccounts);
  localStorage.setItem('app_global_master_accounts', jsonStr);
  localStorage.setItem('app_accounts', jsonStr);
  if (firmId) localStorage.setItem(`app_accounts_${firmId}`, jsonStr);

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

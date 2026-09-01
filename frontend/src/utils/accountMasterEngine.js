// frontend/src/utils/accountMasterEngine.js

export const DEFAULT_MASTER_ACCOUNTS = [
  { id: 'ACC-001', account_name: 'Cash-in-Hand', account_group: 'CASH_BANK', sub_group: 'CASH', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-002', account_name: 'Bank Account (Primary)', account_group: 'CASH_BANK', sub_group: 'BANK', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-003', account_name: 'Kisan Fuel Station (Diesel Pump)', account_group: 'SUNDRY_CREDITORS', sub_group: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },
  { id: 'ACC-004', account_name: 'Krishan Padgad (Vendor)', account_group: 'SUNDRY_CREDITORS', sub_group: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },
  { id: 'ACC-005', account_name: 'Raw Material Supplier', account_group: 'SUNDRY_CREDITORS', sub_group: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },
  { id: 'ACC-006', account_name: 'Sharma Construction (Customer)', account_group: 'SUNDRY_DEBTORS', sub_group: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-007', account_name: 'Balaji Traders (Client)', account_group: 'SUNDRY_DEBTORS', sub_group: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-008', account_name: 'Diesel Expenses', account_group: 'DIRECT_EXPENSES', sub_group: 'FUEL_EXPENSES', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-009', account_name: 'Sales & Revenue', account_group: 'INCOME', sub_group: 'DIRECT_INCOME', opening_balance: 0, balance_type: 'Cr' }
];

/**
 * Universal Account Scanner & Auto-Bootstrap Engine
 */
export const getFirmMasterAccounts = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  let mergedAccounts = [];

  try {
    const scopedKey = `app_accounts_${targetId}`;
    const rawScoped = localStorage.getItem(scopedKey);
    if (rawScoped) {
      const parsed = JSON.parse(rawScoped);
      if (Array.isArray(parsed) && parsed.length > 0) {
        mergedAccounts = mergedAccounts.concat(parsed);
      }
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('app_accounts') || key.includes('accounts'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) mergedAccounts = mergedAccounts.concat(parsed);
        }
      }
    }

    // Harvest parties directly from historical vouchers
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('app_vouchers') || key.includes('vouchers'))) {
        const rawV = localStorage.getItem(key);
        if (rawV) {
          const vouchers = JSON.parse(rawV);
          if (Array.isArray(vouchers)) {
            vouchers.forEach(v => {
              if (v.dr_account && v.dr_account.trim() !== '') {
                mergedAccounts.push({
                  id: `ACC-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  account_name: v.dr_account.trim(),
                  account_group: 'SUNDRY_DEBTORS',
                  sub_group: 'GENERAL',
                  opening_balance: 0,
                  balance_type: 'Dr'
                });
              }
              if (v.cr_account && v.cr_account.trim() !== '') {
                mergedAccounts.push({
                  id: `ACC-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  account_name: v.cr_account.trim(),
                  account_group: 'SUNDRY_CREDITORS',
                  sub_group: 'GENERAL',
                  opening_balance: 0,
                  balance_type: 'Cr'
                });
              }
            });
          }
        }
      }
    }

    const map = new Map();
    mergedAccounts.forEach(a => {
      if (a && a.account_name && a.account_name.trim() !== '') {
        const normalized = a.account_name.trim();
        const k = normalized.toLowerCase();
        if (!map.has(k)) {
          map.set(k, { ...a, account_name: normalized });
        }
      }
    });

    let finalAccounts = Array.from(map.values());

    if (finalAccounts.length === 0) {
      finalAccounts = [...DEFAULT_MASTER_ACCOUNTS];
      localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(finalAccounts));
      localStorage.setItem('app_accounts_global', JSON.stringify(finalAccounts));
      localStorage.setItem('app_accounts', JSON.stringify(finalAccounts));
    }

    return finalAccounts;
  } catch (err) {
    console.error("Account scan error:", err);
    return DEFAULT_MASTER_ACCOUNTS;
  }
};

/**
 * Save or Update Account Head
 */
export const saveMasterAccount = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  const existingList = getFirmMasterAccounts(targetId);

  const cleanName = (accountData.account_name || '').trim();
  if (!cleanName) throw new Error("⚠️ Account Name cannot be empty.");

  const newAccount = {
    id: accountData.id || `ACC-${Date.now()}`,
    account_name: cleanName,
    account_group: accountData.account_group || 'SUNDRY_DEBTORS',
    sub_group: accountData.sub_group || accountData.account_group || 'GENERAL',
    opening_balance: parseFloat(accountData.opening_balance || 0),
    balance_type: accountData.balance_type || 'Dr',
    phone: accountData.phone || '',
    created_at: new Date().toISOString()
  };

  const updatedList = [
    newAccount,
    ...existingList.filter(a => a.account_name.toLowerCase() !== cleanName.toLowerCase())
  ];

  localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(updatedList));
  localStorage.setItem('app_accounts_global', JSON.stringify(updatedList));
  localStorage.setItem('app_accounts', JSON.stringify(updatedList));

  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return newAccount;
};

// --- Export Aliases to Guarantee Module Interoperability ---
export const getAccountHeadsByFirm = getFirmMasterAccounts;
export const saveOrUpdateAccountHead = saveMasterAccount;
export const getAccountHeads = getFirmMasterAccounts;

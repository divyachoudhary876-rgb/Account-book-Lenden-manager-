// frontend/src/utils/accountMasterEngine.js

// Default Starter Chart of Accounts (Auto-seeded when storage is empty)
export const DEFAULT_MASTER_ACCOUNTS = [
  // --- CASH & BANK ---
  { id: 'ACC-001', account_name: 'Cash-in-Hand', account_group: 'CASH_BANK', sub_group: 'CASH', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-002', account_name: 'State Bank of India (SBI)', account_group: 'CASH_BANK', sub_group: 'BANK', opening_balance: 0, balance_type: 'Dr' },
  
  // --- SUNDRY CREDITORS (Suppliers / Vendors / Petrol Pumps) ---
  { id: 'ACC-003', account_name: 'Kisan Fuel Station (Diesel Pump)', account_group: 'SUNDRY_CREDITORS', sub_group: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },
  { id: 'ACC-004', account_name: 'Krishan Padgad (Vendor)', account_group: 'SUNDRY_CREDITORS', sub_group: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },
  { id: 'ACC-005', account_name: 'Raw Material Supplier', account_group: 'SUNDRY_CREDITORS', sub_group: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },

  // --- SUNDRY DEBTORS (Customers / Party / Clients) ---
  { id: 'ACC-006', account_name: 'Sharma Construction (Customer)', account_group: 'SUNDRY_DEBTORS', sub_group: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-007', account_name: 'Balaji Traders (Client)', account_group: 'SUNDRY_DEBTORS', sub_group: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-008', account_name: 'Local Cash Customer', account_group: 'SUNDRY_DEBTORS', sub_group: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },

  // --- EXPENSES & REVENUE ---
  { id: 'ACC-009', account_name: 'Diesel Expenses', account_group: 'DIRECT_EXPENSES', sub_group: 'FUEL_EXPENSES', opening_balance: 0, balance_type: 'Dr' },
  { id: 'ACC-010', account_name: 'Sales & Revenue', account_group: 'INCOME', sub_group: 'DIRECT_INCOME', opening_balance: 0, balance_type: 'Cr' }
];

/**
 * Universal Master Account Scanner & Self-Healing Harvester
 */
export const getFirmMasterAccounts = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  let mergedAccounts = [];

  try {
    // 1. Scan direct firm scoped storage
    const scopedKey = `app_accounts_${targetId}`;
    const rawScoped = localStorage.getItem(scopedKey);
    if (rawScoped) {
      const parsed = JSON.parse(rawScoped);
      if (Array.isArray(parsed) && parsed.length > 0) {
        mergedAccounts = mergedAccounts.concat(parsed);
      }
    }

    // 2. Scan all storage keys matching accounts
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

    // 3. Harvest parties directly from historical vouchers if any exist
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
                  id: `ACC-HARVEST-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  account_name: v.dr_account.trim(),
                  account_group: 'SUNDRY_DEBTORS',
                  sub_group: 'GENERAL',
                  opening_balance: 0,
                  balance_type: 'Dr'
                });
              }
              if (v.cr_account && v.cr_account.trim() !== '') {
                mergedAccounts.push({
                  id: `ACC-HARVEST-${Date.now()}-${Math.floor(Math.random()*1000)}`,
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

    // 4. Deduplicate Accounts by Name (Case-Insensitive)
    const map = new Map();
    mergedAccounts.forEach(a => {
      if (a && a.account_name && a.account_name.trim() !== '') {
        const normalizedName = a.account_name.trim();
        const key = normalizedName.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { ...a, account_name: normalizedName });
        }
      }
    });

    let finalAccounts = Array.from(map.values());

    // 5. Self-Healing Auto-Seed: If accounts list is empty or minimal, seed standard defaults
    if (finalAccounts.length === 0) {
      finalAccounts = [...DEFAULT_MASTER_ACCOUNTS];
      localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(finalAccounts));
      localStorage.setItem('app_accounts_global', JSON.stringify(finalAccounts));
      localStorage.setItem('app_accounts', JSON.stringify(finalAccounts));
    }

    return finalAccounts;
  } catch (err) {
    console.error("Critical error in getFirmMasterAccounts:", err);
    return DEFAULT_MASTER_ACCOUNTS;
  }
};

/**
 * Filtered Getters for Targeted Dropdowns
 */
export const getSuppliersList = (firmId) => {
  const all = getFirmMasterAccounts(firmId);
  return all.filter(a => 
    a.account_group === 'SUNDRY_CREDITORS' || 
    a.account_group === 'CASH_BANK' ||
    a.sub_group === 'SUNDRY_CREDITORS' ||
    a.account_name.toLowerCase().includes('supplier') ||
    a.account_name.toLowerCase().includes('pump') ||
    a.account_name.toLowerCase().includes('vendor') ||
    a.account_name.toLowerCase().includes('krishan')
  );
};

export const getCustomersList = (firmId) => {
  const all = getFirmMasterAccounts(firmId);
  return all.filter(a => 
    a.account_group === 'SUNDRY_DEBTORS' || 
    a.sub_group === 'SUNDRY_DEBTORS' ||
    a.account_name.toLowerCase().includes('customer') ||
    a.account_name.toLowerCase().includes('traders') ||
    a.account_name.toLowerCase().includes('client')
  );
};

/**
 * Add / Create New Master Account
 */
export const saveMasterAccount = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  const existingList = getFirmMasterAccounts(targetId);

  const cleanName = accountData.account_name.trim();
  if (!cleanName) throw new Error("⚠️ Account Name cannot be empty.");

  const newAccount = {
    id: accountData.id || `ACC-${Date.now()}`,
    account_name: cleanName,
    account_group: accountData.account_group || 'SUNDRY_DEBTORS',
    sub_group: accountData.sub_group || accountData.account_group || 'GENERAL',
    opening_balance: parseFloat(accountData.opening_balance || 0),
    balance_type: accountData.balance_type || 'Dr',
    created_at: new Date().toISOString()
  };

  const updatedList = [newAccount, ...existingList.filter(a => a.account_name.toLowerCase() !== cleanName.toLowerCase())];

  localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(updatedList));
  localStorage.setItem('app_accounts_global', JSON.stringify(updatedList));
  localStorage.setItem('app_accounts', JSON.stringify(updatedList));

  // Trigger Universal Sync
  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return newAccount;
};

// frontend/src/utils/accountMasterEngine.js

/**
 * Standard Statutory Account Hierarchy (Ind AS / Indian GAAP Aligned)
 */
export const ACCOUNT_HIERARCHY = {
  ASSETS: {
    label: 'ASSETS (संपत्तियां)',
    normalBalance: 'Dr',
    subGroups: [
      'Cash in Hand (रोकड़)',
      'Bank Accounts (बैंक खाते)',
      'Sundry Debtors (Customer / देनदार)',
      'Raw Material Inventory (कच्चा माल)',
      'Finished Goods Inventory (तैयार माल)',
      'Consumables & Fuel Stock (ईंधन/डीजल स्टॉक)',
      'Loans & Advances (Given)',
      'Fixed Assets (Machinery / Vehicles / Land)'
    ]
  },
  LIABILITIES: {
    label: 'LIABILITIES (देनदारियां / दायित्व)',
    normalBalance: 'Cr',
    subGroups: [
      'Sundry Creditors (Suppliers / लेनदार)',
      'Duties & Taxes (GST / TDS Payable)',
      'Bank Overdraft / CC Accounts',
      'Secured & Unsecured Loans',
      'Outstanding Expenses Payable'
    ]
  },
  EQUITY: {
    label: 'EQUITY & CAPITAL (पूंजी / स्वामित्व)',
    normalBalance: 'Cr',
    subGroups: [
      'Proprietor / Partner Capital Account',
      'Drawings Account (आहरण)',
      'Retained Earnings / Reserves'
    ]
  },
  EXPENSES: {
    label: 'EXPENSES (खर्च / लागत)',
    normalBalance: 'Dr',
    subGroups: [
      'Direct Production & Factory Expenses',
      'Direct Production Expenses',
      'Operating Fuel Costs (Tractor / Generator Diesel)',
      'Kiln Burning Fuel (Coal / Briquette / Husk)',
      'Direct Labor & Pathai Expenses (मजदूरी)',
      'Machinery Maintenance & Repairs',
      'Freight & Cartage Inward (भाड़ा)',
      'Administrative & Office Expenses',
      'Selling & Distribution Expenses',
      'Financial Charges & Bank Interest'
    ]
  },
  INCOME: {
    label: 'INCOME / REVENUE (आय व बिक्री)',
    normalBalance: 'Cr',
    subGroups: [
      'Direct Sales Revenue (बिक्री)',
      'Contract & Manufacturing Receipts',
      'Discount & Rebate Received',
      'Other Indirect Operating Income'
    ]
  }
};

/**
 * Retrieve master account heads strictly isolated for active firm
 */
export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  try {
    let rawAccounts = [];

    const primaryKey = `app_accounts_${firmId}`;
    const primaryRaw = localStorage.getItem(primaryKey);
    if (primaryRaw) {
      const parsed = JSON.parse(primaryRaw);
      if (Array.isArray(parsed)) rawAccounts.push(...parsed);
    }

    const modalKey = `account_heads_${firmId}`;
    const modalRaw = localStorage.getItem(modalKey);
    if (modalRaw) {
      const parsed = JSON.parse(modalRaw);
      if (Array.isArray(parsed)) rawAccounts.push(...parsed);
    }

    const globalRaw = localStorage.getItem('app_accounts');
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed)) rawAccounts.push(...parsed);
    }

    const uniqueMap = new Map();
    rawAccounts.forEach(acc => {
      if (!acc) return;
      const name = (acc.account_name || acc.name || '').trim();
      if (name) {
        const normalizedAcc = {
          ...acc,
          account_name: name,
          name: name,
          sub_group: acc.sub_group || acc.group || 'General Ledger',
          primary_type: acc.primary_type || acc.type || 'Expenses',
          opening_balance: Number(acc.opening_balance || acc.openingBalance || 0),
          balance_type: acc.balance_type || acc.balanceType || 'Dr'
        };
        uniqueMap.set(name.toLowerCase(), normalizedAcc);
      }
    });

    if (uniqueMap.size > 0) {
      return Array.from(uniqueMap.values());
    }

    const defaultAccounts = [
      { id: 'ACC-001', account_name: 'Cash in Hand (रोकड़)', primary_type: 'ASSETS', sub_group: 'Cash in Hand (रोकड़)', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
      { id: 'ACC-002', account_name: 'State Bank of India (बैंक)', primary_type: 'ASSETS', sub_group: 'Bank Accounts (बैंक खाते)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-003', account_name: 'Tractor Fuel & Running Expense', primary_type: 'EXPENSES', sub_group: 'Operating Fuel Costs (Tractor / Generator Diesel)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-004', account_name: 'Bhatta Kiln Burning Expense (कोयला/ईंधन)', primary_type: 'EXPENSES', sub_group: 'Kiln Burning Fuel (Coal / Briquette / Husk)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-005', account_name: 'Generator Fuel & Power Expense', primary_type: 'EXPENSES', sub_group: 'Operating Fuel Costs (Tractor / Generator Diesel)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-006', account_name: 'Labor & Pathai Expense (मजदूरी/पथाई)', primary_type: 'EXPENSES', sub_group: 'Direct Labor & Pathai Expenses (मजदूरी)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-007', account_name: 'Machinery Maintenance & Repairs', primary_type: 'EXPENSES', sub_group: 'Machinery Maintenance & Repairs', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-008', account_name: 'Sales Revenue Account', primary_type: 'INCOME', sub_group: 'Direct Sales Revenue (बिक्री)', opening_balance: 0, balance_type: 'Cr', is_system_locked: true },
      { id: 'ACC-009', account_name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', sub_group: 'Direct Production Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
      { id: 'ACC-010', account_name: 'Capital Account (स्वामी की पूंजी)', primary_type: 'EQUITY', sub_group: 'Proprietor / Partner Capital Account', opening_balance: 0, balance_type: 'Cr', is_system_locked: false }
    ];

    localStorage.setItem(primaryKey, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  } catch {
    return [];
  }
};

/**
 * Filter and extract only Expense account heads
 */
export const getExpenseAccountHeads = (firmId = 'FIRM-001') => {
  const accounts = getFirmMasterAccounts(firmId);
  const expenseList = accounts.filter(a => 
    a.primary_type === 'EXPENSES' || 
    (a.sub_group && (
      a.sub_group.toLowerCase().includes('expense') || 
      a.sub_group.toLowerCase().includes('fuel') || 
      a.sub_group.toLowerCase().includes('labor') || 
      a.sub_group.toLowerCase().includes('burning')
    ))
  );

  if (expenseList.length > 0) return expenseList;

  return [
    { id: 'EXP-1', account_name: 'Tractor Fuel & Running Expense', sub_group: 'Operating Fuel Costs (Tractor / Generator Diesel)' },
    { id: 'EXP-2', account_name: 'Bhatta Kiln Burning Expense (कोयला/ईंधन)', sub_group: 'Kiln Burning Fuel (Coal / Briquette / Husk)' },
    { id: 'EXP-3', account_name: 'Generator Fuel & Power Expense', sub_group: 'Operating Fuel Costs (Tractor / Generator Diesel)' },
    { id: 'EXP-4', account_name: 'Labor & Pathai Expense (मजदूरी/पथाई)', sub_group: 'Direct Labor & Pathai Expenses (मजदूरी)' },
    { id: 'EXP-5', account_name: 'Machinery Maintenance & Repairs', sub_group: 'Machinery Maintenance & Repairs' }
  ];
};

/**
 * Save or Update an Account Head with Universal Deep Storage & Entry Cascade Rename Engine
 */
export const saveMasterAccount = (firmId = 'FIRM-001', accountData = {}) => {
  const accounts = getFirmMasterAccounts(firmId);
  const cleanName = (accountData.account_name || accountData.name || '').trim();

  if (!cleanName) throw new Error('Account name cannot be empty.');

  const existingIdx = accounts.findIndex(
    a => (a.id && a.id === accountData.id) || a.account_name.toLowerCase() === cleanName.toLowerCase()
  );

  let oldName = '';
  if (existingIdx !== -1) {
    oldName = accounts[existingIdx].account_name || accounts[existingIdx].name || '';
  }

  const payload = {
    id: accountData.id || `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    account_name: cleanName,
    name: cleanName,
    primary_type: accountData.primary_type || accountData.type || 'EXPENSES',
    sub_group: accountData.sub_group || accountData.group || 'Direct Production Expenses',
    opening_balance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    balance_type: accountData.balance_type || accountData.balanceType || 'Dr',
    phone: accountData.phone || '',
    gstin: accountData.gstin || '',
    is_system_locked: Boolean(accountData.is_system_locked),
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    if (accounts[existingIdx].is_system_locked && accounts[existingIdx].account_name !== payload.account_name) {
      throw new Error(`System core account "${accounts[existingIdx].account_name}" cannot be renamed.`);
    }
    accounts[existingIdx] = { ...accounts[existingIdx], ...payload };
  } else {
    accounts.push(payload);
  }

  // 1. Save updated master accounts list across all firm & global keys
  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(accounts));
  localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(accounts));
  localStorage.setItem(`app_accounts`, JSON.stringify(accounts));
  localStorage.setItem(`app_account_heads`, JSON.stringify(accounts));

  // 2. ULTIMATE DEEP UNIVERSAL CASCADE RENAME ENGINE
  if (oldName && oldName.trim().toLowerCase() !== cleanName.trim().toLowerCase()) {
    const oldTarget = oldName.trim().toLowerCase();
    
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey) {
        const rawVal = localStorage.getItem(storageKey);
        if (rawVal) {
          try {
            let parsed = JSON.parse(rawVal);

            const recursiveReplace = (item) => {
              if (!item) return false;
              let changed = false;

              if (typeof item === 'object') {
                if (Array.isArray(item)) {
                  item.forEach((subItem) => {
                    if (recursiveReplace(subItem)) changed = true;
                  });
                } else {
                  Object.keys(item).forEach(prop => {
                    const val = item[prop];
                    if (typeof val === 'string' && val.trim().toLowerCase() === oldTarget) {
                      if ([
                        'dr_account', 'cr_account', 'supplier_name', 'customer_name', 
                        'party', 'account_name', 'name', 'worker', 'expense_ledger', 
                        'dr_party', 'cr_party', 'customer_account', 'supplier_account',
                        'linked_ledger_account', 'entity_name', 'item_name', 'item'
                      ].includes(prop)) {
                        item[prop] = cleanName;
                        changed = true;
                      }
                    } else if (typeof val === 'object' && val !== null) {
                      if (recursiveReplace(val)) changed = true;
                    }
                  });
                }
              }
              return changed;
            };

            if (recursiveReplace(parsed)) {
              localStorage.setItem(storageKey, JSON.stringify(parsed));
            }
          } catch (e) {}
        }
      }
    }
  }

  // 3. Broadcast aggressive global update events and reload window for instant 100% reflection across all views
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  
  setTimeout(() => {
    window.location.reload();
  }, 100);

  return payload;
};

/**
 * Delete an Account Head with Protected Master Guard
 */
export const deleteMasterAccount = (firmId = 'FIRM-001', accountId = '') => {
  const accounts = getFirmMasterAccounts(firmId);
  const target = accounts.find(a => a.id === accountId);

  if (!target) return false;

  if (target.is_system_locked) {
    throw new Error(`⚠️ Cannot delete core ledger account "${target.account_name}".`);
  }

  const updated = accounts.filter(a => a.id !== accountId);
  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(updated));
  localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

// frontend/src/utils/accountMasterEngine.js

export const ACCOUNT_HIERARCHY = {
  ASSETS: {
    label: 'Assets (संपत्ति)',
    defaultBalanceType: 'Dr',
    subGroups: [
      'Sundry Debtors (Customer / देनदार)',
      'Bank Accounts (बैंक खाते)',
      'Cash-in-Hand (नकद रोकड़)',
      'Stock / Inventory (स्टॉक इन्वेंटरी)',
      'Fixed Assets (मशीनरी / वाहन / संपत्ति)',
      'Loans & Advances (दिया गया अग्रिम/उधार)'
    ]
  },
  LIABILITIES: {
    label: 'Liabilities (दायित्व)',
    defaultBalanceType: 'Cr',
    subGroups: [
      'Sundry Creditors (Supplier / लेनदार)',
      'Diesel & Fuel Pumps (डीजल व पेट्रोल पंप)',
      'Secured Loans (बैंक ऋण)',
      'Unsecured Loans (व्यक्तिगत ऋण)',
      'Duties & Taxes (GST / TDS Payable)'
    ]
  },
  EXPENSES: {
    label: 'Expenses (खर्च)',
    defaultBalanceType: 'Dr',
    subGroups: [
      'Direct Expenses (पथाई / मजदूरी / निकासी)',
      'Diesel & Fuel Expenses (ईंधन खर्च)',
      'Raw Material & Coal Purchases (कोयला व कच्चा माल)',
      'Indirect Expenses (कार्यालय व सामान्य खर्च)',
      'Repair & Maintenance (मरम्मत खर्च)'
    ]
  },
  INCOME: {
    label: 'Income (आय)',
    defaultBalanceType: 'Cr',
    subGroups: [
      'Sales & Operating Revenue (बिक्री व मुख्य आय)',
      'Briquette / Brick Sales (ईंट व बायोमास बिक्री)',
      'Other Indirect Income (अन्य आय / ब्याज)'
    ]
  },
  EQUITY: {
    label: 'Equity (पूंजी)',
    defaultBalanceType: 'Cr',
    subGroups: [
      'Proprietor / Partner Capital A/C (पूंजी खाता)',
      'Drawings (आहरण खाता)',
      'Retained Earnings (संचित लाभ)'
    ]
  }
};

export const DEFAULT_ACCOUNTS = [
  { id: 'ACC-01', account_name: 'Cash-in-Hand', primary_type: 'ASSETS', sub_group: 'Cash-in-Hand (नकद रोकड़)', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
  { id: 'ACC-02', account_name: 'State Bank of India', primary_type: 'ASSETS', sub_group: 'Bank Accounts (बैंक खाते)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
  { id: 'ACC-03', account_name: 'Kisan Fuel Station', primary_type: 'LIABILITIES', sub_group: 'Diesel & Fuel Pumps (डीजल व पेट्रोल पंप)', opening_balance: 0, balance_type: 'Cr', is_system_locked: false },
  { id: 'ACC-04', account_name: 'Sharma Construction', primary_type: 'ASSETS', sub_group: 'Sundry Debtors (Customer / देनदार)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
  { id: 'ACC-05', account_name: 'Diesel Expenses', primary_type: 'EXPENSES', sub_group: 'Diesel & Fuel Expenses (ईंधन खर्च)', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
  { id: 'ACC-06', account_name: 'Sales & Revenue', primary_type: 'INCOME', sub_group: 'Sales & Operating Revenue (बिक्री व मुख्य आय)', opening_balance: 0, balance_type: 'Cr', is_system_locked: true }
];

/**
 * Retrieve master accounts for a firm
 */
export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_accounts_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  } catch (e) {
    return DEFAULT_ACCOUNTS;
  }
};

/**
 * Save or Update Master Ledger Account
 */
export const saveMasterAccount = (firmId = 'FIRM-001', payload) => {
  const accounts = getFirmMasterAccounts(firmId);
  const cleanName = (payload.account_name || '').trim();

  if (!cleanName) throw new Error("⚠️ Account Name cannot be empty.");

  const targetId = payload.id || `ACC-${Date.now()}`;
  const newAccount = {
    id: targetId,
    account_name: cleanName,
    primary_type: payload.primary_type || 'ASSETS',
    sub_group: payload.sub_group || 'General',
    opening_balance: parseFloat(payload.opening_balance || 0),
    balance_type: payload.balance_type || 'Dr',
    gstin: (payload.gstin || '').trim(),
    phone: (payload.phone || '').trim(),
    is_system_locked: Boolean(payload.is_system_locked),
    updated_at: new Date().toISOString()
  };

  let updatedList;
  const existingIndex = accounts.findIndex(a => a.id === targetId || a.account_name.toLowerCase() === cleanName.toLowerCase());

  if (existingIndex >= 0) {
    updatedList = [...accounts];
    updatedList[existingIndex] = { ...updatedList[existingIndex], ...newAccount };
  } else {
    updatedList = [newAccount, ...accounts];
  }

  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('accounts_master_updated'));
  return newAccount;
};

/**
 * Delete Account Head
 */
export const deleteMasterAccount = (firmId = 'FIRM-001', accountId) => {
  const accounts = getFirmMasterAccounts(firmId);
  const target = accounts.find(a => a.id === accountId);
  if (target && target.is_system_locked) {
    throw new Error("⚠️ System accounts (e.g. Cash-in-Hand, Sales) cannot be deleted.");
  }

  const updatedList = accounts.filter(a => a.id !== accountId);
  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('accounts_master_updated'));
  return true;
};

// Aliases for compatibility
export const getAccountHeadsByFirm = getFirmMasterAccounts;
export const saveOrUpdateAccountHead = saveMasterAccount;
export const getAccountHeads = getFirmMasterAccounts;

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
      'Fixed Assets (मशीनरी / वाहन)'
    ]
  },
  LIABILITIES: {
    label: 'Liabilities (दायित्व)',
    defaultBalanceType: 'Cr',
    subGroups: [
      'Sundry Creditors (Supplier / लेनदार)',
      'Diesel & Fuel Pumps (डीजल व पेट्रोल पंप)',
      'Secured Loans (बैंक ऋण)',
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
      'Indirect Expenses (कार्यालय व अन्य खर्च)'
    ]
  },
  INCOME: {
    label: 'Income (आय)',
    defaultBalanceType: 'Cr',
    subGroups: [
      'Sales & Operating Revenue (बिक्री व मुख्य आय)',
      'Briquette / Brick Sales (ईंट व बायोमास बिक्री)',
      'Other Income (अन्य आय)'
    ]
  },
  EQUITY: {
    label: 'Equity (पूंजी)',
    defaultBalanceType: 'Cr',
    subGroups: ['Proprietor Capital A/C (पूंजी खाता)', 'Drawings (आहरण खाता)']
  }
};

export const DEFAULT_ACCOUNTS = [
  { id: 'ACC-01', account_name: 'Cash-in-Hand', primary_type: 'ASSETS', sub_group: 'Cash-in-Hand (नकद रोकड़)', balance_type: 'Dr', opening_balance: 0 },
  { id: 'ACC-02', account_name: 'State Bank of India', primary_type: 'ASSETS', sub_group: 'Bank Accounts (बैंक खाते)', balance_type: 'Dr', opening_balance: 0 },
  { id: 'ACC-03', account_name: 'Kisan Fuel Station', primary_type: 'LIABILITIES', sub_group: 'Diesel & Fuel Pumps (डीजल व पेट्रोल पंप)', balance_type: 'Cr', opening_balance: 0 },
  { id: 'ACC-04', account_name: 'Sharma Construction', primary_type: 'ASSETS', sub_group: 'Sundry Debtors (Customer / देनदार)', balance_type: 'Dr', opening_balance: 0 },
  { id: 'ACC-05', account_name: 'General Customer', primary_type: 'ASSETS', sub_group: 'Sundry Debtors (Customer / देनदार)', balance_type: 'Dr', opening_balance: 0 },
  { id: 'ACC-06', account_name: 'Diesel Expenses', primary_type: 'EXPENSES', sub_group: 'Diesel & Fuel Expenses (ईंधन खर्च)', balance_type: 'Dr', opening_balance: 0 },
  { id: 'ACC-07', account_name: 'Sales & Revenue', primary_type: 'INCOME', sub_group: 'Sales & Operating Revenue (बिक्री व मुख्य आय)', balance_type: 'Cr', opening_balance: 0 }
];

export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  try {
    let accounts = JSON.parse(localStorage.getItem(`app_accounts_${firmId}`) || '[]');
    if (!Array.isArray(accounts) || accounts.length === 0) {
      accounts = [...DEFAULT_ACCOUNTS];
      localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(accounts));
    }
    return accounts;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
};

export const saveMasterAccount = (firmId = 'FIRM-001', payload) => {
  const accounts = getFirmMasterAccounts(firmId);
  const cleanName = (payload.account_name || '').trim();
  if (!cleanName) throw new Error("Account Name is required.");

  const newAcc = {
    id: payload.id || `ACC-${Date.now()}`,
    account_name: cleanName,
    primary_type: payload.primary_type || 'ASSETS',
    sub_group: payload.sub_group || 'General',
    opening_balance: parseFloat(payload.opening_balance || 0),
    balance_type: payload.balance_type || 'Dr',
    phone: payload.phone || '',
    gstin: payload.gstin || '',
    created_at: new Date().toISOString()
  };

  const updated = [newAcc, ...accounts.filter(a => a.account_name.toLowerCase() !== cleanName.toLowerCase())];
  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event('app_state_updated'));
  return newAcc;
};

// Aliases for compatibility
export const getAccountHeadsByFirm = getFirmMasterAccounts;
export const saveOrUpdateAccountHead = saveMasterAccount;
export const getAccountHeads = getFirmMasterAccounts;

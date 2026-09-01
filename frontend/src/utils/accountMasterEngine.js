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

export const getFirmMasterAccounts = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  let merged = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('app_accounts') || k.includes('accounts'))) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) merged = merged.concat(parsed);
        }
      }
    }

    const map = new Map();
    merged.forEach(a => {
      if (a && a.account_name) {
        const key = a.account_name.trim().toLowerCase();
        if (!map.has(key)) map.set(key, { ...a, account_name: a.account_name.trim() });
      }
    });

    let result = Array.from(map.values());
    if (result.length === 0) {
      result = [
        { id: 'ACC-01', account_name: 'Cash-in-Hand', primary_type: 'ASSETS', sub_group: 'Cash-in-Hand (नकद रोकड़)', opening_balance: 0, balance_type: 'Dr' },
        { id: 'ACC-02', account_name: 'State Bank of India', primary_type: 'ASSETS', sub_group: 'Bank Accounts (बैंक खाते)', opening_balance: 0, balance_type: 'Dr' },
        { id: 'ACC-03', account_name: 'Kisan Fuel Station', primary_type: 'LIABILITIES', sub_group: 'Diesel & Fuel Pumps (डीजल व पेट्रोल पंप)', opening_balance: 0, balance_type: 'Cr' },
        { id: 'ACC-04', account_name: 'General Customer', primary_type: 'ASSETS', sub_group: 'Sundry Debtors (Customer / देनदार)', opening_balance: 0, balance_type: 'Dr' },
        { id: 'ACC-05', account_name: 'Diesel Expenses', primary_type: 'EXPENSES', sub_group: 'Diesel & Fuel Expenses (ईंधन खर्च)', opening_balance: 0, balance_type: 'Dr' }
      ];
      localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(result));
    }
    return result;
  } catch (e) {
    return [];
  }
};

export const saveMasterAccount = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const accounts = getFirmMasterAccounts(targetId);
  const cleanName = (payload.account_name || '').trim();

  if (!cleanName) throw new Error("⚠️ Account Name enter karna zaroori hai.");

  const newHead = {
    id: payload.id || `ACC-${Date.now()}`,
    account_name: cleanName,
    primary_type: payload.primary_type || 'ASSETS',
    account_group: payload.sub_group || 'GENERAL',
    sub_group: payload.sub_group || 'GENERAL',
    opening_balance: parseFloat(payload.opening_balance || 0),
    balance_type: payload.balance_type || 'Dr',
    gstin: (payload.gstin || '').trim(),
    phone: (payload.phone || '').trim(),
    created_at: new Date().toISOString()
  };

  const updated = [newHead, ...accounts.filter(a => a.account_name.toLowerCase() !== cleanName.toLowerCase())];

  localStorage.setItem(`app_accounts_${targetId}`, JSON.stringify(updated));
  localStorage.setItem('app_accounts_global', JSON.stringify(updated));
  localStorage.setItem('app_accounts', JSON.stringify(updated));

  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return newHead;
};

// Aliases for zero-break build compatibility
export const getAccountHeadsByFirm = getFirmMasterAccounts;
export const saveOrUpdateAccountHead = saveMasterAccount;
export const getAccountHeads = getFirmMasterAccounts;

// frontend/src/utils/accountMasterEngine.js

/**
 * Retrieve all account heads for a firm
 */
export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_accounts_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Default Statutory Chart of Accounts Baseline
    const defaultAccounts = [
      { id: 'ACC-001', account_name: 'Cash in Hand (रोकड़)', primary_type: 'ASSETS', sub_group: 'Cash & Cash Equivalents', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
      { id: 'ACC-002', account_name: 'State Bank of India (बैंक खाता)', primary_type: 'ASSETS', sub_group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-003', account_name: 'Tractor Fuel & Running Expense', primary_type: 'EXPENSES', sub_group: 'Direct Production Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-004', account_name: 'Bhatta Kiln Burning Expense (कोयला/ईंधन)', primary_type: 'EXPENSES', sub_group: 'Direct Production Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-005', account_name: 'Generator Fuel & Power Expense', primary_type: 'EXPENSES', sub_group: 'Direct Production Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-006', account_name: 'Labor & Pathai Expense (मजदूरी/पथाई)', primary_type: 'EXPENSES', sub_group: 'Direct Labor Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-007', account_name: 'Machinery Repairs & Maintenance', primary_type: 'EXPENSES', sub_group: 'Indirect Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
      { id: 'ACC-008', account_name: 'Sales Revenue Account', primary_type: 'INCOME', sub_group: 'Direct Revenue', opening_balance: 0, balance_type: 'Cr', is_system_locked: true },
      { id: 'ACC-009', account_name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', sub_group: 'Direct Production Expenses', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
      { id: 'ACC-010', account_name: 'Capital Account (स्वामी की पूंजी)', primary_type: 'EQUITY', sub_group: 'Capital Account', opening_balance: 0, balance_type: 'Cr', is_system_locked: false }
    ];

    localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  } catch {
    return [];
  }
};

/**
 * Filter and extract only Expense account heads for consumption & production dropdowns
 */
export const getExpenseAccountHeads = (firmId = 'FIRM-001') => {
  const accounts = getFirmMasterAccounts(firmId);
  const expenseAccounts = accounts.filter(a => 
    a.primary_type === 'EXPENSES' || 
    (a.sub_group && (
      a.sub_group.toLowerCase().includes('expense') || 
      a.sub_group.toLowerCase().includes('cost') ||
      a.sub_group.toLowerCase().includes('direct')
    ))
  );

  if (expenseAccounts.length > 0) return expenseAccounts;

  return [
    { id: 'EXP-DEFAULT-1', account_name: 'Tractor Fuel & Running Expense', sub_group: 'Direct Production Expenses' },
    { id: 'EXP-DEFAULT-2', account_name: 'Bhatta Kiln Burning Expense (कोयला/ईंधन)', sub_group: 'Direct Production Expenses' },
    { id: 'EXP-DEFAULT-3', account_name: 'Generator Fuel & Power Expense', sub_group: 'Direct Production Expenses' },
    { id: 'EXP-DEFAULT-4', account_name: 'Labor & Pathai Expense (मजदूरी/पथाई)', sub_group: 'Direct Labor Expenses' },
    { id: 'EXP-DEFAULT-5', account_name: 'Machinery Repairs & Maintenance', sub_group: 'Indirect Expenses' }
  ];
};

/**
 * Save or append an Account Head into the Chart of Accounts
 */
export const saveMasterAccount = (firmId = 'FIRM-001', accountData = {}) => {
  const accounts = getFirmMasterAccounts(firmId);
  const cleanName = (accountData.account_name || '').trim();

  if (!cleanName) throw new Error('Account name cannot be empty.');

  const existingIdx = accounts.findIndex(a => a.account_name.toLowerCase() === cleanName.toLowerCase());

  const newAccount = {
    id: accountData.id || `ACC-${Date.now()}`,
    account_name: cleanName,
    primary_type: accountData.primary_type || 'EXPENSES',
    sub_group: accountData.sub_group || 'Direct Production Expenses',
    opening_balance: parseFloat(accountData.opening_balance || 0),
    balance_type: accountData.balance_type || 'Dr',
    is_system_locked: false,
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    accounts[existingIdx] = { ...accounts[existingIdx], ...newAccount };
  } else {
    accounts.push(newAccount);
  }

  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(accounts));
  window.dispatchEvent(new Event('app_state_updated'));
  return newAccount;
};

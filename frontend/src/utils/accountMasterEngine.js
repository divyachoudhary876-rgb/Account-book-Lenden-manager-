// frontend/src/utils/accountMasterEngine.js

export const getAccountHeadsByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_account_heads_${targetId}`;
  let accounts = [];

  try {
    accounts = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    accounts = [];
  }

  // Pre-populate standard accounts if namespace is completely empty
  if (accounts.length === 0) {
    accounts = [
      { id: `ACC-DEF-1-${targetId}`, name: 'Cash-in-Hand A/C', primary_type: 'ASSETS', group_type: 'CASH', opening_balance: 0, balance_type: 'Dr' },
      { id: `ACC-DEF-2-${targetId}`, name: 'Main Bank A/C', primary_type: 'ASSETS', group_type: 'BANK', opening_balance: 0, balance_type: 'Dr' },
      { id: `ACC-DEF-3-${targetId}`, name: 'Propritor Capital A/C', primary_type: 'LIABILITIES', group_type: 'CAPITAL_ACCOUNT', opening_balance: 0, balance_type: 'Cr' },
      { id: `ACC-DEF-4-${targetId}`, name: 'General Customer (Sundry Debtor)', primary_type: 'ASSETS', group_type: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },
      { id: `ACC-DEF-5-${targetId}`, name: 'General Supplier (Sundry Creditor)', primary_type: 'LIABILITIES', group_type: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' }
    ];
    localStorage.setItem(key, JSON.stringify(accounts));
  }

  return accounts;
};

// Filtered dropdown helpers
export const getCustomerAccounts = (firmId) => {
  const list = getAccountHeadsByFirm(firmId);
  return list.filter(a => ['SUNDRY_DEBTORS', 'CASH', 'BANK'].includes(a.group_type));
};

export const getSupplierAccounts = (firmId) => {
  const list = getAccountHeadsByFirm(firmId);
  return list.filter(a => ['SUNDRY_CREDITORS', 'CASH', 'BANK'].includes(a.group_type));
};

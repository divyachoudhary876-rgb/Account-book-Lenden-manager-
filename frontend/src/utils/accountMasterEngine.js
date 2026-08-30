// frontend/src/utils/accountMasterEngine.js

export const getAccountHeadsByFirm = (firmId) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_account_heads_${targetId}`;
  let accounts = [];

  try {
    accounts = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    accounts = [];
  }

  // Fallback defaults with exact Accounting Primary Types
  if (!Array.isArray(accounts) || accounts.length === 0) {
    accounts = [
      { id: `ACC-DEF-1-${targetId}`, name: 'Cash-in-Hand A/C', primary_type: 'ASSETS', group_type: 'CASH', opening_balance: 0, balance_type: 'Dr' },
      { id: `ACC-DEF-2-${targetId}`, name: 'Main Bank A/C', primary_type: 'ASSETS', group_type: 'BANK', opening_balance: 0, balance_type: 'Dr' },
      { id: `ACC-DEF-3-${targetId}`, name: 'Propritor Capital A/C', primary_type: 'LIABILITIES', group_type: 'CAPITAL_ACCOUNT', opening_balance: 0, balance_type: 'Cr' },
      { id: `ACC-DEF-4-${targetId}`, name: 'General Customer', primary_type: 'ASSETS', group_type: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr' },
      { id: `ACC-DEF-5-${targetId}`, name: 'General Supplier', primary_type: 'LIABILITIES', group_type: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr' },
      { id: `ACC-DEF-6-${targetId}`, name: 'Diesel Expenses', primary_type: 'EXPENSES', group_type: 'INDIRECT_EXPENSES', opening_balance: 0, balance_type: 'Dr' }
    ];
    try {
      localStorage.setItem(key, JSON.stringify(accounts));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }

  return accounts;
};

export const saveOrUpdateAccountHead = (firmId, accountPayload) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_account_heads_${targetId}`;
  const existingList = getAccountHeadsByFirm(targetId);

  const isEdit = Boolean(accountPayload.id);
  const accId = isEdit ? accountPayload.id : `ACC-${Date.now()}`;

  // Smart Auto Primary Type Categorization based on name/group
  let primaryType = accountPayload.primary_type || 'ASSETS';
  const lowerName = (accountPayload.name || '').toLowerCase();
  
  if (lowerName.includes('expense') || lowerName.includes('diesel') || lowerName.includes('salary') || lowerName.includes('rent')) {
    primaryType = 'EXPENSES';
  } else if (lowerName.includes('sales') || lowerName.includes('income') || lowerName.includes('revenue')) {
    primaryType = 'INCOME';
  } else if (lowerName.includes('capital') || lowerName.includes('loan') || lowerName.includes('payable')) {
    primaryType = 'LIABILITIES';
  }

  const updatedAccount = {
    ...accountPayload,
    id: accId,
    primary_type: primaryType,
    opening_balance: parseFloat(accountPayload.opening_balance || 0),
    updated_at: new Date().toISOString()
  };

  let newList = [];
  if (isEdit) {
    newList = existingList.map(a => a.id === accId ? updatedAccount : a);
  } else {
    newList = [updatedAccount, ...existingList];
  }

  localStorage.setItem(key, JSON.stringify(newList));
  window.dispatchEvent(new Event('storage'));
  return updatedAccount;
};

export const getCustomerAccounts = (firmId) => getAccountHeadsByFirm(firmId);
export const getSupplierAccounts = (firmId) => getAccountHeadsByFirm(firmId);

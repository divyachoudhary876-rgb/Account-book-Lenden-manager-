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

  // Pre-populate default Chart of Accounts if empty
  if (!accounts || accounts.length === 0) {
    accounts = [
      { id: `ACC-DEF-1-${targetId}`, name: 'Cash-in-Hand A/C', primary_type: 'ASSETS', group_type: 'CASH', opening_balance: 0, balance_type: 'Dr', phone: '', gstin: '' },
      { id: `ACC-DEF-2-${targetId}`, name: 'Main Bank A/C', primary_type: 'ASSETS', group_type: 'BANK', opening_balance: 0, balance_type: 'Dr', phone: '', gstin: '' },
      { id: `ACC-DEF-3-${targetId}`, name: 'Propritor Capital A/C', primary_type: 'LIABILITIES', group_type: 'CAPITAL_ACCOUNT', opening_balance: 0, balance_type: 'Cr', phone: '', gstin: '' },
      { id: `ACC-DEF-4-${targetId}`, name: 'General Customer (Sundry Debtor)', primary_type: 'ASSETS', group_type: 'SUNDRY_DEBTORS', opening_balance: 0, balance_type: 'Dr', phone: '', gstin: '' },
      { id: `ACC-DEF-5-${targetId}`, name: 'General Supplier (Sundry Creditor)', primary_type: 'LIABILITIES', group_type: 'SUNDRY_CREDITORS', opening_balance: 0, balance_type: 'Cr', phone: '', gstin: '' }
    ];
    localStorage.setItem(key, JSON.stringify(accounts));
  }

  return accounts;
};

export const saveOrUpdateAccountHead = (firmId, accountPayload) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_account_heads_${targetId}`;
  const existingList = getAccountHeadsByFirm(targetId);

  const isEdit = Boolean(accountPayload.id);
  const accId = isEdit ? accountPayload.id : `ACC-${Date.now()}`;

  const updatedAccount = {
    ...accountPayload,
    id: accId,
    opening_balance: parseFloat(accountPayload.opening_balance || 0),
    updated_at: new Date().toISOString()
  };

  let newList = [];
  if (isEdit) {
    newList = existingList.map(a => a.id === accId ? updatedAccount : a);
  } else {
    const exists = existingList.some(a => a.name.trim().toLowerCase() === accountPayload.name.trim().toLowerCase());
    if (exists) {
      throw new Error(`An account named "${accountPayload.name}" already exists.`);
    }
    newList = [...existingList, updatedAccount];
  }

  localStorage.setItem(key, JSON.stringify(newList));
  window.dispatchEvent(new Event('storage'));
  return updatedAccount;
};

export const getCustomerAccounts = (firmId) => {
  const list = getAccountHeadsByFirm(firmId);
  return list.filter(a => ['SUNDRY_DEBTORS', 'CASH', 'BANK', 'ASSETS'].includes(a.group_type) || a.primary_type === 'ASSETS');
};

export const getSupplierAccounts = (firmId) => {
  const list = getAccountHeadsByFirm(firmId);
  return list.filter(a => ['SUNDRY_CREDITORS', 'CASH', 'BANK', 'LIABILITIES'].includes(a.group_type) || a.primary_type === 'LIABILITIES');
};

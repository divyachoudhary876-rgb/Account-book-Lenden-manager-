// frontend/src/utils/accountMasterEngine.js

export const getAccountHeadsByFirm = (firmId) => {
  const allAccounts = JSON.parse(localStorage.getItem(`app_account_heads_${firmId}`) || 'null');
  
  // If namespace is empty, fallback to active accounts or initialize standard default ledger heads
  if (!allAccounts || allAccounts.length === 0) {
    const defaults = [
      { id: 'ACC-DEF-1', name: 'Cash A/C', primary_type: 'ASSETS', group_type: 'CASH', opening_balance: 0, balance_type: 'Dr' },
      { id: 'ACC-DEF-2', name: 'Bank A/C (SBI/HDFC)', primary_type: 'ASSETS', group_type: 'BANK', opening_balance: 0, balance_type: 'Dr' },
      { id: 'ACC-DEF-3', name: 'General Sales A/C', primary_type: 'INCOME', group_type: 'SALES_ACCOUNT', opening_balance: 0, balance_type: 'Cr' },
      { id: 'ACC-DEF-4', name: 'General Purchase A/C', primary_type: 'EXPENSES', group_type: 'PURCHASE_ACCOUNT', opening_balance: 0, balance_type: 'Dr' }
    ];
    localStorage.setItem(`app_account_heads_${firmId}`, JSON.stringify(defaults));
    return defaults;
  }

  return allAccounts;
};

export const saveOrUpdateAccountHead = (firmId, accountPayload) => {
  const existingList = getAccountHeadsByFirm(firmId);
  const isEdit = Boolean(accountPayload.id);

  const accId = isEdit ? accountPayload.id : `ACC-${Date.now()}`;
  const updatedAccount = {
    ...accountPayload,
    id: accId,
    updated_at: new Date().toISOString()
  };

  let newList = [];
  if (isEdit) {
    newList = existingList.map(a => a.id === accId ? updatedAccount : a);
  } else {
    // Check for duplicate account name
    const exists = existingList.some(a => a.name.toLowerCase() === accountPayload.name.toLowerCase());
    if (exists) {
      throw new Error(`An account head with the name "${accountPayload.name}" already exists.`);
    }
    newList = [...existingList, updatedAccount];
  }

  localStorage.setItem(`app_account_heads_${firmId}`, JSON.stringify(newList));
  window.dispatchEvent(new Event('storage'));
  return updatedAccount;
};

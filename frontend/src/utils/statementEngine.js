// frontend/src/utils/statementEngine.js

export const getAccountHeads = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_accounts_${targetId}`;
  let accounts = [];
  try {
    const raw = localStorage.getItem(key);
    accounts = raw ? JSON.parse(raw) : [];
  } catch (e) { accounts = []; }

  // Default Essential Accounts Seed if Completely Empty
  if (accounts.length === 0) {
    accounts = [
      { id: 'ACC-CASH', account_name: 'Cash-in-Hand A/C', account_group: 'CASH' },
      { id: 'ACC-BANK', account_name: 'Main Bank Account', account_group: 'BANK' },
      { id: 'ACC-SALES', account_name: 'Sales Account', account_group: 'INCOME' },
      { id: 'ACC-PURCHASE', account_name: 'Purchase Account', account_group: 'EXPENSE' }
    ];
    localStorage.setItem(key, JSON.stringify(accounts));
  }
  return accounts;
};

export const createQuickAccountHead = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  if (!accountData.account_name) throw new Error("⚠️ Account Name is required.");

  const key = `app_accounts_${targetId}`;
  const accounts = getAccountHeads(targetId);

  const exists = accounts.some(a => a.account_name.toLowerCase() === accountData.account_name.trim().toLowerCase());
  if (exists) throw new Error("⚠️ Account with this name already exists.");

  const newAcc = {
    id: `ACC-${Date.now()}`,
    account_name: accountData.account_name.trim(),
    account_group: accountData.account_group || 'SUNDRY_DEBTOR'
  };

  accounts.push(newAcc);
  localStorage.setItem(key, JSON.stringify(accounts));
  window.dispatchEvent(new Event('storage'));
  return newAcc;
};

export const getAccountLedgerStatement = (firmId, accountName, fromDate, toDate) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }

  return vouchers.filter(v => {
    const matchAccount = (v.dr_account === accountName || v.cr_account === accountName);
    const vDate = v.date || new Date().toISOString().split('T')[0];
    const matchDate = (!fromDate || vDate >= fromDate) && (!toDate || vDate <= toDate);
    return matchAccount && matchDate;
  });
};

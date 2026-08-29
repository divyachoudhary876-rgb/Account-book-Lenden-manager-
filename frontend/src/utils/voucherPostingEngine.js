// frontend/src/utils/voucherPostingEngine.js

export const executeVoucherPosting = (voucherPayload) => {
  const { voucherType, drAccountId, crAccountId, amount, narration, date } = voucherPayload;

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid Amount: Amount must be greater than zero.");
  }

  if (drAccountId === crAccountId) {
    throw new Error("Double-Entry Violation: Debit and Credit accounts cannot be identical.");
  }

  // 1. Fetch Current State
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');

  const drIndex = accounts.findIndex(a => a.id === drAccountId);
  const crIndex = accounts.findIndex(a => a.id === crAccountId);

  if (drIndex === -1 || crIndex === -1) {
    throw new Error("Account Head Not Found: Please select valid Debit and Credit account heads.");
  }

  // 2. Double-Entry Accounting Rules Algorithm
  const drAcc = { ...accounts[drIndex] };
  const crAcc = { ...accounts[crIndex] };

  const drBal = parseFloat(drAcc.current_balance || drAcc.opening_balance || 0);
  const crBal = parseFloat(crAcc.current_balance || crAcc.opening_balance || 0);

  if (['ASSET', 'EXPENSE'].includes(drAcc.primary_type)) {
    drAcc.current_balance = drBal + numericAmount;
  } else {
    drAcc.current_balance = drBal - numericAmount;
  }

  if (['LIABILITY', 'EQUITY', 'INCOME'].includes(crAcc.primary_type)) {
    crAcc.current_balance = crBal + numericAmount;
  } else {
    crAcc.current_balance = crBal - numericAmount;
  }

  // 3. Create Audit Ledger Entries
  const voucherId = `VOUCH-${Date.now()}`;
  const newVoucher = {
    id: voucherId,
    voucher_type: voucherType,
    date,
    dr_account_id: drAccountId,
    dr_account_name: drAcc.name,
    cr_account_id: crAccountId,
    cr_account_name: crAcc.name,
    amount: numericAmount,
    narration,
    created_at: new Date().toISOString()
  };

  const drLine = {
    id: `JL-${Date.now()}-DR`,
    voucher_id: voucherId,
    account_id: drAccountId,
    account_name: drAcc.name,
    date,
    debit: numericAmount,
    credit: 0,
    narration
  };

  const crLine = {
    id: `JL-${Date.now()}-CR`,
    voucher_id: voucherId,
    account_id: crAccountId,
    account_name: crAcc.name,
    date,
    debit: 0,
    credit: numericAmount,
    narration
  };

  // 4. Update Arrays
  accounts[drIndex] = drAcc;
  accounts[crIndex] = crAcc;

  // 5. Atomic Storage Commit
  localStorage.setItem('app_account_heads', JSON.stringify(accounts));
  localStorage.setItem('app_vouchers', JSON.stringify([newVoucher, ...vouchers]));
  localStorage.setItem('app_journal_entries', JSON.stringify([drLine, crLine, ...journalEntries]));

  // 6. Global Event Dispatcher (Live Updates Across App)
  window.dispatchEvent(new Event('storage'));

  return newVoucher;
};

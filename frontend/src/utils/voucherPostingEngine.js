// frontend/src/utils/voucherPostingEngine.js

export const processVoucherPosting = (voucherData) => {
  const { drAccountId, crAccountId, amount, voucherType, narration, date } = voucherData;

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error("Invalid Posting Amount: Amount must be greater than zero.");
  }

  // Fetch Existing State
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');
  const ledgerEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');

  const drAccountIndex = accounts.findIndex(a => a.id === drAccountId);
  const crAccountIndex = accounts.findIndex(a => a.id === crAccountId);

  if (drAccountIndex === -1 || crAccountIndex === -1) {
    throw new Error("Account Head Missing: Selected account head was not found.");
  }

  // Update Debit Account Balance
  const drAcc = accounts[drAccountIndex];
  const drCurrentBal = parseFloat(drAcc.current_balance || drAcc.opening_balance || 0);
  if (['ASSET', 'EXPENSE'].includes(drAcc.primary_type)) {
    drAcc.current_balance = drCurrentBal + numericAmount;
  } else {
    drAcc.current_balance = drCurrentBal - numericAmount;
  }

  // Update Credit Account Balance
  const crAcc = accounts[crAccountIndex];
  const crCurrentBal = parseFloat(crAcc.current_balance || crAcc.opening_balance || 0);
  if (['LIABILITY', 'EQUITY', 'INCOME'].includes(crAcc.primary_type)) {
    crAcc.current_balance = crCurrentBal + numericAmount;
  } else {
    crAcc.current_balance = crCurrentBal - numericAmount;
  }

  // Create Audit Ledger Lines
  const voucherId = `VOUCH-${Date.now()}`;
  const newJournalLines = [
    { id: `JL-${Date.now()}-1`, voucher_id: voucherId, account_id: drAccountId, account_name: drAcc.name, debit: numericAmount, credit: 0, date, narration },
    { id: `JL-${Date.now()}-2`, voucher_id: voucherId, account_id: crAccountId, account_name: crAcc.name, debit: 0, credit: numericAmount, date, narration }
  ];

  const newVoucherRecord = {
    id: voucherId,
    voucher_type: voucherType,
    date,
    dr_account: drAcc.name,
    cr_account: crAcc.name,
    amount: numericAmount,
    narration,
    created_at: new Date().toISOString()
  };

  // Persist State
  accounts[drAccountIndex] = drAcc;
  accounts[crAccountIndex] = crAcc;

  localStorage.setItem('app_account_heads', JSON.stringify(accounts));
  localStorage.setItem('app_vouchers', JSON.stringify([newVoucherRecord, ...vouchers]));
  localStorage.setItem('app_journal_entries', JSON.stringify([...newJournalLines, ...ledgerEntries]));

  return newVoucherRecord;
};

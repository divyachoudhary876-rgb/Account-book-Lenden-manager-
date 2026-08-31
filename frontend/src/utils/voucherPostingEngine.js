// frontend/src/utils/voucherPostingEngine.js

export const processVoucherEntrySubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  if (!payload.dr_account || !payload.cr_account) {
    throw new Error("⚠️ Both Debit and Credit accounts are required.");
  }
  if (!payload.amount || parseFloat(payload.amount) <= 0) {
    throw new Error("⚠️ Please enter a valid positive amount.");
  }
  if (payload.dr_account === payload.cr_account) {
    throw new Error("⚠️ Debit and Credit accounts cannot be the same.");
  }

  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) vouchers = JSON.parse(raw);
  } catch (e) { vouchers = []; }

  const newVoucher = {
    id: `VOUCH-${Date.now()}`,
    voucher_date: payload.voucher_date || new Date().toISOString().split('T')[0],
    date: payload.voucher_date || new Date().toISOString().split('T')[0], // Backwards compatibility key
    voucher_type: payload.voucher_type || 'JOURNAL',
    dr_account: payload.dr_account,
    cr_account: payload.cr_account,
    amount: parseFloat(payload.amount),
    narration: payload.narration || '',
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(key, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));

  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return newVoucher;
};

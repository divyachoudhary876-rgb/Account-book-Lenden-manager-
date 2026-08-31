// frontend/src/utils/voucherPostingEngine.js

export const processVoucherEntrySubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';

  if (!payload.dr_account) throw new Error("⚠️ Select Debit (Dr) Account.");
  if (!payload.cr_account) throw new Error("⚠️ Select Credit (Cr) Account.");
  if (payload.dr_account === payload.cr_account) throw new Error("⚠️ Debit and Credit accounts cannot be the same.");

  const amount = parseFloat(payload.amount || 0);
  if (amount <= 0) throw new Error("⚠️ Voucher Amount must be greater than 0.");

  const voucherId = payload.voucher_number || `VOUCHER-${Date.now()}`;
  const currentDate = payload.date || new Date().toISOString().split('T')[0];

  const voucherData = {
    id: voucherId,
    date: currentDate,
    voucher_type: payload.voucher_type || 'JOURNAL',
    dr_account: payload.dr_account,
    cr_account: payload.cr_account,
    amount,
    narration: payload.narration || '',
    created_at: new Date().toISOString()
  };

  // Atomic Write to Global Voucher Key (`app_vouchers_${firmId}`)
  const voucherKey = `app_vouchers_${targetId}`;
  const existingVouchers = JSON.parse(localStorage.getItem(voucherKey) || '[]');
  existingVouchers.unshift(voucherData);
  localStorage.setItem(voucherKey, JSON.stringify(existingVouchers));

  // Dispatch Global Storage Event for Cross-Module UI Sync
  window.dispatchEvent(new Event('storage'));
  return voucherData;
};

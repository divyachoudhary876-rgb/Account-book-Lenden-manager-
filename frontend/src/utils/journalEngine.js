// frontend/src/utils/journalEngine.js

export const getJournalVouchersByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }

  if (vouchers.length === 0) {
    vouchers = [
      {
        id: 'JV-1001',
        date: '2026-08-31',
        voucher_type: 'JOURNAL',
        dr_account: 'Cash-in-Hand A/C',
        cr_account: 'Rk',
        amount: 10000.00
      }
    ];
    localStorage.setItem(key, JSON.stringify(vouchers));
  }
  return vouchers;
};

export const deleteJournalVoucher = (firmId, voucherId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  const existingVouchers = getJournalVouchersByFirm(targetId);
  const updated = existingVouchers.filter(v => v.id !== voucherId);
  localStorage.setItem(key, JSON.stringify(updated));
  window.dispatchEvent(new Event('storage'));
  return updated;
};

export const updateJournalVoucher = (firmId, updatedVoucher) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  const existingVouchers = getJournalVouchersByFirm(targetId);
  const index = existingVouchers.findIndex(v => v.id === updatedVoucher.id);
  
  if (index !== -1) {
    existingVouchers[index] = { ...updatedVoucher, updated_at: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(existingVouchers));
    window.dispatchEvent(new Event('storage'));
  }
  return existingVouchers;
};

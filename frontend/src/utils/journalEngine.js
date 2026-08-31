// frontend/src/utils/journalEngine.js

export const getJournalVouchersByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(key);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }
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

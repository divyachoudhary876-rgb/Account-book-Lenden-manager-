// frontend/src/utils/financialYearLockEngine.js

export const getCurrentActiveFY = () => {
  return localStorage.getItem('active_financial_year') || '2026-2027';
};

export const setActiveFY = (fyLabel) => {
  localStorage.setItem('active_financial_year', fyLabel);
  window.dispatchEvent(new Event('storage'));
};

export const isTransactionDateLocked = (transactionDate) => {
  const isPeriodLocked = localStorage.getItem('is_fy_period_locked') === 'true';
  const lockUntilDate = localStorage.getItem('fy_lock_until_date') || '2026-03-31';

  if (!isPeriodLocked) return false;

  const txDate = new Date(transactionDate);
  const lockDate = new Date(lockUntilDate);

  // If transaction date is on or before lock date, modification is prohibited
  return txDate <= lockDate;
};

export const validateEntryModificationPermission = (entryDate) => {
  if (isTransactionDateLocked(entryDate)) {
    throw new Error(`🔒 Security Lock: Entries on or before ${localStorage.getItem('fy_lock_until_date')} are locked for CA Audit compliance and cannot be edited or deleted.`);
  }
  return true;
};

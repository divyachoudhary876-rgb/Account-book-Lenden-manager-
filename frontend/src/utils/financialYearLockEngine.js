// frontend/src/utils/financialYearLockEngine.js

import { performFinancialYearRollover } from './autoRolloverEngine.js';

export const getCurrentActiveFY = () => {
  return localStorage.getItem('active_financial_year') || '2026-2027';
};

/**
 * Sets active financial year and automatically ensures opening balances
 * are rolled over from the previous financial year.
 */
export const setActiveFY = (fyLabel, explicitFirmId = null) => {
  localStorage.setItem('active_financial_year', fyLabel);
  
  const firmId = explicitFirmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  // Automatically trigger balance rollover for the newly selected FY
  try {
    performFinancialYearRollover(firmId, fyLabel);
  } catch (err) {
    console.warn('Auto rollover execution skipped:', err);
  }

  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('fy_state_updated'));
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

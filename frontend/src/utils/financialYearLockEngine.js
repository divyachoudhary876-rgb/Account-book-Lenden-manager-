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

  try {
    performFinancialYearRollover(firmId, fyLabel);
  } catch (err) {
    console.warn('Auto rollover execution skipped:', err);
  }

  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('fy_state_updated'));
};

/**
 * Smart Backdated FY Entry Validator with User Notice
 * Agar user pichle FY mein entry karega, toh yeh true return karega (notice show karne ke liye)
 * aur automatic rollover update trigger kar dega.
 */
export const validateAndHandleBackdatedEntry = (transactionDate, firmId = 'FIRM-001') => {
  const activeFY = getCurrentActiveFY(); // e.g., '2026-2027'
  const match = activeFY.match(/\d{4}/);
  if (!match || !transactionDate) return { isBackdated: false };

  const currentStartYear = parseInt(match[0], 10);
  const fyStartDate = `${currentStartYear}-04-01`;

  // Check if transaction date belongs to a previous financial year
  if (transactionDate < fyStartDate) {
    // Trigger automatic rollover re-calculation so previous year change flows into current year
    try {
      performFinancialYearRollover(firmId, activeFY);
    } catch (e) {
      console.error("Backdated rollover sync error:", e);
    }

    return {
      isBackdated: true,
      message: `⚠️ Notice: Aap pichle Financial Year (${transactionDate}) mein backdated entry darj kar rahe hain. Accounting rules ke mutabiq yeh entry pichle saal mein judeđgi aur iska asar naye saal ke Opening Balances par automatic update ho jayega.`
    };
  }

  return { isBackdated: false };
};

export const isTransactionDateLocked = (transactionDate) => {
  const isPeriodLocked = localStorage.getItem('is_fy_period_locked') === 'true';
  const lockUntilDate = localStorage.getItem('fy_lock_until_date') || '2026-03-31';

  if (!isPeriodLocked) return false;

  const txDate = new Date(transactionDate);
  const lockDate = new Date(lockUntilDate);

  return txDate <= lockDate;
};

export const validateEntryModificationPermission = (entryDate) => {
  if (isTransactionDateLocked(entryDate)) {
    throw new Error(`🔒 Security Lock: Entries on or before ${localStorage.getItem('fy_lock_until_date')} are locked for CA Audit compliance and cannot be edited or deleted.`);
  }
  return true;
};

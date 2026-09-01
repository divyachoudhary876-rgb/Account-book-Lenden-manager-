// frontend/src/utils/financialYearEngine.js

export const DEFAULT_FY_LIST = [
  { id: 'FY-2026-27', label: 'FY 2026-27', startDate: '2026-04-01', endDate: '2027-03-31', isLocked: false },
  { id: 'FY-2025-26', label: 'FY 2025-26', startDate: '2025-04-01', endDate: '2026-03-31', isLocked: false }
];

/**
 * Retrieve registered financial years for the active firm
 */
export const getFirmFinancialYears = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_fy_registry_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Seed default financial years
    localStorage.setItem(`app_fy_registry_${firmId}`, JSON.stringify(DEFAULT_FY_LIST));
    return DEFAULT_FY_LIST;
  } catch {
    return DEFAULT_FY_LIST;
  }
};

/**
 * Register a new financial year with auto-computed dates
 */
export const createFinancialYear = (firmId, startYear) => {
  const sYear = parseInt(startYear, 10);
  if (isNaN(sYear) || sYear < 2000 || sYear > 2099) {
    throw new Error('Please enter a valid starting year (e.g. 2027).');
  }

  const eYear = sYear + 1;
  const shortEYear = eYear.toString().slice(-2);
  const fyLabel = `FY ${sYear}-${shortEYear}`;
  const fyId = `FY-${sYear}-${shortEYear}`;

  const currentList = getFirmFinancialYears(firmId);
  if (currentList.some(fy => fy.label === fyLabel)) {
    throw new Error(`Financial Year "${fyLabel}" already exists.`);
  }

  const newFY = {
    id: fyId,
    label: fyLabel,
    startDate: `${sYear}-04-01`,
    endDate: `${eYear}-03-31`,
    isLocked: false,
    createdAt: new Date().toISOString()
  };

  const updatedList = [newFY, ...currentList].sort((a, b) => b.startDate.localeCompare(a.startDate));
  localStorage.setItem(`app_fy_registry_${firmId}`, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('fy_state_updated'));

  return newFY;
};

/**
 * Check if a transaction date falls strictly inside the active FY range
 */
export const validateTransactionDateWithinFY = (dateStr, fyConfig) => {
  if (!fyConfig || !dateStr) return true;
  return dateStr >= fyConfig.startDate && dateStr <= fyConfig.endDate;
};

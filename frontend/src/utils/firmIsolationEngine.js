// frontend/src/utils/firmIsolationEngine.js

export const getActiveFirmId = (firm) => {
  if (!firm) return 'default_firm_id';
  return firm.firm_id || firm.id || String(firm.legal_name || firm.name || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const getFirmScopedStorageKey = (baseKey, firm) => {
  const firmId = getActiveFirmId(firm);
  return `${baseKey}_${firmId}`;
};

export const loadFirmData = (baseKey, firm, fallbackValue = []) => {
  try {
    const scopedKey = getFirmScopedStorageKey(baseKey, firm);
    const data = localStorage.getItem(scopedKey);
    if (data) {
      return JSON.parse(data);
    }
    // Return empty array by default for new/empty firms to prevent cross-firm leakage
    return fallbackValue;
  } catch (e) {
    console.error(`Error loading scoped data for ${baseKey}:`, e);
    return fallbackValue;
  }
};

export const saveFirmData = (baseKey, firm, dataValue) => {
  try {
    const scopedKey = getFirmScopedStorageKey(baseKey, firm);
    localStorage.setItem(scopedKey, JSON.stringify(dataValue));
  } catch (e) {
    console.error(`Error saving scoped data for ${baseKey}:`, e);
  }
};

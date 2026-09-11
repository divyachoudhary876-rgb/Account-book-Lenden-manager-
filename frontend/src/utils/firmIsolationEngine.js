// frontend/src/utils/firmIsolationEngine.js

export const getActiveFirmId = (firm) => {
  if (!firm) return 'default_firm_id';
  return firm.firm_id || firm.id || String(firm.legal_name || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const getFirmScopedStorageKey = (baseKey, firm) => {
  const firmId = getActiveFirmId(firm);
  return `${baseKey}_${firmId}`;
};

export const loadFirmData = (baseKey, firm, fallbackValue = []) => {
  try {
    const scopedKey = getFirmScopedStorageKey(baseKey, firm);
    const data = localStorage.getItem(scopedKey);
    if (data) return JSON.parse(data);
    return fallbackValue;
  } catch (e) {
    console.error(`Error loading data for ${baseKey}:`, e);
    return fallbackValue;
  }
};

export const saveFirmData = (baseKey, firm, dataValue) => {
  try {
    const scopedKey = getFirmScopedStorageKey(baseKey, firm);
    localStorage.setItem(scopedKey, JSON.stringify(dataValue));
  } catch (e) {
    console.error(`Error saving data for ${baseKey}:`, e);
  }
};

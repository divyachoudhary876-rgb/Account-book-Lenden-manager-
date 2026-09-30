// frontend/src/utils/firmIsolationEngine.js

export const getActiveFirmId = (firm) => {
  if (!firm) return 'default_firm_id';
  if (typeof firm === 'string') return firm.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const resolved = firm.firm_id || firm.id || firm.firmId || firm.legal_name || firm.trade_name || firm.name || firm.firm_name || 'default_firm';
  return String(resolved).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const getFirmScopedStorageKey = (baseKey, firm) => {
  const firmId = getActiveFirmId(firm);
  return `${baseKey}_${firmId}`;
};

export const loadFirmData = (baseKey, firm, fallbackValue = []) => {
  try {
    const scopedKey = getFirmScopedStorageKey(baseKey, firm);
    const data = localStorage.getItem(scopedKey);
    if (data !== null && data !== undefined) {
      return JSON.parse(data);
    }
    
    // Strict Isolation: Doosri firm ya global data mix na ho, isliye koi cross global fallback nahi.
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

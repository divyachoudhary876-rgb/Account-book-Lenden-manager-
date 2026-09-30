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
    
    // Smart Fallback: Agar scoped key khali hai, toh check karein ki kya global key me data pada hai
    const globalData = localStorage.getItem(baseKey);
    if (globalData !== null && globalData !== undefined) {
      const parsed = JSON.parse(globalData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

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

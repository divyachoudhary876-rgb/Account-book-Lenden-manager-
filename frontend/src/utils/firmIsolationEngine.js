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
    
    // Backup Migration Support: Agar backup restore hua hai aur data global key ya standard backup key me pada hai
    const globalData = localStorage.getItem(baseKey);
    if (globalData !== null && globalData !== undefined) {
      try {
        const parsed = JSON.parse(globalData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Auto-migrate to scoped storage so subsequent loads are fast and isolated
          localStorage.setItem(scopedKey, JSON.stringify(parsed));
          return parsed;
        }
      } catch (err) {
        // ignore parse error
      }
    }

    // Check generic backup payload keys if any exist in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('backup') || key.includes('restore')) && key.includes(baseKey)) {
        const backupVal = localStorage.getItem(key);
        if (backupVal) {
          try {
            const parsedBackup = JSON.parse(backupVal);
            if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
              localStorage.setItem(scopedKey, JSON.stringify(parsedBackup));
              return parsedBackup;
            }
          } catch (e) {}
        }
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
    // Also update global mirror for backup portability
    localStorage.setItem(baseKey, JSON.stringify(dataValue));
  } catch (e) {
    console.error(`Error saving scoped data for ${baseKey}:`, e);
  }
};


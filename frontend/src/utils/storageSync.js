// frontend/src/utils/storageSync.js

export const StorageService = {
  getItem: (key, fallback = []) => {
    try {
      const activeFirmId = localStorage.getItem('app_active_firm_id') || 'FIRM-001';
      
      // 1. Try fetching firm-scoped key first
      const scopedKey = `${key}_${activeFirmId}`;
      const scopedData = localStorage.getItem(scopedKey);
      if (scopedData !== null && scopedData !== undefined) {
        return JSON.parse(scopedData);
      }

      // 2. Try fetching direct global key as fallback
      const data = localStorage.getItem(key);
      return data !== null && data !== undefined ? JSON.parse(data) : fallback;
    } catch (e) {
      console.error(`Storage read error for ${key}:`, e);
      return fallback;
    }
  },

  setItem: (key, value) => {
    try {
      const activeFirmId = localStorage.getItem('app_active_firm_id') || 'FIRM-001';
      const serialized = JSON.stringify(value);

      // Write to both global key and firm-scoped key simultaneously (Dual-Key Redundancy)
      localStorage.setItem(key, serialized);
      if (!key.endsWith(`_${activeFirmId}`)) {
        localStorage.setItem(`${key}_${activeFirmId}`, serialized);
      }

      window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key, value } }));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error(`Storage write error for ${key}:`, e);
    }
  },

  getActiveFirmId: () => {
    return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  },

  // Firm-Scoped Inventory Items (Dual-Key Sync)
  getInventoryItems: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    const scopedVal = StorageService.getItem(`inventory_items_${fId}`, null);
    if (Array.isArray(scopedVal) && scopedVal.length > 0) return scopedVal;
    return StorageService.getItem('inventory_items', []);
  },

  saveInventoryItems: (items, firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    const serialized = JSON.stringify(items);
    localStorage.setItem(`inventory_items_${fId}`, serialized);
    localStorage.setItem('inventory_items', serialized);
    localStorage.setItem('app_inventory', serialized);

    window.dispatchEvent(new CustomEvent('app_storage_updated', { detail: { key: 'inventory_items', value: items } }));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  },

  // Firm-Scoped Material Consumptions
  getMaterialConsumptions: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    return StorageService.getItem(`material_consumptions_${fId}`, []);
  },

  saveMaterialConsumptions: (list, firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    StorageService.setItem(`material_consumptions_${fId}`, list);
  },

  // Firm-Scoped Ledger Accounts
  getLedgerAccounts: (firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    return StorageService.getItem(`app_accounts_${fId}`, []) || StorageService.getItem(`account_heads_${fId}`, []);
  },

  saveLedgerAccounts: (accounts, firmId) => {
    const fId = firmId || StorageService.getActiveFirmId();
    const serialized = JSON.stringify(accounts);
    localStorage.setItem(`app_accounts_${fId}`, serialized);
    localStorage.setItem(`account_heads_${fId}`, serialized);
    localStorage.setItem('app_account_heads', serialized);

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  }
};

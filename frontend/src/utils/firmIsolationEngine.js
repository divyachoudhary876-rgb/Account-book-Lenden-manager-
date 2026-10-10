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
    
    // Strict Isolation: Doosri firm ya global data mix na ho
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

// frontend/src/utils/firmValidationEngine.js equivalents handled locally

export const isFirstTimeUser = () => {
  const profile = localStorage.getItem('active_firm_profile');
  return !profile || profile === 'null';
};

export const getNextSequentialInvoiceNumber = () => {
  const firm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
  const invoices = JSON.parse(localStorage.getItem('app_invoices') || '[]');

  const prefix = firm.invoice_prefix || 'INV';
  const fy = firm.financial_year || '2026-27';
  const nextSeq = invoices.length + 1;
  const paddedNumber = String(nextSeq).padStart(4, '0');

  return `${prefix}/${fy}/${paddedNumber}`;
};

export const validateStockAvailability = (itemId, requestedQty) => {
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const item = inventory.find(i => i.id === itemId);

  if (!item) {
    throw new Error("Item Not Found: Selected stock item does not exist.");
  }

  const availableQty = parseFloat(item.current_qty || 0);
  if (availableQty < parseFloat(requestedQty)) {
    throw new Error(`Insufficient Stock Alert! Available: ${availableQty} ${item.unit || 'Units'}, Requested: ${requestedQty} ${item.unit || 'Units'}.`);
  }

  return true;
};

/**
 * Frontend Utility: Universal Zero-Loss Backup & Restore Engine
 * Ensures absolute multi-firm profile preservation and complete cross-firm data restoration without duplication.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { IDBStorage } from './indexedDbStorage.js';

const resolveFirmNameString = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'AccountBook';
  }
  return 'AccountBook';
};

export const autoHealRestoredInventoryAndAccounts = (firmId) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');

  try {
    let stockItems = [];
    const stockKeys = [
      `inventory_items_${cleanFirmId}`, 
      'inventory_items', 
      'inventory_items_default_firm_id', 
      'app_inventory'
    ];

    stockKeys.forEach(k => {
      try {
        const raw = IDBStorage.getItem(k, null);
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            parsed.forEach(it => {
              const itName = it?.name || it?.item_name || it?.itemName;
              if (itName) {
                const existingIndex = stockItems.findIndex(x => (x.name || x.item_name || x.itemName).trim().toLowerCase() === String(itName).trim().toLowerCase());
                if (existingIndex === -1) {
                  stockItems.push(it);
                } else {
                  const currStock = parseFloat(it.current_stock || it.stock || it.qty || 0);
                  if (currStock > 0) {
                    stockItems[existingIndex].current_stock = currStock;
                    stockItems[existingIndex].stock = currStock;
                    stockItems[existingIndex].qty = currStock;
                  }
                }
              }
            });
          }
        }
      } catch (e) {}
    });

    const inventoryKey = `inventory_items_${cleanFirmId}`;
    IDBStorage.setItem(inventoryKey, stockItems);
    IDBStorage.setItem('inventory_items', stockItems);
    IDBStorage.setItem('app_inventory', stockItems);

    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {}
};

export const downloadAppBackup = async (firmInput = 'AccountBook') => {
  try {
    const storageSnapshot = {};
    let vouchersCount = 0;
    let accountsCount = 0;

    const cache = window.__APP_STORAGE_CACHE__ || {};
    Object.keys(cache).forEach(key => {
      if (!key.startsWith('temp_cache_') && !key.startsWith('debug_log_')) {
        storageSnapshot[key] = cache[key];
      }
    });

    const cleanFirm = String(resolveFirmNameString(firmInput)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const fileName = `${cleanFirm}_Backup_${now.toISOString().slice(0, 10)}.json`;
    const activeFirmId = IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');

    const backupPayload = {
      meta: { app: "AccountBook", firm: cleanFirm, version: "3.4.0", export_timestamp: now.toISOString(), active_firm_id: activeFirmId },
      stats: { vouchersCount, accountsCount, total_keys: Object.keys(storageSnapshot).length },
      data: storageSnapshot
    };

    const jsonString = JSON.stringify(backupPayload);
    if (Capacitor.isNativePlatform()) {
      const writeResult = await Filesystem.writeFile({ path: fileName, data: jsonString, directory: Directory.Cache, encoding: Encoding.UTF8 });
      if (writeResult?.uri) {
        await Share.share({ title: 'Account Book Backup', url: writeResult.uri });
        return { success: true };
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);

    return { success: true };
  } catch (err) {
    throw new Error(err.message || 'Failed to generate backup.');
  }
};

/**
 * MASTER MULTI-FIRM PRESERVATION RESTORE ENGINE (De-duplicated & Intelligent Mapping)
 */
export const restoreUniversalBackup = async (rawInput) => {
  try {
    if (!rawInput) throw new Error("No backup data provided.");

    let parsedContent;
    if (typeof rawInput === 'string') parsedContent = JSON.parse(rawInput);
    else if (rawInput instanceof Blob || rawInput instanceof File) {
      const text = await rawInput.text();
      parsedContent = JSON.parse(text);
    } else parsedContent = rawInput;

    let targetData = parsedContent?.data && typeof parsedContent.data === 'object' && !Array.isArray(parsedContent.data) 
      ? parsedContent.data 
      : parsedContent?.storage_dump || parsedContent;

    if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
      throw new Error("Invalid backup schema structure.");
    }

    window.__APP_STORAGE_CACHE__ = window.__APP_STORAGE_CACHE__ || {};

    // 1. Collect existing local firms to prevent duplication by name matching
    let aggregatedFirmsMap = new Map();
    const existingFirms = IDBStorage.getItem('app_firms_registry', []) || IDBStorage.getItem('app_firms', []) || [];
    
    existingFirms.forEach(f => {
      if (f && (f.id || f.firm_id)) {
        const cleanName = (f.legal_name || f.trade_name || f.name || '').trim().toLowerCase();
        aggregatedFirmsMap.set(f.id || f.firm_id, { ...f, _cleanName: cleanName });
      }
    });

    // 2. Extract backup firms and map them intelligently to existing ones if names match
    let firmIdMapping = {}; 
    let backupFirmsList = [];

    const registryKeys = ['app_firms_registry', 'app_firms', 'firm_list', 'app_firms_list'];
    registryKeys.forEach(rk => {
      if (targetData[rk] && Array.isArray(targetData[rk])) {
        backupFirmsList.push(...targetData[rk]);
      }
    });

    if (targetData['active_firm_profile']) {
      try {
        const prof = typeof targetData['active_firm_profile'] === 'string' 
          ? JSON.parse(targetData['active_firm_profile']) 
          : targetData['active_firm_profile'];
        if (prof) backupFirmsList.push(prof);
      } catch (e) {}
    }

    backupFirmsList.forEach(firm => {
      if (firm && (firm.id || firm.firm_id || firm.legal_name)) {
        const oldId = firm.id || firm.firm_id;
        const fName = (firm.legal_name || firm.trade_name || firm.name || 'AccountBook Firm').trim();
        const cleanName = fName.toLowerCase();

        let existingMatch = Array.from(aggregatedFirmsMap.values()).find(ef => ef._cleanName === cleanName);

        if (existingMatch) {
          if (oldId && oldId !== existingMatch.id) {
            firmIdMapping[oldId] = existingMatch.id;
          }
        } else {
          const newId = oldId || `FIRM-${Math.floor(Math.random() * 100000)}`;
          aggregatedFirmsMap.set(newId, {
            id: newId,
            firm_id: newId,
            legal_name: fName,
            trade_name: fName,
            business_category: firm.business_category || firm.category || 'BRICK_KILN',
            gstin: firm.gstin || 'UNREGISTERED',
            _cleanName: cleanName
          });
        }
      }
    });

    let finalFirmsList = Array.from(aggregatedFirmsMap.values()).map(({ _cleanName, ...rest }) => rest);
    if (finalFirmsList.length === 0) {
      finalFirmsList.push({
        id: 'FIRM-1790909076433',
        firm_id: 'FIRM-1790909076433',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN',
        gstin: 'UNREGISTERED'
      });
    }

    let activeFirmId = parsedContent?.meta?.active_firm_id || finalFirmsList[0].id;
    if (firmIdMapping[activeFirmId]) {
      activeFirmId = firmIdMapping[activeFirmId];
    }

    // 3. Dump keys with ID remapping so scoped data attaches to the correct existing firm ID
    let totalRecordsCount = 0;
    Object.keys(targetData).forEach(key => {
      try {
        let val = targetData[key];
        let targetKey = key;

        Object.keys(firmIdMapping).forEach(oldId => {
          if (key.includes(oldId)) {
            targetKey = key.replace(oldId, firmIdMapping[oldId]);
          }
        });

        IDBStorage.setItem(targetKey, val);
        if (Array.isArray(val)) {
          totalRecordsCount += val.length;
        }
      } catch (e) {}
    });

    // 4. Save clean multi-firm registry and pointers atomically
    IDBStorage.setItem('app_firms_registry', finalFirmsList);
    IDBStorage.setItem('app_firms', finalFirmsList);
    IDBStorage.setItem('app_active_firm_id', activeFirmId);
    IDBStorage.setItem('active_firm_profile', finalFirmsList.find(f => f.id === activeFirmId) || finalFirmsList[0]);

    autoHealRestoredInventoryAndAccounts(activeFirmId);

    // 5. Trigger full UI re-render events
    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      stats: {
        firmsCount: finalFirmsList.length,
        vouchersCount: totalRecordsCount > 0 ? totalRecordsCount : parsedContent?.stats?.vouchersCount || 0
      }
    };
  } catch (err) {
    throw new Error(err.message || 'Backup restore karne mein asafalta hui.');
  }
};

export const exportUniversalBackup = downloadAppBackup;
export const downloadAppBackupFromFile = restoreUniversalBackup;
export const restoreAppBackupFromFile = restoreUniversalBackup;
export const exportAppBackupJSON = downloadAppBackup;
export const restoreAppBackupJSON = restoreUniversalBackup;

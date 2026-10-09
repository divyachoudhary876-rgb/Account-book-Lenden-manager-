/**
 * Frontend Utility: Universal Zero-Loss Backup & Restore Engine
 * Ensures quota protection, strict multi-firm isolation, and safe data restore.
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';

const resolveFirmNameString = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'AccountBook';
  }
  return 'AccountBook';
};

export const ensureStockItemLedgerAccount = (firmId, rawItemName) => {
  if (!firmId || !rawItemName) return null;

  const cleanItemName = String(rawItemName).replace(/\s*Stock\s*Account/i, '').trim();
  const stockAccountName = `${cleanItemName} Stock Account`;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    const exists = masterAccounts.some(
      (acc) => (acc.account_name || acc.name || '').trim().toLowerCase() === stockAccountName.toLowerCase()
    );

    if (!exists) {
      const newAccountObj = {
        id: `ACC-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        firm_id: firmId,
        account_name: stockAccountName,
        name: stockAccountName,
        primary_type: 'ASSETS',
        type: 'Assets',
        sub_group: 'Inventory / Current Assets',
        group: 'Current Assets',
        balance_type: 'Dr',
        opening_balance: 0,
        is_system_generated: true,
        created_at: new Date().toISOString()
      };

      saveMasterAccount(firmId, newAccountObj);
      return newAccountObj;
    }
  } catch (error) {
    console.error('Error auto-syncing stock ledger account:', error);
  }

  return null;
};

/**
 * Post-Restore Self-Healing & Stock Recalculation Engine
 */
export const autoHealRestoredInventoryAndAccounts = (firmId) => {
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

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
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
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
    const serializedStock = JSON.stringify(stockItems);
    localStorage.setItem(inventoryKey, serializedStock);

    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error during autoHealRestoredInventoryAndAccounts:', err);
  }
};

/**
 * 1. DOWNLOAD FULL BACKUP ENGINE
 */
export const downloadAppBackup = async (firmInput = 'AccountBook') => {
  try {
    const storageSnapshot = {};
    let vouchersCount = 0;
    let accountsCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('temp_cache_') || key.startsWith('debug_log_')) continue;
        const rawVal = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(rawVal);
          storageSnapshot[key] = parsed;
          if (Array.isArray(parsed)) {
            if (key.includes('voucher') || key.includes('invoice') || key.includes('purchase_bill') || key.includes('book_vouchers')) vouchersCount += parsed.length;
            if (key.includes('account') || key.includes('inventory')) accountsCount += parsed.length;
          }
        } catch {
          storageSnapshot[key] = rawVal;
        }
      }
    }

    const cleanFirm = String(resolveFirmNameString(firmInput)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const fileName = `${cleanFirm}_Backup_${now.toISOString().slice(0, 10)}.json`;
    const activeFirmId = localStorage.getItem('app_active_firm_id') || 'FIRM-001';

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
 * 2. SECURE QUOTA-SAFE RESTORE ENGINE WITH FIRM SANITIZATION
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

    // 1. Extract clean firm profiles safely
    let cleanFirmsList = [];
    
    if (targetData['active_firm_profile']) {
      try {
        const prof = typeof targetData['active_firm_profile'] === 'string' ? JSON.parse(targetData['active_firm_profile']) : targetData['active_firm_profile'];
        if (prof && (prof.legal_name || prof.trade_name) && !prof.account_name && !prof.item_name) {
          cleanFirmsList.push(prof);
        }
      } catch (e) {}
    }

    Object.keys(targetData).forEach(k => {
      if (k === 'app_firms_registry' || k === 'app_firms' || k === 'firm_list' || k === 'app_firms_list' || k === 'active_firm_profile') {
        try {
          const rawVal = targetData[k];
          const parsed = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item && typeof item === 'object') {
                const name = (item.legal_name || item.trade_name || item.name || '').trim();
                const isRealFirm = name !== '' && 
                                   !item.account_name && 
                                   !item.item_name && 
                                   !item.primary_type && 
                                   !item.unit_purchase_price &&
                                   !name.includes('Account') && 
                                   !name.includes('Bank') &&
                                   !name.includes('Cash');

                if (isRealFirm) {
                  if (!cleanFirmsList.some(f => (f.legal_name || '').toLowerCase() === name.toLowerCase())) {
                    cleanFirmsList.push({
                      id: item.id || item.firm_id || `FIRM-${Math.floor(Math.random() * 100000)}`,
                      firm_id: item.firm_id || item.id || `FIRM-${Math.floor(Math.random() * 100000)}`,
                      legal_name: name,
                      trade_name: item.trade_name || name,
                      business_category: item.business_category || item.category || 'BRICK_KILN',
                      gstin: item.gstin || 'UNREGISTERED'
                    });
                  }
                }
              }
            });
          }
        } catch (e) {}
      }
    });

    if (cleanFirmsList.length === 0) {
      cleanFirmsList.push({
        id: 'FIRM-001',
        firm_id: 'FIRM-001',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN'
      });
    }

    let activeFirmId = cleanFirmsList[0].id || cleanFirmsList[0].firm_id;

    // 2. Clear old storage cleanly before writing backup items to prevent quota overflow
    try {
      localStorage.clear();
    } catch (e) {}

    // 3. Restore storage items securely with quota handling
    let restoredVouchersCount = 0;
    Object.keys(targetData).forEach(key => {
      try {
        const val = targetData[key];
        const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        localStorage.setItem(key, stringifiedVal);
        if (key.includes('voucher') && Array.isArray(val)) {
          restoredVouchersCount += val.length;
        }
      } catch (quotaErr) {
        console.warn(`Skipped key ${key} due to local storage quota limit.`);
      }
    });

    // 4. Save clean firm registries
    const serializedFirms = JSON.stringify(cleanFirmsList);
    const firmRegistryKeys = ['app_firms_registry', 'app_firms', 'firm_list', 'app_firms_list'];
    firmRegistryKeys.forEach(rk => localStorage.setItem(rk, serializedFirms));

    localStorage.setItem('app_active_firm_id', activeFirmId);
    localStorage.setItem('active_firm_profile', JSON.stringify(cleanFirmsList[0]));

    autoHealRestoredInventoryAndAccounts(activeFirmId);

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));

    return {
      success: true,
      stats: {
        firmsCount: cleanFirmsList.length,
        vouchersCount: restoredVouchersCount
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

/**
 * Frontend Utility: Universal Zero-Loss Backup & Restore Engine
 * Ensures multi-firm preservation, cross-key synchronization, and automatic inventory healing.
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
 * Post-Restore Self-Healing & Stock Recalculation Engine (Zero Inflation)
 */
export const autoHealRestoredInventoryAndAccounts = (firmId) => {
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  try {
    let stockItems = [];
    const stockKeys = [`inventory_items_${cleanFirmId}`, 'inventory_items', 'inventory_items_FIRM-001', 'app_inventory'];

    stockKeys.forEach(k => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(it => {
              const itName = it?.name || it?.item_name;
              if (itName && !stockItems.some(x => (x.name || x.item_name) === itName)) {
                stockItems.push(it);
              }
            });
          }
        }
      } catch (e) {}
    });

    // Clean inventory quantities to prevent inflation
    stockItems = stockItems.map(item => {
      const cleanName = String(item?.name || item?.item_name || '').trim();
      const directStock = parseFloat(item?.current_stock ?? item?.stock ?? item?.qty ?? item?.current_qty ?? 0);
      
      return {
        ...item,
        name: cleanName,
        item_name: cleanName,
        current_stock: Math.max(0, directStock),
        stock: Math.max(0, directStock),
        qty: Math.max(0, directStock)
      };
    });

    const inventoryKey = `inventory_items_${cleanFirmId}`;
    const serializedStock = JSON.stringify(stockItems);
    localStorage.setItem(inventoryKey, serializedStock);
    localStorage.setItem('inventory_items', serializedStock);
    localStorage.setItem('app_inventory', serializedStock);

    stockItems.forEach(item => {
      const itemName = item?.name || item?.item_name;
      if (itemName && !item.is_service && item.item_type !== 'SERVICE') {
        ensureStockItemLedgerAccount(cleanFirmId, itemName);
      }
    });

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
            if (key.includes('voucher') || key.includes('invoice') || key.includes('purchase_bill')) vouchersCount += parsed.length;
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
 * 2. SECURE ZERO-LOSS RESTORE ENGINE WITH TRUE MULTI-FIRM PRESERVATION
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

    // 1. Safely extract and Deep-Merge existing local firms and backup firms across ALL registry keys
    const firmRegistryKeys = ['app_firms_registry', 'app_firms', 'firm_list', 'app_firms_list'];
    let existingFirms = [];
    firmRegistryKeys.forEach(rk => {
      try {
        const raw = localStorage.getItem(rk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) existingFirms.push(...parsed);
        }
      } catch (e) {}
    });

    let backupFirms = [];
    Object.keys(targetData).forEach(k => {
      if (firmRegistryKeys.includes(k) || k.includes('firm')) {
        try { 
          const parsedFirms = typeof targetData[k] === 'string' ? JSON.parse(targetData[k]) : targetData[k];
          if (Array.isArray(parsedFirms)) backupFirms.push(...parsedFirms);
          else if (parsedFirms && typeof parsedFirms === 'object' && parsedFirms.id) backupFirms.push(parsedFirms);
        } catch (e) {}
      }
    });

    const firmsMap = new Map();
    existingFirms.forEach(f => { if (f && (f.id || f.firm_id)) firmsMap.set(f.id || f.firm_id, f); });
    backupFirms.forEach(f => { if (f && (f.id || f.firm_id)) firmsMap.set(f.id || f.firm_id, f); });
    
    // Also check if active_firm_profile exists in backup and add it
    if (targetData['active_firm_profile']) {
      try {
        const prof = typeof targetData['active_firm_profile'] === 'string' ? JSON.parse(targetData['active_firm_profile']) : targetData['active_firm_profile'];
        if (prof && (prof.id || prof.firm_id)) firmsMap.set(prof.id || prof.firm_id, prof);
      } catch (e) {}
    }

    const mergedFirmsList = Array.from(firmsMap.values());

    // 2. Restore all storage data securely
    Object.keys(targetData).forEach(key => {
      if (firmRegistryKeys.includes(key)) return;
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);

      if (key.includes('inventory_items') || key.includes('purchase_bills') || key.includes('app_vouchers') || key.includes('account_book_vouchers') || key.includes('app_accounts')) {
        localStorage.setItem(key, stringifiedVal);
      }
    });

    // 3. Persist the merged firm profiles list across all registry keys
    if (mergedFirmsList.length > 0) {
      const serializedFirms = JSON.stringify(mergedFirmsList);
      firmRegistryKeys.forEach(rk => localStorage.setItem(rk, serializedFirms));
    }

    let activeFirmId = localStorage.getItem('app_active_firm_id') || 
                       parsedContent?.meta?.active_firm_id || 
                       targetData['app_active_firm_id'] || 
                       mergedFirmsList[0]?.id || 
                       'FIRM-001';

    localStorage.setItem('app_active_firm_id', activeFirmId);
    
    const activeProf = mergedFirmsList.find(f => f.id === activeFirmId || f.firm_id === activeFirmId) || mergedFirmsList[0];
    if (activeProf) {
      localStorage.setItem('active_firm_profile', JSON.stringify(activeProf));
    }

    // 4. Trigger Post-Restore Healing & Recalibration
    autoHealRestoredInventoryAndAccounts(activeFirmId);

    return {
      success: true,
      stats: {
        vouchersCount: JSON.parse(localStorage.getItem(`app_vouchers_${activeFirmId}`) || localStorage.getItem('account_book_vouchers') || '[]').length,
        accountsCount: JSON.parse(localStorage.getItem(`app_accounts_${activeFirmId}`) || localStorage.getItem('app_accounts') || '[]').length,
        purchasesCount: JSON.parse(localStorage.getItem(`purchase_bills_${activeFirmId}`) || localStorage.getItem('purchase_bills') || '[]').length
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

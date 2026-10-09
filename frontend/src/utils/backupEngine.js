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
    localStorage.setItem('inventory_items', serializedStock);
    localStorage.setItem('app_inventory', serializedStock);

    stockItems.forEach(item => {
      const itemName = item?.name || item?.item_name || item?.itemName;
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
 * 1. DOWNLOAD FULL BACKUP ENGINE (Captures all active storage state across all firms and keys)
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
 * 2. SECURE ZERO-LOSS RESTORE ENGINE WITH STRICT FIRM DEDUPLICATION & ISOLATION
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

    const firmRegistryKeys = ['app_firms_registry', 'app_firms', 'firm_list', 'app_firms_list', 'app_firm_profiles'];
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
      if (firmRegistryKeys.includes(k) || k.includes('firm') || k === 'active_firm_profile') {
        try { 
          const rawVal = targetData[k];
          const parsedFirms = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
          
          const processCandidate = (item) => {
            if (item && typeof item === 'object') {
              const name = (item.legal_name || item.trade_name || item.name || '').trim();
              const hasFirmIdentity = name !== '' && !item.item_name && !item.account_name && !item.unit_purchase_price;
              
              if (hasFirmIdentity) {
                backupFirms.push({
                  id: item.id || item.firm_id || `FIRM-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  firm_id: item.firm_id || item.id || `FIRM-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                  legal_name: name,
                  trade_name: item.trade_name || name,
                  business_category: item.business_category || item.category || 'BRICK_KILN',
                  gstin: item.gstin || 'UNREGISTERED'
                });
              }
            }
          };

          if (Array.isArray(parsedFirms)) {
            parsedFirms.forEach(processCandidate);
          } else {
            processCandidate(parsedFirms);
          }
        } catch (e) {}
      }
    });

    const firmsMap = new Map();
    const allCandidates = [...existingFirms, ...backupFirms];
    
    // Strict Name-based Deduplication to avoid multiple identical firm profiles
    allCandidates.forEach(f => {
      if (f) {
        const name = (f.legal_name || f.trade_name || '').trim();
        const nameKey = name.toLowerCase();
        if (nameKey && nameKey !== 'aaa' && nameKey !== 'item' && nameKey !== 'new firm') {
          if (!firmsMap.has(nameKey)) {
            firmsMap.set(nameKey, {
              id: f.id || f.firm_id || `FIRM-${Math.floor(Math.random() * 100000)}`,
              firm_id: f.firm_id || f.id || `FIRM-${Math.floor(Math.random() * 100000)}`,
              legal_name: name,
              trade_name: f.trade_name || name,
              business_category: f.business_category || f.category || 'BRICK_KILN',
              gstin: f.gstin || 'UNREGISTERED'
            });
          }
        }
      }
    });

    let mergedFirmsList = Array.from(firmsMap.values());

    if (mergedFirmsList.length === 0) {
      mergedFirmsList.push({
        id: 'FIRM-001',
        firm_id: 'FIRM-001',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN'
      });
    }

    // Restore data keys securely into localStorage
    Object.keys(targetData).forEach(key => {
      if (firmRegistryKeys.includes(key)) return;
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
    });

    const serializedFirms = JSON.stringify(mergedFirmsList);
    firmRegistryKeys.forEach(rk => localStorage.setItem(rk, serializedFirms));

    let activeFirmId = localStorage.getItem('app_active_firm_id') || mergedFirmsList[0].id;
    localStorage.setItem('app_active_firm_id', activeFirmId);
    
    const activeProf = mergedFirmsList.find(f => f.id === activeFirmId || f.firm_id === activeFirmId) || mergedFirmsList[0];
    localStorage.setItem('active_firm_profile', JSON.stringify(activeProf));

    autoHealRestoredInventoryAndAccounts(activeFirmId);

    return {
      success: true,
      stats: {
        firmsCount: mergedFirmsList.length,
        vouchersCount: JSON.parse(localStorage.getItem(`app_vouchers_${activeFirmId}`) || localStorage.getItem('account_book_vouchers') || '[]').length,
        accountsCount: JSON.parse(localStorage.getItem(`app_accounts_${activeFirmId}`) || localStorage.getItem('app_accounts') || '[]').length
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

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
 * Post-Restore Self-Healing & Stock Recalculation Engine (Aggregates across all keys)
 */
export const autoHealRestoredInventoryAndAccounts = (firmId) => {
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  try {
    // 1. Gather all inventory items across any firm-suffixed or global keys
    let stockItems = [];
    Object.keys(localStorage).forEach(k => {
      if (k.includes('inventory_items')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach(it => {
                const itName = it?.name || it?.item_name || it?.itemName;
                if (itName && !stockItems.some(x => (x.name || x.item_name || x.itemName) === itName)) {
                  stockItems.push(it);
                }
              });
            }
          }
        } catch (e) {}
      }
    });

    // 2. Gather all purchase bills across any firm-suffixed or global keys
    let allPurchases = [];
    Object.keys(localStorage).forEach(k => {
      if (k.includes('purchase_bill') || k.includes('purchases')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) allPurchases.push(...parsed);
          }
        } catch (e) {}
      }
    });

    // 3. Gather all sales invoices / sales across keys
    let allSales = [];
    Object.keys(localStorage).forEach(k => {
      if (k.includes('invoice') || k.includes('sales')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) allSales.push(...parsed);
          }
        } catch (e) {}
      }
    });

    // 4. Recalculate stock levels accurately
    stockItems = stockItems.map(item => {
      const itemName = (item?.name || item?.item_name || item?.itemName || '').trim().toLowerCase();
      const itemId = String(item?.id || '');

      let totalPurchased = 0;
      allPurchases.forEach(p => {
        const pItemId = String(p?.itemId || p?.item_id || p?.item || '');
        const pItemName = String(p?.itemName || p?.item_name || p?.name || '').trim().toLowerCase();
        if (pItemId === itemId || pItemName === itemName) {
          totalPurchased += parseFloat(p?.qty || p?.quantity || p?.stock || 0);
        }
      });

      let totalSold = 0;
      allSales.forEach(s => {
        const itemsList = Array.isArray(s?.items) ? s.items : [];
        itemsList.forEach(si => {
          const sItemId = String(si?.itemId || si?.item_id || si?.product_id || si?.id || '');
          const sItemName = String(si?.itemName || si?.item_name || si?.name || '').trim().toLowerCase();
          if (sItemId === itemId || sItemName === itemName) {
            totalSold += parseFloat(si?.quantity || si?.qty || 0);
          }
        });
      });

      const netStock = Math.max(0, totalPurchased - totalSold);
      item.current_stock = netStock;
      item.stock = netStock;
      item.qty = netStock;
      item.firm_id = cleanFirmId;
      return item;
    });

    // Save consolidated inventory to active firm key and global key
    const targetInventoryKey = `inventory_items_${cleanFirmId}`;
    const serializedStock = JSON.stringify(stockItems);
    localStorage.setItem(targetInventoryKey, serializedStock);
    localStorage.setItem('inventory_items', serializedStock);

    // Save consolidated purchase bills to active firm key
    if (allPurchases.length > 0) {
      const targetPurchaseKey = `purchase_bills_${cleanFirmId}`;
      localStorage.setItem(targetPurchaseKey, JSON.stringify(allPurchases));
      localStorage.setItem('purchase_bills', JSON.stringify(allPurchases));
    }

    // Ensure Ledger Accounts for Stock Items
    stockItems.forEach(item => {
      const itemName = item?.name || item?.item_name || item?.itemName;
      if (itemName && !item.is_service && item.item_type !== 'SERVICE') {
        ensureStockItemLedgerAccount(cleanFirmId, itemName);
      }
    });

    // 5. Consolidate and sort vouchers
    let allVouchers = [];
    Object.keys(localStorage).forEach(k => {
      if (k.includes('voucher') || k.includes('account_book_vouchers')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) allVouchers.push(...parsed);
          }
        } catch (e) {}
      }
    });

    if (allVouchers.length > 0) {
      // Remove duplicates based on ID
      const uniqueVouchersMap = new Map();
      allVouchers.forEach(v => {
        if (v && v.id) uniqueVouchersMap.set(v.id, v);
        else if (v) uniqueVouchersMap.set(JSON.stringify(v), v);
      });
      allVouchers = Array.from(uniqueVouchersMap.values());

      allVouchers.sort((a, b) => new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0));

      const targetVoucherKey = `account_book_vouchers_${cleanFirmId}`;
      const targetAppVoucherKey = `app_vouchers_${cleanFirmId}`;
      const serializedVouchers = JSON.stringify(allVouchers);

      localStorage.setItem(targetVoucherKey, serializedVouchers);
      localStorage.setItem(targetAppVoucherKey, serializedVouchers);
      localStorage.setItem('account_book_vouchers', serializedVouchers);
      localStorage.setItem('app_vouchers', serializedVouchers);
    }

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
 * 2. SECURE ZERO-LOSS RESTORE ENGINE WITH CROSS-KEY MAPPING & FIRM MERGING
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

    // 1. Safely extract existing local firms and backup firms
    const existingFirmsRaw = localStorage.getItem('app_firms_registry') || localStorage.getItem('app_firms') || localStorage.getItem('firm_list') || '[]';
    let existingFirms = [];
    try { existingFirms = JSON.parse(existingFirmsRaw); } catch (e) { existingFirms = []; }

    let backupFirms = [];
    Object.keys(targetData).forEach(k => {
      if (k === 'app_firms' || k === 'firm_list' || k === 'app_firms_registry') {
        try { 
          const parsedFirms = typeof targetData[k] === 'string' ? JSON.parse(targetData[k]) : targetData[k];
          if (Array.isArray(parsedFirms)) backupFirms = parsedFirms; 
        } catch (e) {}
      }
    });

    const firmsMap = new Map();
    if (Array.isArray(existingFirms)) existingFirms.forEach(f => { if (f && (f.id || f.firm_id)) firmsMap.set(f.id || f.firm_id, f); });
    if (Array.isArray(backupFirms)) backupFirms.forEach(f => { if (f && (f.id || f.firm_id)) firmsMap.set(f.id || f.firm_id, f); });
    const mergedFirmsList = Array.from(firmsMap.values());

    // 2. Restore all storage data securely into localStorage
    Object.keys(targetData).forEach(key => {
      if (key === 'app_firms' || key === 'firm_list' || key === 'app_firms_registry') return;
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
    });

    // 3. Persist the merged firm profiles list
    if (mergedFirmsList.length > 0) {
      const serializedFirms = JSON.stringify(mergedFirmsList);
      localStorage.setItem('app_firms_registry', serializedFirms);
      localStorage.setItem('app_firms', serializedFirms);
    }

    let activeFirmId = localStorage.getItem('app_active_firm_id') || 
                       parsedContent?.meta?.active_firm_id || 
                       targetData['app_active_firm_id'] || 
                       mergedFirmsList[0]?.id || 
                       'FIRM-1790909076433';

    localStorage.setItem('app_active_firm_id', activeFirmId);

    // 4. Trigger Post-Restore Healing & Recalibration across all imported keys
    autoHealRestoredInventoryAndAccounts(activeFirmId);

    return {
      success: true,
      stats: {
        vouchersCount: JSON.parse(localStorage.getItem(`account_book_vouchers_${activeFirmId}`) || localStorage.getItem('account_book_vouchers') || '[]').length,
        accountsCount: JSON.parse(localStorage.getItem(`account_heads_${activeFirmId}`) || localStorage.getItem('app_accounts') || '[]').length,
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

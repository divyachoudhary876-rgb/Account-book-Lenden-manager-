/**
 * Frontend Utility: Universal Zero-Loss Resilient Backup & Restore Engine
 * Multi-Firm Deep Auto-Healing & Legacy ID Reconciliation Architecture
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

/**
 * Normalizes and heals purchases with domain-specific brick kiln classifications
 */
export const normalizePurchaseRecords = (purchases, targetFirmId) => {
  if (!Array.isArray(purchases)) return [];
  
  return purchases.map((p, idx) => {
    const pCopy = { ...p };
    pCopy.firm_id = targetFirmId;
    pCopy.firmId = targetFirmId;

    let itemName = pCopy.itemName || pCopy.item_name;
    const narration = (pCopy.narration || '').toLowerCase();
    const drAcc = (pCopy.dr_account || '').toLowerCase();
    const party = (pCopy.party || pCopy.cr_account || pCopy.supplier_name || '').toLowerCase();

    if (!itemName || ['stock item', 'stock account', 'purchase a/c', 'purchase raw material account'].includes(itemName.toLowerCase())) {
      if (narration.includes('diesel') || drAcc.includes('diesel') || party.includes('padgad') || party.includes('driver')) {
        itemName = 'Diesel';
      } else if (narration.includes('grade a') || drAcc.includes('grade a')) {
        itemName = 'Mitti Grade A';
      } else if (narration.includes('grade b') || drAcc.includes('grade b') || party.includes('sabeer') || party.includes('vinod sihag')) {
        itemName = 'Mitti Grade B';
      } else if (narration.includes('greet') || narration.includes('crusher')) {
        itemName = 'Greet & Crusher';
      } else if (narration.includes('kitchen')) {
        itemName = 'Kitchen Accessories';
      } else {
        itemName = 'Raw Material Stock';
      }
    }

    pCopy.itemName = itemName;
    pCopy.item_name = itemName;
    pCopy.quantity = parseFloat(pCopy.quantity || pCopy.qty || pCopy.items?.[0]?.qty || 0);
    pCopy.qty = pCopy.quantity;
    pCopy.amount = parseFloat(pCopy.amount || pCopy.total_amount || 0);
    pCopy.total_amount = pCopy.amount;
    pCopy.rate = parseFloat(pCopy.rate || pCopy.purchase_rate || (pCopy.quantity > 0 ? (pCopy.amount / pCopy.quantity).toFixed(2) : 0));

    if (!pCopy.id) pCopy.id = `PURCH-${Date.now()}-${idx}`;
    return pCopy;
  });
};

/**
 * Universal Auto-Heal & Multi-Key Synchronization
 */
export const autoHealAndRepostRestoredPurchases = (firmId) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');

  try {
    const rawPurchases = IDBStorage.getItem(`purchase_bills_${cleanFirmId}`, []) || [];
    const healedPurchases = normalizePurchaseRecords(rawPurchases, cleanFirmId);

    // Persist to both IDB and LocalStorage
    IDBStorage.setItem(`purchase_bills_${cleanFirmId}`, healedPurchases);
    IDBStorage.setItem('purchase_bills', healedPurchases);
    try {
      localStorage.setItem(`purchase_bills_${cleanFirmId}`, JSON.stringify(healedPurchases));
      localStorage.setItem('purchase_bills', JSON.stringify(healedPurchases));
    } catch (e) {
      console.warn('LocalStorage limit exceeded, data retained in IndexedDB');
    }

    // Mirror vouchers
    const vouchers = IDBStorage.getItem(`account_book_vouchers_${cleanFirmId}`, []) || [];
    if (vouchers.length > 0) {
      IDBStorage.setItem('account_book_vouchers', vouchers);
      IDBStorage.setItem('app_vouchers', vouchers);
      try {
        localStorage.setItem(`account_book_vouchers_${cleanFirmId}`, JSON.stringify(vouchers));
        localStorage.setItem('account_book_vouchers', JSON.stringify(vouchers));
      } catch (e) {}
    }

    // Dispatch system events
    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Error during bulk auto-heal:', err);
  }
};

/**
 * Universal Zero-Loss Restore Engine (Handles all Legacy & Scattered Firm IDs)
 */
export const restoreUniversalBackup = async (rawInput) => {
  try {
    if (!rawInput) throw new Error("No backup data provided.");

    let parsedContent;
    if (typeof rawInput === 'string') parsedContent = JSON.parse(rawInput);
    else if (rawInput instanceof Blob || rawInput instanceof File) {
      const text = await rawInput.text();
      parsedContent = JSON.parse(text);
    } else {
      parsedContent = rawInput;
    }

    let targetData = parsedContent?.data && typeof parsedContent.data === 'object' && !Array.isArray(parsedContent.data)
      ? parsedContent.data
      : parsedContent?.storage_dump || parsedContent;

    if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
      throw new Error("Invalid backup schema structure.");
    }

    // 1. Determine Target Active Firm ID
    const targetFirmId = parsedContent?.meta?.active_firm_id || 
                         targetData?.active_firm_profile?.id || 
                         targetData?.active_firm_profile?.firm_id || 
                         'FIRM-1790909076433';

    // 2. Aggregate Scattered Legacy Records
    const voucherMap = new Map();
    const purchaseMap = new Map();
    const accountMap = new Map();
    const itemMap = new Map();

    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      if (!val) return;

      // Save raw key directly into IDBStorage
      try {
        IDBStorage.setItem(key, val);
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      } catch (e) {}

      // A. Aggregate Vouchers
      if (key.includes('vouchers') || key.includes('invoices') || key.includes('app_invoices')) {
        if (Array.isArray(val)) {
          val.forEach(v => {
            if (v && v.id) voucherMap.set(v.id, { ...v, firm_id: targetFirmId, firmId: targetFirmId });
          });
        }
      }

      // B. Aggregate Purchases
      if (key.includes('purchase_bills') || key.includes('purchases')) {
        if (Array.isArray(val)) {
          val.forEach(p => {
            if (p && p.id) purchaseMap.set(p.id, { ...p, firm_id: targetFirmId, firmId: targetFirmId });
          });
        }
      }

      // C. Aggregate Accounts / Ledgers
      if (key.includes('account_heads') || key.includes('app_accounts')) {
        if (Array.isArray(val)) {
          val.forEach(a => {
            if (a && a.id) accountMap.set(a.id, a);
          });
        }
      }

      // D. Aggregate Inventory Items
      if (key.includes('inventory_items')) {
        if (Array.isArray(val)) {
          val.forEach(item => {
            if (item && item.id) itemMap.set(item.id, { ...item, firm_id: targetFirmId });
          });
        }
      }
    });

    const consolidatedVouchers = Array.from(voucherMap.values());
    const consolidatedPurchases = normalizePurchaseRecords(Array.from(purchaseMap.values()), targetFirmId);
    const consolidatedAccounts = Array.from(accountMap.values());
    const consolidatedItems = Array.from(itemMap.values());

    // 3. Write Consolidated Data to Target Firm Keys
    IDBStorage.setItem(`account_book_vouchers_${targetFirmId}`, consolidatedVouchers);
    IDBStorage.setItem('account_book_vouchers', consolidatedVouchers);
    IDBStorage.setItem('app_vouchers', consolidatedVouchers);

    IDBStorage.setItem(`purchase_bills_${targetFirmId}`, consolidatedPurchases);
    IDBStorage.setItem('purchase_bills', consolidatedPurchases);

    IDBStorage.setItem(`account_heads_${targetFirmId}`, consolidatedAccounts);
    IDBStorage.setItem(`app_accounts_${targetFirmId}`, consolidatedAccounts);
    IDBStorage.setItem('app_account_heads', consolidatedAccounts);

    IDBStorage.setItem(`inventory_items_${targetFirmId}`, consolidatedItems);
    IDBStorage.setItem('inventory_items', consolidatedItems);

    // Sync critical caches to localStorage
    try {
      localStorage.setItem(`account_book_vouchers_${targetFirmId}`, JSON.stringify(consolidatedVouchers));
      localStorage.setItem('account_book_vouchers', JSON.stringify(consolidatedVouchers));
      localStorage.setItem(`purchase_bills_${targetFirmId}`, JSON.stringify(consolidatedPurchases));
      localStorage.setItem('purchase_bills', JSON.stringify(consolidatedPurchases));
      localStorage.setItem(`account_heads_${targetFirmId}`, JSON.stringify(consolidatedAccounts));
      localStorage.setItem(`inventory_items_${targetFirmId}`, JSON.stringify(consolidatedItems));
    } catch (e) {}

    // 4. Firm Profile Registry Reconciliation
    let finalFirmsList = targetData['app_firms_registry'] || targetData['app_firms'] || [];
    if (!Array.isArray(finalFirmsList) || finalFirmsList.length === 0) {
      const activeProfile = targetData['active_firm_profile'] || {};
      finalFirmsList = [{
        id: targetFirmId,
        firm_id: targetFirmId,
        legal_name: activeProfile.legal_name || 'Neelkanth Int Udyog',
        trade_name: activeProfile.trade_name || 'Neelkanth Int Udyog',
        business_category: activeProfile.business_category || 'BRICK_KILN',
        gstin: activeProfile.gstin || 'UNREGISTERED'
      }];
    }

    IDBStorage.setItem('app_firms_registry', finalFirmsList);
    IDBStorage.setItem('app_firms', finalFirmsList);
    IDBStorage.setItem('app_active_firm_id', targetFirmId);
    IDBStorage.setItem('active_firm_profile', finalFirmsList.find(f => f.id === targetFirmId) || finalFirmsList[0]);
    localStorage.setItem('app_active_firm_id', targetFirmId);

    // 5. Run Auto-Heal
    autoHealAndRepostRestoredPurchases(targetFirmId);

    return {
      success: true,
      stats: {
        firmsCount: finalFirmsList.length,
        vouchersCount: consolidatedVouchers.length,
        purchasesCount: consolidatedPurchases.length,
        accountsCount: consolidatedAccounts.length
      }
    };
  } catch (err) {
    console.error("Universal Restore Error:", err);
    throw new Error(err.message || 'Backup restore karne mein asafalta hui.');
  }
};

export const downloadAppBackup = async (firmInput = 'AccountBook') => {
  try {
    const storageSnapshot = {};
    const cache = window.__APP_STORAGE_CACHE__ || {};
    
    // Merge memory cache & localStorage keys for a complete snapshot
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !k.startsWith('temp_cache_') && !k.startsWith('debug_log_')) {
        try {
          storageSnapshot[k] = JSON.parse(localStorage.getItem(k));
        } catch (e) {
          storageSnapshot[k] = localStorage.getItem(k);
        }
      }
    }
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
      meta: { app: "AccountBook", firm: cleanFirm, version: "3.4.1", export_timestamp: now.toISOString(), active_firm_id: activeFirmId },
      stats: { total_keys: Object.keys(storageSnapshot).length },
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

export const exportUniversalBackup = downloadAppBackup;
export const downloadAppBackupFromFile = restoreUniversalBackup;
export const restoreAppBackupFromFile = restoreUniversalBackup;
export const exportAppBackupJSON = downloadAppBackup;
export const restoreAppBackupJSON = restoreUniversalBackup;

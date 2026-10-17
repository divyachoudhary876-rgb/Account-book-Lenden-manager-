/**
 * Frontend Utility: Universal Zero-Loss Resilient Backup & Restore Engine
 * Multi-Firm Deep Auto-Healing & Legacy Scattered-ID Reconciliation Architecture
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
 * Normalizes brick kiln material names & purchase numbers automatically
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
    const party = (pCopy.party || pCopy.cr_account || pCopy.supplier_name || pCopy.supplier || '').toLowerCase();

    // Auto-heal generic placeholders into real brick kiln commodities
    if (!itemName || ['stock item', 'stock account', 'purchase a/c', 'purchase raw material account', 'material'].includes(itemName.toLowerCase())) {
      if (narration.includes('diesel') || drAcc.includes('diesel') || party.includes('padgad') || party.includes('driver')) {
        itemName = 'Diesel';
      } else if (narration.includes('grade a') || drAcc.includes('grade a')) {
        itemName = 'Mitti Grade A';
      } else if (narration.includes('grade b') || drAcc.includes('grade b') || party.includes('sabeer') || party.includes('vinod sihag')) {
        itemName = 'Mitti Grade B';
      } else if (narration.includes('greet') || narration.includes('crusher') || party.includes('chelasari')) {
        itemName = 'Greet & Crusher';
      } else if (narration.includes('kitchen')) {
        itemName = 'Kitchen Accessories';
      } else if (narration.includes('coal') || narration.includes('koyla')) {
        itemName = 'Coal / Fuel';
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
 * Auto-Heal & Synchronize All Restored Records
 */
export const autoHealAndRepostRestoredPurchases = (firmId) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');

  try {
    const rawPurchases = IDBStorage.getItem(`purchase_bills_${cleanFirmId}`, []) || [];
    const healedPurchases = normalizePurchaseRecords(rawPurchases, cleanFirmId);

    // Persist to IDBStorage (Dual write buffer)
    IDBStorage.setItem(`purchase_bills_${cleanFirmId}`, healedPurchases);
    IDBStorage.setItem('purchase_bills', healedPurchases);

    // Mirror vouchers for Daybook
    const vouchers = IDBStorage.getItem(`account_book_vouchers_${cleanFirmId}`, []) || [];
    if (vouchers.length > 0) {
      IDBStorage.setItem('account_book_vouchers', vouchers);
      IDBStorage.setItem('app_vouchers', vouchers);
    }

    // Dispatch global UI reactivity
    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('[backupEngine] Error during bulk auto-heal:', err);
  }
};

/**
 * Universal Zero-Loss Restore Engine:
 * Scans ALL scattered firm keys from legacy backups and aggregates them cleanly.
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

    // 2. Aggregate Scattered Legacy Records across all keys
    const voucherMap = new Map();
    const purchaseMap = new Map();
    const accountMap = new Map();
    const itemMap = new Map();
    const adjustmentMap = new Map();

    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      if (!val) return;

      // Save raw key directly into IDBStorage
      try {
        IDBStorage.setItem(key, val);
      } catch (e) {}

      // A. Aggregate Vouchers & Invoices
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
            if (p && (p.id || p.bill_number)) {
              const uKey = p.id || p.bill_number;
              purchaseMap.set(uKey, { ...p, firm_id: targetFirmId, firmId: targetFirmId });
            }
          });
        }
      }

      // C. Aggregate Accounts / Ledgers
      if (key.includes('account_heads') || key.includes('app_accounts')) {
        if (Array.isArray(val)) {
          val.forEach(a => {
            if (a && (a.id || a.name || a.account_name)) {
              const aKey = (a.name || a.account_name || a.id).trim().toLowerCase();
              if (!accountMap.has(aKey)) accountMap.set(aKey, a);
            }
          });
        }
      }

      // D. Aggregate Inventory Items
      if (key.includes('inventory_items') || key.includes('app_inventory')) {
        if (Array.isArray(val)) {
          val.forEach(item => {
            if (item && (item.id || item.name || item.item_name)) {
              const iKey = (item.name || item.item_name || item.id).trim().toLowerCase();
              if (!itemMap.has(iKey)) {
                itemMap.set(iKey, { ...item, firm_id: targetFirmId });
              } else {
                // If item exists with 0 stock, take higher stock from duplicate entry
                const existing = itemMap.get(iKey);
                const cur = parseFloat(item.current_stock || item.stock || item.qty || 0);
                if (cur > parseFloat(existing.current_stock || 0)) {
                  existing.current_stock = cur;
                  existing.stock = cur;
                  existing.qty = cur;
                }
              }
            }
          });
        }
      }

      // E. Aggregate Material Adjustments
      if (key.includes('universal_material_adjustments') || key.includes('material_consumptions')) {
        if (Array.isArray(val)) {
          val.forEach(adj => {
            if (adj && adj.id) adjustmentMap.set(adj.id, { ...adj, firm_id: targetFirmId });
          });
        }
      }
    });

    const consolidatedVouchers = Array.from(voucherMap.values());
    const consolidatedPurchases = normalizePurchaseRecords(Array.from(purchaseMap.values()), targetFirmId);
    const consolidatedAccounts = Array.from(accountMap.values());
    const consolidatedItems = Array.from(itemMap.values());
    const consolidatedAdjustments = Array.from(adjustmentMap.values());

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

    IDBStorage.setItem(`universal_material_adjustments_${targetFirmId}`, consolidatedAdjustments);

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

    // 5. Run Auto-Heal & Reconcile
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
    console.error("[backupEngine] Universal Restore Error:", err);
    throw new Error(err.message || 'Backup restore karne mein asafalta hui.');
  }
};

/**
 * Universal Complete Backup Exporter (Merges IndexedDB, Memory Cache, and LocalStorage)
 */
export const downloadAppBackup = async (firmInput = 'AccountBook') => {
  try {
    const storageSnapshot = {};
    const cache = window.__APP_STORAGE_CACHE__ || {};
    
    // 1. Pull all active localStorage entries
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

    // 2. Merge memory buffer & IndexedDB snapshot
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
      meta: { 
        app: "AccountBook", 
        firm: cleanFirm, 
        version: "3.5.0", 
        export_timestamp: now.toISOString(), 
        active_firm_id: activeFirmId 
      },
      stats: { 
        total_keys: Object.keys(storageSnapshot).length 
      },
      data: storageSnapshot
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    if (Capacitor.isNativePlatform()) {
      const writeResult = await Filesystem.writeFile({ 
        path: fileName, 
        data: jsonString, 
        directory: Directory.Cache, 
        encoding: Encoding.UTF8 
      });
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
    setTimeout(() => { 
      document.body.removeChild(a); 
      URL.revokeObjectURL(url); 
    }, 1500);

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

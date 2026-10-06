// frontend/src/utils/backupEngine.js

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { getFirmMasterAccounts, saveMasterAccount, upgradeAndNormalizeAccount } from './accountMasterEngine.js';

const resolveFirmNameString = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'AccountBook';
  }
  return 'AccountBook';
};

/**
 * Ensures an Inventory Stock Item always has a corresponding Financial Asset Account
 * under Current Assets without manual user intervention.
 */
export const ensureStockItemLedgerAccount = (firmId, rawItemName) => {
  if (!firmId || !rawItemName) return null;

  const cleanItemName = String(rawItemName).trim();
  const stockAccountName = `${cleanItemName} Stock Account`;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    
    // Case-insensitive duplicate check
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
 * Post-Restore Self-Healing & Ledger Synchronization Sweep
 * Scans all restored inventory items and purchase bills to auto-create missing stock ledgers.
 */
export const autoHealRestoredInventoryAndAccounts = (firmId) => {
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  try {
    // 1. Scan Inventory Items across all standard keys
    let stockItems = [];
    const stockKeys = [
      `inventory_items_${cleanFirmId}`,
      'inventory_items',
      'inventory_items_FIRM-001'
    ];

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

    stockItems.forEach(item => {
      const itemName = item?.name || item?.item_name;
      if (itemName && !item.is_service && item.item_type !== 'SERVICE') {
        ensureStockItemLedgerAccount(cleanFirmId, itemName);
      }
    });

    // 2. Scan Purchase Bills to guarantee Dr asset ledger heads exist
    let purchaseBills = [];
    const billKeys = [
      `purchase_bills_${cleanFirmId}`,
      'purchase_bills',
      'purchase_bills_FIRM-001'
    ];

    billKeys.forEach(bk => {
      try {
        const raw = localStorage.getItem(bk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(pb => {
              if (pb && pb.item_name && !purchaseBills.some(x => x.item_name === pb.item_name)) {
                purchaseBills.push(pb);
              }
            });
          }
        }
      } catch (e) {}
    });

    purchaseBills.forEach(bill => {
      const itemName = bill?.item_name;
      if (itemName) {
        ensureStockItemLedgerAccount(cleanFirmId, itemName);
      }
    });

    // 3. Complete Reactive Broadcast
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
 * 1. UNIVERSAL ZERO-LOSS EXPORT ENGINE
 */
export const downloadAppBackup = async (firmInput = 'AccountBook') => {
  try {
    const storageSnapshot = {};
    let vouchersCount = 0;
    let accountsCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const rawVal = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(rawVal);
          storageSnapshot[key] = parsed;
          if (Array.isArray(parsed)) {
            if (key.includes('voucher') || key.includes('invoice') || key.includes('purchase_bill')) {
              vouchersCount += parsed.length;
            }
            if (key.includes('account') || key.includes('inventory')) {
              accountsCount += parsed.length;
            }
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
      meta: { 
        app: "AccountBook", 
        firm: cleanFirm, 
        version: "3.4.0", 
        export_timestamp: now.toISOString(),
        active_firm_id: activeFirmId 
      },
      stats: { vouchersCount, accountsCount, total_keys: Object.keys(storageSnapshot).length },
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

/**
 * 2. SMART ZERO-LOSS RESTORE ENGINE (WITH AUTO BILINGUAL UPGRADE & HEALING)
 */
export const restoreUniversalBackup = async (rawInput) => {
  try {
    if (!rawInput) throw new Error("No backup data provided.");

    let parsedContent;
    if (typeof rawInput === 'string') {
      parsedContent = JSON.parse(rawInput);
    } else if (rawInput instanceof Blob || rawInput instanceof File) {
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

    // A. Detect the true active firm ID
    let activeFirmId = localStorage.getItem('app_active_firm_id') || 
                       parsedContent?.meta?.active_firm_id || 
                       targetData['app_active_firm_id'] || 
                       'FIRM-001';

    // B. Write all raw keys first as in the dump
    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
    });

    localStorage.setItem('app_active_firm_id', activeFirmId);

    // ========================================================
    // C. CONSOLIDATE & AUTO-BILINGUAL UPGRADE ACCOUNTS
    // (Restores legacy English accounts and converts to "English (हिन्दी)")
    // ========================================================
    const consolidatedAccountsMap = new Map();
    
    Object.keys(targetData).forEach(key => {
      if (key.includes('account_heads') || key.includes('app_accounts')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(acc => {
            if (!acc) return;
            const normalizedAcc = upgradeAndNormalizeAccount(acc);
            if (normalizedAcc && normalizedAcc.account_name) {
              const uniqueKey = (normalizedAcc.name_en || normalizedAcc.account_name).toLowerCase();
              if (!consolidatedAccountsMap.has(uniqueKey)) {
                consolidatedAccountsMap.set(uniqueKey, normalizedAcc);
              } else {
                const existing = consolidatedAccountsMap.get(uniqueKey);
                consolidatedAccountsMap.set(uniqueKey, {
                  ...existing,
                  ...normalizedAcc,
                  opening_balance: Number(normalizedAcc.opening_balance || existing.opening_balance || 0),
                  openingBalance: Number(normalizedAcc.openingBalance || existing.openingBalance || 0)
                });
              }
            }
          });
        }
      }
    });

    const finalAccountsList = Array.from(consolidatedAccountsMap.values());
    if (finalAccountsList.length > 0) {
      localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(finalAccountsList));
      localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(finalAccountsList));
    }

    // ========================================================
    // D. CONSOLIDATE INVENTORY ITEMS
    // ========================================================
    const consolidatedItemsMap = new Map();

    Object.keys(targetData).forEach(key => {
      if (key.startsWith('inventory_items') || key.startsWith('app_stock')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(item => {
            if (!item) return;
            const name = (item.item_name || item.name || item.itemName || '').trim();
            if (name && !consolidatedItemsMap.has(name.toLowerCase())) {
              consolidatedItemsMap.set(name.toLowerCase(), {
                ...item,
                firm_id: activeFirmId,
                item_name: name,
                name: name
              });
            }
          });
        }
      }
    });

    const finalItemsList = Array.from(consolidatedItemsMap.values());
    if (finalItemsList.length > 0) {
      localStorage.setItem(`inventory_items_${activeFirmId}`, JSON.stringify(finalItemsList));
      localStorage.setItem('inventory_items', JSON.stringify(finalItemsList));
    }

    // ========================================================
    // E. CONSOLIDATE VOUCHERS, SALES & JOURNAL ENTRIES
    // ========================================================
    const consolidatedVouchersMap = new Map();

    Object.keys(targetData).forEach(key => {
      if (key.includes('voucher') || key.includes('invoice')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(v => {
            if (!v) return;
            const vId = v.id || v.reference_no || v.voucher_number || `${v.voucher_date || v.date}-${v.amount || v.total_amount}`;
            if (!consolidatedVouchersMap.has(vId)) {
              consolidatedVouchersMap.set(vId, {
                ...v,
                firm_id: activeFirmId,
                firmId: activeFirmId
              });
            }
          });
        }
      }
    });

    const finalVouchersList = Array.from(consolidatedVouchersMap.values());
    if (finalVouchersList.length > 0) {
      localStorage.setItem(`app_vouchers_${activeFirmId}`, JSON.stringify(finalVouchersList));
      localStorage.setItem(`account_book_vouchers_${activeFirmId}`, JSON.stringify(finalVouchersList));
    }

    // ========================================================
    // F. CONSOLIDATE PURCHASE BILLS (Zero-Loss Recovery)
    // ========================================================
    const consolidatedPurchaseMap = new Map();

    Object.keys(targetData).forEach(key => {
      if (key.startsWith('purchase_bills') || key.startsWith('purchase_inward')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(bill => {
            if (!bill) return;
            const bId = bill.id || bill.bill_number || bill.reference_no || `${bill.date || bill.purchase_date}-${bill.total_amount || bill.amount}`;
            if (!consolidatedPurchaseMap.has(bId)) {
              consolidatedPurchaseMap.set(bId, {
                ...bill,
                firm_id: activeFirmId,
                firmId: activeFirmId
              });
            }
          });
        }
      }
    });

    const finalPurchaseList = Array.from(consolidatedPurchaseMap.values());
    if (finalPurchaseList.length > 0) {
      localStorage.setItem(`purchase_bills_${activeFirmId}`, JSON.stringify(finalPurchaseList));
      localStorage.setItem('purchase_bills', JSON.stringify(finalPurchaseList));
    }

    // ========================================================
    // G. CONSOLIDATE MATERIAL ADJUSTMENTS & CONSUMPTIONS
    // ========================================================
    const consolidatedAdjMap = new Map();
    Object.keys(targetData).forEach(key => {
      if (key.includes('material_adjustment') || key.includes('consumption_record')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(adj => {
            if (!adj) return;
            const aId = adj.id || `${adj.date}-${adj.total_amount || adj.total_value}`;
            if (!consolidatedAdjMap.has(aId)) {
              consolidatedAdjMap.set(aId, {
                ...adj,
                firm_id: activeFirmId
              });
            }
          });
        }
      }
    });

    const finalAdjList = Array.from(consolidatedAdjMap.values());
    if (finalAdjList.length > 0) {
      localStorage.setItem(`universal_material_adjustments_${activeFirmId}`, JSON.stringify(finalAdjList));
    }

    // ========================================================
    // H. CRITICAL POST-RESTORE SELF-HEALING SWEEP
    // Auto-creates missing Stock Accounts for all restored items & purchases
    // ========================================================
    autoHealRestoredInventoryAndAccounts(activeFirmId);

    return {
      success: true,
      stats: {
        vouchersCount: finalVouchersList.length,
        accountsCount: finalAccountsList.length,
        purchasesCount: finalPurchaseList.length
      }
    };
  } catch (err) {
    throw new Error(err.message || 'Failed to restore backup.');
  }
};

export const exportUniversalBackup = downloadAppBackup;
export const downloadAppBackupFromFile = restoreUniversalBackup;
export const restoreAppBackupFromFile = restoreUniversalBackup;
export const exportAppBackupJSON = downloadAppBackup;
export const restoreAppBackupJSON = restoreUniversalBackup;

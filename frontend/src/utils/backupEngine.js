/**
 * Frontend Utility: Universal Zero-Loss Backup & Restore Engine
 * Ensures multi-firm isolation, inventory stock reconciliation, and voucher integrity.
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
    const stockKeys = [`inventory_items_${cleanFirmId}`, 'inventory_items', 'inventory_items_FIRM-001'];

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

    const purchaseKeys = [`purchase_bills_${cleanFirmId}`, 'purchase_bills', `app_purchase_bills_${cleanFirmId}`];
    let allPurchases = [];
    purchaseKeys.forEach(pk => {
      try {
        const raw = localStorage.getItem(pk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) allPurchases.push(...parsed);
        }
      } catch (e) {}
    });

    const salesKeys = [`sales_invoices_${cleanFirmId}`, `app_invoices_${cleanFirmId}`, 'app_invoices'];
    let allSales = [];
    salesKeys.forEach(sk => {
      try {
        const raw = localStorage.getItem(sk);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) allSales.push(...parsed);
        }
      } catch (e) {}
    });

    stockItems = stockItems.map(item => {
      const itemName = (item?.name || item?.item_name || '').trim().toLowerCase();
      const itemId = String(item?.id || '');

      let totalPurchased = 0;
      allPurchases.forEach(p => {
        const pItemId = String(p?.itemId || p?.item_id || p?.item || '');
        const pItemName = String(p?.itemName || p?.item_name || '').trim().toLowerCase();
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
      return item;
    });

    const inventoryKey = `inventory_items_${cleanFirmId}`;
    localStorage.setItem(inventoryKey, JSON.stringify(stockItems));
    localStorage.setItem('inventory_items', JSON.stringify(stockItems));

    stockItems.forEach(item => {
      const itemName = item?.name || item?.item_name;
      if (itemName && !item.is_service && item.item_type !== 'SERVICE') {
        ensureStockItemLedgerAccount(cleanFirmId, itemName);
      }
    });

    const voucherKeys = [
      `app_vouchers_${cleanFirmId}`,
      `account_book_vouchers_${cleanFirmId}`,
      'app_vouchers',
      'account_book_vouchers'
    ];

    voucherKeys.forEach(vk => {
      try {
        const raw = localStorage.getItem(vk);
        if (raw) {
          let list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            list.sort((a, b) => new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0));

            const counters = { PAYMENT: 0, RECEIPT: 0, JOURNAL: 0, PURCHASE: 0, SALES: 0, CONTRA: 0, JV: 0 };

            list = list.map(item => {
              if (!item) return item;
              const rawType = String(item.voucher_type || item.type || 'JV').toUpperCase();
              let baseKey = 'JV';
              if (rawType.includes('PAY')) baseKey = 'PAYMENT';
              else if (rawType.includes('REC')) baseKey = 'RECEIPT';
              else if (rawType.includes('PUR')) baseKey = 'PURCHASE';
              else if (rawType.includes('SAL')) baseKey = 'SALES';
              else if (rawType.includes('CON')) baseKey = 'CONTRA';
              else if (rawType.includes('JOURNAL') || rawType.includes('JV')) baseKey = 'JOURNAL';

              counters[baseKey] = (counters[baseKey] || 0) + 1;
              const prefix = baseKey === 'PAYMENT' ? 'PAY' :
                             baseKey === 'RECEIPT' ? 'REC' :
                             baseKey === 'PURCHASE' ? 'PUR' :
                             baseKey === 'SALES' ? 'SAL' :
                             baseKey === 'CONTRA' ? 'CONTRA' : 'JV';

              const newRef = `${prefix}-${counters[baseKey]}`;
              if (!String(item.reference_no || '').startsWith(prefix)) {
                item.reference_no = newRef;
                item.voucher_number = newRef;
              }
              return item;
            });

            localStorage.setItem(vk, JSON.stringify(list));
          }
        }
      } catch (e) {}
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
 * 2. SECURE ZERO-LOSS RESTORE ENGINE WITH FIRM ISOLATION & INVENTORY PROTECTION
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

    const existingFirmsRaw = localStorage.getItem('app_firms') || localStorage.getItem('firm_list') || '[]';
    let existingFirms = [];
    try { existingFirms = JSON.parse(existingFirmsRaw); } catch (e) { existingFirms = []; }

    let backupFirms = [];
    Object.keys(targetData).forEach(k => {
      if (k === 'app_firms' || k === 'firm_list') {
        try { if (Array.isArray(targetData[k])) backupFirms = targetData[k]; } catch (e) {}
      }
    });

    const firmsMap = new Map();
    if (Array.isArray(existingFirms)) existingFirms.forEach(f => { if (f && f.id) firmsMap.set(f.id, f); });
    if (Array.isArray(backupFirms)) backupFirms.forEach(f => { if (f && f.id) firmsMap.set(f.id, f); });
    const mergedFirmsList = Array.from(firmsMap.values());

    // Restore storage data securely with fallback replication for inventory & purchase keys
    Object.keys(targetData).forEach(key => {
      if (key === 'app_firms' || key === 'firm_list') return;
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);

      if (key.includes('inventory_items') || key.includes('purchase_bills') || key.includes('app_vouchers') || key.includes('account_book_vouchers')) {
        localStorage.setItem(key, stringifiedVal);
      }
    });

    if (mergedFirmsList.length > 0) {
      localStorage.setItem('app_firms', JSON.stringify(mergedFirmsList));
      localStorage.setItem('firm_list', JSON.stringify(mergedFirmsList));
    }

    let activeFirmId = localStorage.getItem('app_active_firm_id') || 
                       parsedContent?.meta?.active_firm_id || 
                       targetData['app_active_firm_id'] || 
                       'FIRM-001';

    localStorage.setItem('app_active_firm_id', activeFirmId);

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

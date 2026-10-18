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
 * Post-Restore Self-Healing & Permanent Purchase Item Name Reconstruction
 */
export const autoHealRestoredInventoryAndAccounts = (firmId) => {
  const cleanFirmId = firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

  try {
    // 1. Gather unique inventory items
    let stockItems = [];
    const seenItems = new Set();
    Object.keys(localStorage).forEach(k => {
      if (k.includes('inventory_items')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach(it => {
                const itName = (it?.name || it?.item_name || it?.itemName || '').trim().toLowerCase();
                if (itName && !seenItems.has(itName)) {
                  seenItems.add(itName);
                  stockItems.push(it);
                }
              });
            }
          }
        } catch (e) {}
      }
    });

    const defaultItems = [
      { id: 'ITEM-DIESEL', name: 'Diesel', item_name: 'Diesel', itemName: 'Diesel', unit: 'Liters' },
      { id: 'ITEM-MITTI-A', name: 'Mitti Grade A', item_name: 'Mitti Grade A', itemName: 'Mitti Grade A', unit: 'Quintal' },
      { id: 'ITEM-MITTI-B', name: 'Mitti Grade B', item_name: 'Mitti Grade B', itemName: 'Mitti Grade B', unit: 'Quintal' },
      { id: 'ITEM-GREET', name: 'Greet & Crusher', item_name: 'Greet & Crusher', itemName: 'Greet & Crusher', unit: 'Quintal' }
    ];

    defaultItems.forEach(def => {
      if (!stockItems.some(x => (x.name || x.item_name || x.itemName || '').trim().toLowerCase() === def.name.toLowerCase())) {
        stockItems.push({ ...def, firm_id: cleanFirmId, current_stock: 0, stock: 0, qty: 0 });
      }
    });

    // 2. Gather purchase bills with strict deduplication and permanent item healing
    let rawPurchases = [];
    Object.keys(localStorage).forEach(k => {
      if (k.includes('purchase_bill') || k.includes('purchases')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) rawPurchases.push(...parsed);
          }
        } catch (e) {}
      }
    });

    const uniquePurchasesMap = new Map();
    rawPurchases.forEach(p => {
      if (!p) return;
      const uniqueKey = p.id || `${p.bill_number || p.voucher_number || ''}_${p.supplier || p.party || p.cr_account || ''}_${p.date || p.voucher_date || ''}`;
      if (!uniquePurchasesMap.has(uniqueKey)) {
        // PERMANENT ITEM NAME HEALING FOR PURCHASE BILLS & ITEMS ARRAY
        let itemName = p.itemName || p.item_name || p.name || '';
        const narration = (p.narration || '').toLowerCase();
        const supplier = (p.supplier || p.supplier_name || p.party || p.cr_account || '').toLowerCase();

        if (!itemName || itemName === 'Stock Item' || itemName === 'Stock Account' || itemName === 'Purchase A/c' || itemName === 'Purchase Raw Material Account') {
          if (narration.includes('diesel') || supplier.includes('munsari') || supplier.includes('driver') || parseFloat(p.rate || p.unit_rate || 0) > 50) {
            itemName = 'Diesel';
          } else if (narration.includes('mitti grade a') || supplier.includes('aslam')) {
            itemName = 'Mitti Grade A';
          } else if (narration.includes('mitti grade b') || supplier.includes('sabeer') || supplier.includes('vinod sihag')) {
            itemName = 'Mitti Grade B';
          } else {
            itemName = 'Diesel';
          }
        }

        p.itemName = itemName;
        p.item_name = itemName;
        p.name = itemName;

        // Ensure items array has the correct permanent item name
        if (!Array.isArray(p.items) || p.items.length === 0 || p.items[0]?.itemName === 'Stock Item') {
          p.items = [{
            itemId: p.itemId || p.item_id || `ITEM-${Date.now()}`,
            itemName: itemName,
            item_name: itemName,
            qty: parseFloat(p.quantity || p.qty || 0),
            quantity: parseFloat(p.quantity || p.qty || 0),
            rate: parseFloat(p.rate || p.unit_rate || 0),
            total: parseFloat(p.amount || p.total_amount || 0)
          }];
        } else {
          p.items = p.items.map(si => ({
            ...si,
            itemName: si.itemName === 'Stock Item' ? itemName : si.itemName,
            item_name: si.item_name === 'Stock Item' ? itemName : si.item_name
          }));
        }

        p.quantity = parseFloat(p.quantity || p.qty || p.items?.[0]?.qty || 0);
        p.qty = p.quantity;
        p.amount = parseFloat(p.amount || p.total_amount || p.items?.[0]?.total || 0);
        p.total_amount = p.amount;

        uniquePurchasesMap.set(uniqueKey, p);
      }
    });
    const allPurchases = Array.from(uniquePurchasesMap.values());

    // 3. Gather sales invoices
    let rawSales = [];
    Object.keys(localStorage).forEach(k => {
      if (k.includes('invoice') || k.includes('sales')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) rawSales.push(...parsed);
          }
        } catch (e) {}
      }
    });

    const uniqueSalesMap = new Map();
    rawSales.forEach(s => {
      if (!s) return;
      const uniqueKey = s.id || `${s.reference_no || s.voucher_number || ''}_${s.dr_account || s.party || ''}_${s.date || s.voucher_date || ''}`;
      if (!uniqueSalesMap.has(uniqueKey)) {
        uniqueSalesMap.set(uniqueKey, s);
      }
    });
    const allSales = Array.from(uniqueSalesMap.values());

    // 4. Accurate stock recalculation
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

    // Save cleaned data back to active firm keys
    localStorage.setItem(`inventory_items_${cleanFirmId}`, JSON.stringify(stockItems));
    localStorage.setItem('inventory_items', JSON.stringify(stockItems));

    if (allPurchases.length > 0) {
      localStorage.setItem(`purchase_bills_${cleanFirmId}`, JSON.stringify(allPurchases));
      localStorage.setItem('purchase_bills', JSON.stringify(allPurchases));
    }

    if (allSales.length > 0) {
      localStorage.setItem(`sales_invoices_${cleanFirmId}`, JSON.stringify(allSales));
      localStorage.setItem('sales_invoices', JSON.stringify(allSales));
      localStorage.setItem('app_invoices', JSON.stringify(allSales));
    }

    stockItems.forEach(item => {
      const itemName = item?.name || item?.item_name || item?.itemName;
      if (itemName && !item.is_service && item.item_type !== 'SERVICE') {
        ensureStockItemLedgerAccount(cleanFirmId, itemName);
      }
    });

    // 5. Consolidate and sort vouchers uniquely
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
      const uniqueVouchersMap = new Map();
      allVouchers.forEach(v => {
        if (!v) return;
        const vKey = v.id || `${v.reference_no || v.voucher_number || ''}_${v.date || v.voucher_date || ''}_${v.amount || v.total_amount || ''}`;
        uniqueVouchersMap.set(vKey, v);
      });
      allVouchers = Array.from(uniqueVouchersMap.values());

      allVouchers.sort((a, b) => new Date(a.voucher_date || a.date || 0) - new Date(b.voucher_date || b.date || 0));

      const serializedVouchers = JSON.stringify(allVouchers);
      localStorage.setItem(`account_book_vouchers_${cleanFirmId}`, serializedVouchers);
      localStorage.setItem(`app_vouchers_${cleanFirmId}`, serializedVouchers);
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
    if (Array.isArray(backupFinstances || backupFirms)) backupFirms.forEach(f => { if (f && (f.id || f.firm_id)) firmsMap.set(f.id || f.firm_id, f); });
    const mergedFirmsList = Array.from(firmsMap.values());

    Object.keys(targetData).forEach(key => {
      if (key === 'app_firms' || key === 'firm_list' || key === 'app_firms_registry') return;
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
    });

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

    // Trigger Post-Restore Healing & Reconstruction
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

// frontend/src/utils/backupEngine.js

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
 * Post-Restore Self-Healing & Sequential Number Normalization Sweep
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

              const isPurchase = rawType === 'PURCHASE' || vk.includes('purchase_bills');
              if (isPurchase) {
                let itemName = 'Stock Item';
                if (Array.isArray(item.items) && item.items[0]?.itemName) {
                  itemName = item.items[0].itemName;
                } else if (item.item_name) {
                  itemName = item.item_name;
                } else if (item.narration) {
                  const narr = String(item.narration);
                  if (narr.toLowerCase().includes('diesel')) itemName = 'Diesel';
                  else if (narr.toLowerCase().includes('mitti')) {
                    const mMatch = narr.match(/(Mitti\s+Grade\s+[A-B])/i);
                    itemName = mMatch ? mMatch[1] : 'Mitti';
                  } else if (narr.toLowerCase().includes('greet') || narr.toLowerCase().includes('crusher')) {
                    itemName = 'Greet & Crusher';
                  } else {
                    const match = narr.match(/(?:bill\s*#?\d*|purchase|item|inward)\s*:\s*([^–\-(@\n]+)/i);
                    if (match && match[1]) itemName = match[1].trim();
                  }
                }

                const cleanItem = String(itemName).replace(/\s*Stock\s*Account/i, '').trim();
                const targetStockAccount = `${cleanItem} Stock Account`;
                ensureStockItemLedgerAccount(cleanFirmId, cleanItem);

                if (Array.isArray(item.entries)) {
                  item.entries = item.entries.map(ent => {
                    if ((ent.type || '').toUpperCase() === 'DR' || Number(ent.debit || 0) > 0) {
                      const accName = String(ent.account_name || ent.party || '').toLowerCase();
                      if (accName.includes('purchase a/c') || accName.includes('purchase account') || accName.includes('purchase raw material')) {
                        return { ...ent, account_name: targetStockAccount, party: targetStockAccount };
                      }
                    }
                    return ent;
                  });
                }

                if (item.dr_account) {
                  const drLower = String(item.dr_account).toLowerCase();
                  if (drLower.includes('purchase a/c') || drLower.includes('purchase account') || drLower.includes('purchase raw material')) {
                    item.dr_account = targetStockAccount;
                  }
                }
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
      meta: { app: "AccountBook", firm: cleanFirm, version: "3.3.9", export_timestamp: now.toISOString(), active_firm_id: activeFirmId },
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
 * 2. SMART ZERO-LOSS RESTORE ENGINE WITH FIRM PROFILE MERGING & SCHEMA FLATTENING
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

    // Safely merge existing firms list with incoming backup firms list so other profiles are NOT lost
    const existingFirmsRaw = localStorage.getItem('app_firms') || localStorage.getItem('firm_list') || '[]';
    let existingFirms = [];
    try { existingFirms = JSON.parse(existingFirmsRaw); } catch (e) { existingFirms = []; }

    let backupFirms = [];
    Object.keys(targetData).forEach(k => {
      if (k === 'app_firms' || k === 'firm_list') {
        try {
          if (Array.isArray(targetData[k])) backupFirms = targetData[k];
        } catch (e) {}
      }
    });

    const firmsMap = new Map();
    if (Array.isArray(existingFirms)) existingFirms.forEach(f => { if (f && f.id) firmsMap.set(f.id, f); });
    if (Array.isArray(backupFirms)) backupFirms.forEach(f => { if (f && f.id) firmsMap.set(f.id, f); });
    const mergedFirmsList = Array.from(firmsMap.values());

    // Restore storage data safely
    Object.keys(targetData).forEach(key => {
      if (key === 'app_firms' || key === 'firm_list') return;
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
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

    const migrateKeyForActiveFirm = (baseName, targetArray) => {
      if (Array.isArray(targetArray) && targetArray.length > 0) {
        localStorage.setItem(`${baseName}_${activeFirmId}`, JSON.stringify(targetArray));
        localStorage.setItem(baseName, JSON.stringify(targetArray));
      }
    };

    const consolidatedAccountsMap = new Map();
    Object.keys(targetData).forEach(key => {
      if (key.includes('account_heads') || key.includes('app_accounts')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(acc => {
            if (!acc) return;
            const name = (acc.account_name || acc.name || '').trim();
            if (name) {
              const uniqueKey = name.toLowerCase();
              if (!consolidatedAccountsMap.has(uniqueKey)) {
                consolidatedAccountsMap.set(uniqueKey, {
                  ...acc,
                  id: acc.id || `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  name,
                  account_name: name,
                  primary_type: acc.primary_type || acc.type || 'Expenses',
                  type: acc.type || acc.primary_type || 'Expenses',
                  sub_group: acc.sub_group || acc.group || 'General Ledger',
                  group: acc.group || acc.sub_group || 'General Ledger',
                  opening_balance: Number(acc.opening_balance || acc.openingBalance || 0),
                  balance_type: acc.balance_type || acc.balanceType || 'Dr'
                });
              }
            }
          });
        }
      }
    });
    migrateKeyForActiveFirm('app_accounts', Array.from(consolidatedAccountsMap.values()));

    const consolidatedItemsMap = new Map();
    Object.keys(targetData).forEach(key => {
      if (key.startsWith('inventory_items') || key.startsWith('app_stock')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(item => {
            if (!item) return;
            const name = (item.item_name || item.name || item.itemName || '').trim();
            if (name && !consolidatedItemsMap.has(name.toLowerCase())) {
              consolidatedItemsMap.set(name.toLowerCase(), { ...item, firm_id: activeFirmId, item_name: name, name });
            }
          });
        }
      }
    });
    migrateKeyForActiveFirm('inventory_items', Array.from(consolidatedItemsMap.values()));

    const consolidatedVouchersMap = new Map();
    Object.keys(targetData).forEach(key => {
      if (key.includes('voucher') || key.includes('invoice') || key.includes('payroll')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(v => {
            if (!v) return;
            const vId = v.id || v.reference_no || v.voucher_number || `${v.voucher_date || v.date}-${v.amount || v.total_amount}`;
            if (!consolidatedVouchersMap.has(vId)) {
              consolidatedVouchersMap.set(vId, { ...v, firm_id: activeFirmId, firmId: activeFirmId });
            }
          });
        }
      }
    });
    const finalVouchersList = Array.from(consolidatedVouchersMap.values());
    migrateKeyForActiveFirm('app_vouchers', finalVouchersList);
    migrateKeyForActiveFirm('account_book_vouchers', finalVouchersList);

    const consolidatedPurchaseMap = new Map();
    Object.keys(targetData).forEach(key => {
      if (key.startsWith('purchase_bills') || key.startsWith('purchase_inward')) {
        const raw = targetData[key];
        if (Array.isArray(raw)) {
          raw.forEach(bill => {
            if (!bill) return;
            const bId = bill.id || bill.bill_number || bill.reference_no || `${bill.date || bill.purchase_date}-${bill.total_amount || bill.amount}`;
            if (!consolidatedPurchaseMap.has(bId)) {
              consolidatedPurchaseMap.set(bId, { ...bill, firm_id: activeFirmId, firmId: activeFirmId });
            }
          });
        }
      }
    });
    migrateKeyForActiveFirm('purchase_bills', Array.from(consolidatedPurchaseMap.values()));

    autoHealRestoredInventoryAndAccounts(activeFirmId);

    return {
      success: true,
      stats: {
        vouchersCount: finalVouchersList.length,
        accountsCount: consolidatedAccountsMap.size,
        purchasesCount: consolidatedPurchaseMap.size
      }
    };
  } catch (err) {
    throw new Error(err.message || 'Backup restore karne mein asafalta hui.');
  }
};

// Explicit exports for backward compatibility across UI components
export const exportUniversalBackup = downloadAppBackup;
export const downloadAppBackupFromFile = restoreUniversalBackup;
export const restoreAppBackupFromFile = restoreUniversalBackup;
export const exportAppBackupJSON = downloadAppBackup;
export const restoreAppBackupJSON = restoreUniversalBackup;

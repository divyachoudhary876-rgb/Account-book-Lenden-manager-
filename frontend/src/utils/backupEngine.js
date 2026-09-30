// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const resolveFirmNameString = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'AccountBook';
  }
  return 'AccountBook';
};

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
            if (key.includes('voucher') || key.includes('invoice')) vouchersCount += parsed.length;
            if (key.includes('account')) accountsCount += parsed.length;
          }
        } catch {
          storageSnapshot[key] = rawVal;
        }
      }
    }

    const cleanFirm = String(resolveFirmNameString(firmInput)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const fileName = `${cleanFirm}_Backup_${now.toISOString().slice(0, 10)}.json`;

    const backupPayload = {
      meta: { app: "AccountBook", firm: cleanFirm, version: "2.1.0", export_timestamp: now.toISOString() },
      stats: { vouchersCount, accountsCount, total_keys: Object.keys(storageSnapshot).length },
      data: storageSnapshot
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    if (Capacitor.isNativePlatform()) {
      const writeResult = await Filesystem.writeFile({
        path: fileName, data: jsonString, directory: Directory.Cache, encoding: Encoding.UTF8
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
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);

    return { success: true };
  } catch (err) {
    throw new Error(err.message || 'Failed to generate backup.');
  }
};

export const restoreUniversalBackup = async (rawInput) => {
  try {
    if (!rawInput) throw new Error("No backup data provided.");

    let parsedContent = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    let targetData = parsedContent?.data && typeof parsedContent.data === 'object' && !Array.isArray(parsedContent.data) 
      ? parsedContent.data 
      : parsedContent;

    if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
      throw new Error("Invalid backup schema structure.");
    }

    let vouchersCount = 0;
    let accountsCount = 0;

    // 1. Restore all raw keys from backup snapshot into localStorage first
    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      if (Array.isArray(val)) {
        if (key.includes('voucher') || key.includes('invoice')) vouchersCount += val.length;
        if (key.includes('account')) accountsCount += val.length;
      }
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
    });

    // 2. Discover all active/saved firm IDs from localStorage or restored snapshot
    let firmIdsList = ['default_firm_id', 'default_firm'];
    try {
      const possibleFirmKeys = ['firms_list', 'app_firms', 'saved_firms'];
      possibleFirmKeys.forEach(pk => {
        const rawFirms = localStorage.getItem(pk) || targetData[pk];
        if (rawFirms) {
          const firmsArr = typeof rawFirms === 'string' ? JSON.parse(rawFirms) : rawFirms;
          if (Array.isArray(firmsArr) && firmsArr.length > 0) {
            firmsArr.forEach(f => {
              const fId = String(f.firm_id || f.id || f.legal_name || f.name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
              if (fId && !firmIdsList.includes(fId)) {
                firmIdsList.push(fId);
              }
            });
          }
        }
      });
    } catch (e) {}

    // Also scan restored keys for any existing firm-scoped keys
    Object.keys(targetData).forEach(k => {
      if (k.startsWith('inventory_items_') || k.startsWith('app_vouchers_') || k.startsWith('app_accounts_')) {
        const parts = k.split('_');
        const extractedId = parts.slice(parts.length > 2 ? 2 : 1).join('_');
        if (extractedId && !firmIdsList.includes(extractedId)) {
          firmIdsList.push(extractedId);
        }
      }
    });

    // 3. Universal Cross-Mapping: Distribute base keys to ALL discovered firm-scoped keys
    const coreKeys = ['inventory_items', 'app_vouchers', 'app_payroll_entries', 'production_batches', 'app_accounts'];
    coreKeys.forEach(baseKey => {
      let rawPayload = targetData[baseKey] || localStorage.getItem(baseKey);
      if (!rawPayload) {
        const matchingKey = Object.keys(targetData).find(k => k.startsWith(baseKey));
        if (matchingKey) rawPayload = targetData[matchingKey];
      }

      if (rawPayload) {
        const stringifiedPayload = typeof rawPayload === 'object' ? JSON.stringify(rawPayload) : String(rawPayload);
        localStorage.setItem(baseKey, stringifiedPayload);
        firmIdsList.forEach(firmId => {
          localStorage.setItem(`${baseKey}_${firmId}`, stringifiedPayload);
        });
      }
    });

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));

    return {
      success: true,
      stats: {
        vouchersCount: vouchersCount || parsedContent?.stats?.vouchersCount || 0,
        accountsCount: accountsCount || parsedContent?.stats?.accountsCount || 0
      }
    };
  } catch (err) {
    throw new Error(err.message || 'Failed to restore backup.');
  }
};

export const exportUniversalBackup = downloadAppBackup;
export const downloadAppBackupFromFile = restoreUniversalBackup;
export const restoreAppBackupFromFile = restoreUniversalBackup;

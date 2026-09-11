// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Safe Firm Name Resolver
 */
const resolveFirmNameString = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') {
    return firmInput.trim();
  }
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.legal_name || firmInput.trade_name || firmInput.name || firmInput.firm_name || 'AccountBook';
  }
  return 'AccountBook';
};

/**
 * 1. Export Universal Backup
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
            if (key.includes('voucher') || key.includes('invoice')) vouchersCount += parsed.length;
            if (key.includes('account')) accountsCount += parsed.length;
          }
        } catch {
          storageSnapshot[key] = rawVal;
        }
      }
    }

    const rawFirmName = resolveFirmNameString(firmInput);
    const cleanFirm = String(rawFirmName).replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `${cleanFirm}_Backup_${dateStr}_${timeStr}.json`;

    const backupPayload = {
      meta: {
        app: "AccountBook",
        firm: cleanFirm,
        version: "2.0.0",
        export_timestamp: now.toISOString()
      },
      stats: {
        vouchersCount,
        accountsCount,
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

      if (writeResult && writeResult.uri) {
        await Share.share({
          title: 'Account Book Backup',
          text: `Secure Backup File: ${fileName}`,
          url: writeResult.uri,
          dialogTitle: 'Save or Share Backup File'
        });
        return { success: true };
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.setAttribute("download", fileName);
    downloadAnchor.style.display = 'none';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(blobUrl);
    }, 1500);

    return { success: true };
  } catch (err) {
    console.error("Backup Export Error:", err);
    throw new Error(err.message || 'Failed to generate backup.');
  }
};

/**
 * 2. Universal Restore Engine (Supports File Text, Direct JSON Strings & Objects)
 */
export const restoreUniversalBackup = async (rawInput) => {
  try {
    if (!rawInput) {
      throw new Error("No backup data provided.");
    }

    let parsedContent;
    if (typeof rawInput === 'string') {
      try {
        parsedContent = JSON.parse(rawInput);
      } catch (e) {
        throw new Error("Invalid JSON format in backup file or text.");
      }
    } else if (typeof rawInput === 'object') {
      parsedContent = rawInput;
    } else {
      throw new Error("Unsupported backup input type.");
    }

    // Extract target data safely supporting wrapped data or flat storage
    let targetData = null;
    if (parsedContent?.data && typeof parsedContent.data === 'object' && !Array.isArray(parsedContent.data)) {
      targetData = parsedContent.data;
    } else if (typeof parsedContent === 'object') {
      targetData = parsedContent;
    }

    if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
      throw new Error("Invalid backup schema structure.");
    }

    let vouchersCount = 0;
    let accountsCount = 0;

    // Calculate counts for stats response to satisfy UI expectations safely
    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      if (Array.isArray(val)) {
        if (key.includes('voucher') || key.includes('invoice')) vouchersCount += val.length;
        if (key.includes('account')) accountsCount += val.length;
      }
    });

    // Migration Wrapper: Ensure all inventory items & vouchers have firm isolation tags
    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      if (Array.isArray(val)) {
        targetData[key] = val.map(item => {
          if (item && typeof item === 'object') {
            return {
              ...item,
              firm_id: item?.firm_id || targetData.app_active_firm_id || 'FIRM-001'
            };
          }
          return item;
        });
      }
    });

    // Inject items into localStorage
    Object.keys(targetData).forEach(key => {
      const val = targetData[key];
      const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      localStorage.setItem(key, stringifiedVal);
    });

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));

    // GUARANTEED STATS OBJECT TO PREVENT ANY 'reading stats' CRASH
    return {
      success: true,
      stats: {
        vouchersCount: vouchersCount || parsedContent?.stats?.vouchersCount || 0,
        accountsCount: accountsCount || parsedContent?.stats?.accountsCount || 0
      }
    };
  } catch (err) {
    console.error("Restore Engine Error:", err);
    throw new Error(err.message || 'Failed to restore backup.');
  }
};

// Universal Aliases
export const exportUniversalBackup = downloadAppBackup;

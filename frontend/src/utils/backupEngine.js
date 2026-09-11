// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const downloadAppBackup = async (firmInput = 'AccountBook') => {
  try {
    const storageSnapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const rawVal = localStorage.getItem(key);
        try {
          storageSnapshot[key] = JSON.parse(rawVal);
        } catch {
          storageSnapshot[key] = rawVal;
        }
      }
    }

    const backupPayload = {
      meta: { app: "AccountBook", version: "2.0.0", timestamp: new Date().toISOString() },
      stats: { total_keys: Object.keys(storageSnapshot).length },
      data: storageSnapshot
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const fileName = `AccountBook_Backup_${Date.now()}.json`;

    if (Capacitor.isNativePlatform()) {
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      if (writeResult?.uri) {
        await Share.share({ title: 'Backup', url: writeResult.uri });
        return { success: true, message: "Backup downloaded successfully!" };
      }
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);

    return { success: true, message: "Backup downloaded successfully!" };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

export const restoreAppBackupFromFile = (fileInput, callback) => {
  try {
    let file = fileInput;
    if (file?.target?.files?.[0]) file = file.target.files[0];

    if (!file) {
      if (callback) callback({ success: false, message: "No file selected." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawText = e.target.result;
        const parsed = JSON.parse(rawText);

        // 100% Safe Extraction (Handles both old flat JSON and new wrapped JSON)
        const targetData = parsed?.data || parsed;

        if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
          throw new Error("Invalid backup format.");
        }

        // Clear and Inject into localStorage
        Object.keys(targetData).forEach(key => {
          const val = targetData[key];
          localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        });

        window.dispatchEvent(new Event('app_storage_updated'));
        window.dispatchEvent(new Event('app_state_updated'));

        if (callback) callback({ success: true, message: "Backup restored successfully!" });
      } catch (err) {
        if (callback) callback({ success: false, message: `Restore Failed: ${err.message}` });
      }
    };
    reader.readAsText(file);
  } catch (err) {
    if (callback) callback({ success: false, message: `Error: ${err.message}` });
  }
};

export const exportUniversalBackup = downloadAppBackup;
export const restoreUniversalBackup = restoreAppBackupFromFile;

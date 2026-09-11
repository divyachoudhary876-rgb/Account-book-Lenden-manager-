// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * 1. Export all application storage data as a structured JSON backup file with Unique Timestamp
 */
export const downloadAppBackup = async (firmName = 'Neelkanth_Groups') => {
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

    const cleanFirm = String(firmName).replace(/[^a-zA-Z0-9_-]/g, '_');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    // Add exact hours, minutes, and seconds so today's multiple backups never overwrite each other
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `${cleanFirm}_Backup_${dateStr}_${timeStr}.json`;

    const backupPayload = {
      meta: {
        app: "AccountBook",
        firm: cleanFirm,
        version: "1.0.6",
        export_timestamp: now.toISOString()
      },
      data: storageSnapshot
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    // 1. Mobile Capacitor Native Environment (Android/iOS)
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
        return { success: true, message: "Backup generated and ready to save!" };
      }
    }

    // 2. Standard Web Browser Download via Blob
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

    return { success: true, message: "Backup downloaded successfully!" };
  } catch (err) {
    console.error("Backup Export Error:", err);
    return { success: false, message: err.message };
  }
};

/**
 * 2. Read uploaded backup file and restore into localStorage with validation
 */
export const restoreAppBackupFromFile = (file, callback) => {
  if (!file) {
    if (callback) callback({ success: false, message: "No backup file provided." });
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const fileContent = JSON.parse(event.target.result);
      
      const targetData = fileContent.data && typeof fileContent.data === 'object' 
        ? fileContent.data 
        : fileContent;

      if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
        throw new Error("Invalid backup schema structure.");
      }

      Object.keys(targetData).forEach(key => {
        const val = targetData[key];
        const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        localStorage.setItem(key, stringifiedVal);
      });

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      if (callback) callback({ success: true, message: "Backup restored successfully!" });
    } catch (err) {
      console.error("Restore Parsing Failed:", err);
      if (callback) callback({ success: false, message: `Restore Failed: ${err.message}` });
    }
  };

  reader.onerror = () => {
    if (callback) callback({ success: false, message: "Failed to read file stream." });
  };

  reader.readAsText(file);
};

// Universal Aliases
export const exportUniversalBackup = downloadAppBackup;
export const restoreUniversalBackup = restoreAppBackupFromFile;

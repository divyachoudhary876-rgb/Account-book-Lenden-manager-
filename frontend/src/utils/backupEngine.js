// frontend/src/utils/backupEngine.js

/**
 * Export all application storage data as a structured JSON backup file
 */
export const downloadAppBackup = () => {
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
      meta: {
        app: "AccountBook",
        version: "1.0.4",
        export_timestamp: new Date().toISOString()
      },
      data: storageSnapshot
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AccountBook_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    return { success: true, message: "Backup downloaded successfully!" };
  } catch (err) {
    console.error("Backup Export Error:", err);
    return { success: false, message: err.message };
  }
};

/**
 * Read uploaded backup file and restore into localStorage with validation
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
      
      // Support both wrapped backup payloads and raw key-value objects
      const targetData = fileContent.data && typeof fileContent.data === 'object' 
        ? fileContent.data 
        : fileContent;

      if (!targetData || typeof targetData !== 'object' || Array.isArray(targetData)) {
        throw new Error("Invalid backup schema structure.");
      }

      // Persist restored records into localStorage
      Object.keys(targetData).forEach(key => {
        const val = targetData[key];
        const stringifiedVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        localStorage.setItem(key, stringifiedVal);
      });

      // Dispatch global sync events so all active views update instantly
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

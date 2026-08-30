// frontend/src/utils/backupEngine.js

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const generateFullSystemBackup = () => {
  const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
  const firmId = activeFirm.id || 'FIRM-001';

  const backupData = {
    backup_metadata: {
      version: '1.0.2',
      timestamp: new Date().toISOString(),
      active_firm_id: firmId,
      firm_name: activeFirm.legal_name || 'Business Entity'
    },
    firms_registry: JSON.parse(localStorage.getItem('app_all_firms_registry') || '[]'),
    account_heads: JSON.parse(localStorage.getItem(`app_account_heads_${firmId}`) || '[]'),
    inventory: JSON.parse(localStorage.getItem(`app_inventory_${firmId}`) || '[]'),
    journal_entries: JSON.parse(localStorage.getItem(`app_journal_entries_${firmId}`) || '[]')
  };

  return JSON.stringify(backupData, null, 2);
};

export const exportBackupToDeviceStorage = async () => {
  const jsonContent = generateFullSystemBackup();
  const fileName = `AccountBook_Backup_${Date.now()}.json`;

  try {
    // 1. Try Native Android External Documents Storage (Survives Uninstall)
    await Filesystem.writeFile({
      path: `AccountBook_Backups/${fileName}`,
      data: jsonContent,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true
    });
    return { success: true, native: true, message: `Backup saved safely to Documents/AccountBook_Backups/${fileName}` };
  } catch (err) {
    // 2. Web Fallback Browser Blob Download
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, native: false, message: `Backup file downloaded: ${fileName}` };
  }
};

export const restoreSystemFromBackupJSON = (jsonString) => {
  const data = JSON.parse(jsonString);
  if (!data.backup_metadata || !data.backup_metadata.active_firm_id) {
    throw new Error("Invalid backup file format.");
  }

  const firmId = data.backup_metadata.active_firm_id;
  if (data.firms_registry) localStorage.setItem('app_all_firms_registry', JSON.stringify(data.firms_registry));
  if (data.account_heads) localStorage.setItem(`app_account_heads_${firmId}`, JSON.stringify(data.account_heads));
  if (data.inventory) localStorage.setItem(`app_inventory_${firmId}`, JSON.stringify(data.inventory));
  if (data.journal_entries) localStorage.setItem(`app_journal_entries_${firmId}`, JSON.stringify(data.journal_entries));

  window.dispatchEvent(new Event('storage'));
  return true;
};

// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportFirmDataBackup = async (firm, rawBackupData) => {
  const firmName = firm?.legal_name || firm?.trade_name || 'Neelkanth_Int_Udyog';
  const cleanName = String(firmName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Accounting_Backup_${cleanName}_${Date.now()}.json`;
  const jsonString = JSON.stringify(rawBackupData, null, 2);

  let savedPath = 'Downloads / Internal Storage';

  // 1. Try Capacitor Native Filesystem (Saves to Documents/Cache and opens Share Sheet)
  try {
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: jsonString,
      directory: Directory.Documents, // Saves to public Documents directory on Android/iOS
      encoding: Encoding.UTF8
    });

    if (writeResult && writeResult.uri) {
      // Immediately open Share Sheet so user can save to "Downloads", send via WhatsApp, or Drive
      await Share.share({
        title: 'Firm Accounting Backup',
        text: `Backup file for ${firmName}`,
        url: writeResult.uri,
        dialogTitle: 'Save or Share Backup File'
      });
      return { success: true, method: 'native', path: 'Documents folder / Share Sheet' };
    }
  } catch (nativeErr) {
    console.warn('Native filesystem backup fallback to web blob:', nativeErr);
  }

  // 2. Standard Web Browser Blob Download Fallback
  try {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);

    return { success: true, method: 'blob', path: 'Browser Downloads folder' };
  } catch (blobErr) {
    throw new Error('Backup export failed entirely: ' + blobErr.message);
  }
};

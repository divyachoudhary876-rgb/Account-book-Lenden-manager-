// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * 1. EXPORT FIRM BACKUP (Primary & Alias)
 */
export const exportFirmDataBackup = async (firm, rawBackupData) => {
  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth_Int_Udyog');
  const cleanName = String(firmName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Accounting_Backup_${cleanName}_${Date.now()}.json`;
  
  const payload = {
    backup_metadata: {
      firm_id: firm?.id || 'FIRM_DEFAULT',
      firm_name: firmName,
      export_timestamp: new Date().toISOString(),
      schema_version: '2.0'
    },
    ...rawBackupData
  };

  const jsonString = JSON.stringify(payload, null, 2);

  // Strategy 1: Capacitor Native Filesystem & Share Sheet
  try {
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: jsonString,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    if (writeResult && writeResult.uri) {
      await Share.share({
        title: 'Firm Accounting Backup',
        text: `Secure backup file for ${firmName}. Save it to your Downloads or Google Drive.`,
        url: writeResult.uri,
        dialogTitle: 'Save or Share Backup File'
      });
      return { success: true, destination: 'Device Documents / Downloads via Share Sheet' };
    }
  } catch (nativeErr) {
    console.warn('Native filesystem share skipped, falling back to web download:', nativeErr);
  }

  // Strategy 2: Standard Web Browser Blob Download Fallback
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

    return { success: true, destination: 'Browser Downloads Folder' };
  } catch (blobErr) {
    throw new Error('Backup export failed: ' + blobErr.message);
  }
};

// Export alias matching SecurityBackupSettings.jsx expectation
export const exportUniversalBackup = exportFirmDataBackup;

/**
 * 2. IMPORT / RESTORE FIRM BACKUP (Primary & Alias)
 */
export const restoreFirmDataBackup = async (jsonFileText) => {
  try {
    const parsedData = JSON.parse(jsonFileText);

    if (!parsedData.backup_metadata || !parsedData.backup_metadata.schema_version) {
      throw new Error('Invalid backup file format: Missing metadata headers.');
    }

    if (Array.isArray(parsedData.accounts)) {
      localStorage.setItem('ledger_accounts', JSON.stringify(parsedData.accounts));
    }
    if (Array.isArray(parsedData.vouchers)) {
      localStorage.setItem('account_book_vouchers', JSON.stringify(parsedData.vouchers));
    }
    if (Array.isArray(parsedData.inventory)) {
      localStorage.setItem('inventory_items', JSON.stringify(parsedData.inventory));
    }
    if (Array.isArray(parsedData.consumptions)) {
      localStorage.setItem('material_consumptions', JSON.stringify(parsedData.consumptions));
    }

    return {
      success: true,
      firmName: parsedData.backup_metadata.firm_name,
      timestamp: parsedData.backup_metadata.export_timestamp
    };
  } catch (err) {
    throw new Error('Restore failed: ' + (err.message || 'Malformed JSON content'));
  }
};

// Export alias matching SecurityBackupSettings.jsx expectation
export const restoreUniversalBackup = restoreFirmDataBackup;

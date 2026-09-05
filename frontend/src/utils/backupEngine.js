// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * 1. EXPORT FIRM BACKUP
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
    accounts: rawBackupData.accounts || JSON.parse(localStorage.getItem('ledger_accounts') || '[]'),
    vouchers: rawBackupData.vouchers || JSON.parse(localStorage.getItem('account_book_vouchers') || '[]'),
    inventory: rawBackupData.inventory || JSON.parse(localStorage.getItem('inventory_items') || '[]'),
    consumptions: rawBackupData.consumptions || JSON.parse(localStorage.getItem('material_consumptions') || '[]')
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

export const exportUniversalBackup = exportFirmDataBackup;

/**
 * 2. IMPORT / RESTORE FIRM BACKUP WITH DEEP VALIDATION
 */
export const restoreFirmDataBackup = async (jsonFileText) => {
  try {
    if (!jsonFileText || typeof jsonFileText !== 'string') {
      throw new Error('Backup file text is empty or unreadable.');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonFileText);
    } catch (parseErr) {
      throw new Error('Invalid JSON syntax: Please ensure you selected a valid .json backup file.');
    }

    // Structural validation check
    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Invalid backup structure: Root must be a JSON object.');
    }

    // Flexible metadata check (supports both v1 and v2 backups)
    const metadata = parsedData.backup_metadata || parsedData.metadata || {};
    
    // Extract datasets safely with fallbacks
    const accounts = parsedData.accounts || parsedData.ledger_accounts || [];
    const vouchers = parsedData.vouchers || parsedData.account_book_vouchers || parsedData.transactions || [];
    const inventory = parsedData.inventory || parsedData.inventory_items || [];
    const consumptions = parsedData.consumptions || parsedData.material_consumptions || [];

    // Ensure at least some transaction data exists
    if (!Array.isArray(vouchers) && !Array.isArray(accounts)) {
      throw new Error('Backup validation failed: No valid ledger accounts or vouchers found in file.');
    }

    // Commit safely to LocalStorage
    localStorage.setItem('ledger_accounts', JSON.stringify(accounts));
    localStorage.setItem('account_book_vouchers', JSON.stringify(vouchers));
    localStorage.setItem('inventory_items', JSON.stringify(inventory));
    localStorage.setItem('material_consumptions', JSON.stringify(consumptions));

    return {
      success: true,
      firmName: metadata.firm_name || 'Restored Firm',
      timestamp: metadata.export_timestamp || new Date().toISOString(),
      stats: {
        accountsCount: accounts.length,
        vouchersCount: vouchers.length,
        inventoryCount: inventory.length,
        consumptionsCount: consumptions.length
      }
    };
  } catch (err) {
    console.error('Restore execution error:', err);
    throw new Error(err.message || 'Restore failed to complete due to an unknown error.');
  }
};

export const restoreUniversalBackup = restoreFirmDataBackup;

// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * 1. EXPORT UNIVERSAL FIRM BACKUP
 */
export const exportFirmDataBackup = async (firm, rawBackupData = {}) => {
  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth_Int_Udyog');
  const cleanName = String(firmName).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `AccountBook_Backup_${cleanName}_${Date.now()}.json`;
  
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
        text: `Secure backup file for ${firmName}.`,
        url: writeResult.uri,
        dialogTitle: 'Save or Share Backup File'
      });
      return { success: true, destination: 'Documents folder / Share Sheet' };
    }
  } catch (nativeErr) {
    console.warn('Native backup export fallback to web blob:', nativeErr);
  }

  // Strategy 2: Web Browser Blob Download Fallback
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
 * 2. ULTRA-RESILIENT RESTORE ENGINE (Polyglot Parser)
 * Accepts any historical or current backup JSON file structure.
 */
export const restoreFirmDataBackup = async (jsonFileText) => {
  try {
    if (!jsonFileText || typeof jsonFileText !== 'string' || jsonFileText.trim() === '') {
      throw new Error('Backup file is empty or unreadable.');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonFileText);
    } catch (parseErr) {
      throw new Error('Invalid JSON syntax: The selected file is corrupted or not a valid JSON document.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup format: Root content must be a JSON object.');
    }

    // Flexible extraction supporting all historical keys and flat arrays
    const accounts = parsed.accounts || parsed.ledger_accounts || parsed.chart_of_accounts || [];
    const vouchers = parsed.vouchers || parsed.account_book_vouchers || parsed.transactions || parsed.daybook_entries || parsed.daybook || [];
    const inventory = parsed.inventory || parsed.inventory_items || parsed.stock || [];
    const consumptions = parsed.consumptions || parsed.material_consumptions || parsed.fuel_consumptions || [];

    // If data is passed as a flat array of transactions
    let finalVouchers = vouchers;
    if (Array.isArray(parsed) && parsed.length > 0) {
      finalVouchers = parsed;
    }

    if (!Array.isArray(accounts) && !Array.isArray(finalVouchers) && !Array.isArray(inventory)) {
      throw new Error('No valid financial accounts, vouchers, or inventory records found in this backup file.');
    }

    // Commit cleanly to LocalStorage
    if (Array.isArray(accounts)) {
      localStorage.setItem('ledger_accounts', JSON.stringify(accounts));
    }
    if (Array.isArray(finalVouchers)) {
      localStorage.setItem('account_book_vouchers', JSON.stringify(finalVouchers));
    }
    if (Array.isArray(inventory)) {
      localStorage.setItem('inventory_items', JSON.stringify(inventory));
    }
    if (Array.isArray(consumptions)) {
      localStorage.setItem('material_consumptions', JSON.stringify(consumptions));
    }

    return {
      success: true,
      firmName: parsed.backup_metadata?.firm_name || parsed.firm?.legal_name || 'Restored Firm',
      stats: {
        accounts: Array.isArray(accounts) ? accounts.length : 0,
        vouchers: Array.isArray(finalVouchers) ? finalVouchers.length : 0,
        inventory: Array.isArray(inventory) ? inventory.length : 0,
        consumptions: Array.isArray(consumptions) ? consumptions.length : 0
      }
    };
  } catch (err) {
    console.error('Polyglot Restore Error:', err);
    throw new Error(err.message || 'Restore failed to complete.');
  }
};

export const restoreUniversalBackup = restoreFirmDataBackup;

// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportFirmDataBackup = async (firm, rawBackupData) => {
  const firmName = firm?.legal_name || firm?.trade_name || 'Neelkanth_Int_Udyog';
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
        text: `Secure backup for ${firmName}`,
        url: writeResult.uri,
        dialogTitle: 'Save Backup'
      });
      return { success: true };
    }
  } catch (e) {}

  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { success: true };
};

export const exportUniversalBackup = exportFirmDataBackup;

/**
 * ULTRA-RESILIENT RESTORE ENGINE (Handles all legacy JSON formats)
 */
export const restoreFirmDataBackup = async (jsonFileText) => {
  try {
    if (!jsonFileText) throw new Error('Backup file is empty.');
    let parsed;
    try {
      parsed = JSON.parse(jsonFileText);
    } catch (err) {
      throw new Error('Invalid JSON file format.');
    }

    // Extract data intelligently regardless of structure
    const accounts = parsed.accounts || parsed.ledger_accounts || parsed.chart_of_accounts || [];
    const vouchers = parsed.vouchers || parsed.account_book_vouchers || parsed.transactions || parsed.daybook || [];
    const inventory = parsed.inventory || parsed.inventory_items || parsed.stock || [];
    const consumptions = parsed.consumptions || parsed.material_consumptions || [];

    if (!Array.isArray(accounts) && !Array.isArray(vouchers) && !Array.isArray(inventory)) {
      throw new Error('No valid financial records detected in backup file.');
    }

    // Persist to localStorage safely
    if (accounts.length > 0) localStorage.setItem('ledger_accounts', JSON.stringify(accounts));
    if (vouchers.length > 0) localStorage.setItem('account_book_vouchers', JSON.stringify(vouchers));
    if (inventory.length > 0) localStorage.setItem('inventory_items', JSON.stringify(inventory));
    if (consumptions.length > 0) localStorage.setItem('material_consumptions', JSON.stringify(consumptions));

    return {
      success: true,
      firmName: parsed.backup_metadata?.firm_name || parsed.firm?.name || 'Restored Firm',
      stats: { accounts: accounts.length, vouchers: vouchers.length, inventory: inventory.length }
    };
  } catch (err) {
    throw new Error(err.message || 'Restore processing failed.');
  }
};

export const restoreUniversalBackup = restoreFirmDataBackup;

// frontend/src/utils/backupEngine.js
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportFirmDataBackup = async (firm, rawBackupData = {}) => {
  const firmName = firm?.legal_name || firm?.trade_name || (typeof firm === 'string' ? firm : 'Neelkanth Int Udyog');
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

  try {
    const writeResult = await Filesystem.writeFile({
      path: fileName,
      data: jsonString,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    if (writeResult && writeResult.uri) {
      await Share.share({ title: 'Backup File', url: writeResult.uri });
      return { success: true };
    }
  } catch (err) {
    console.warn('Native export failed, falling back to Web Blob:', err);
  }

  try {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1500);
    return { success: true };
  } catch (err) {
    throw new Error('Backup export failed: ' + err.message);
  }
};

export const exportUniversalBackup = exportFirmDataBackup;

export const restoreFirmDataBackup = async (jsonFileText) => {
  try {
    if (!jsonFileText || typeof jsonFileText !== 'string' || jsonFileText.trim() === '') {
      throw new Error('File is completely empty or unreadable.');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonFileText);
    } catch (parseErr) {
      throw new Error('File format error. Ensure you selected a valid .JSON backup file.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup structure.');
    }

    // Polyglot extraction
    const accounts = parsed.accounts || parsed.ledger_accounts || [];
    const vouchers = parsed.vouchers || parsed.account_book_vouchers || parsed.transactions || [];
    const inventory = parsed.inventory || parsed.inventory_items || [];
    const consumptions = parsed.consumptions || parsed.material_consumptions || [];

    // Force arrays
    const validAccounts = Array.isArray(accounts) ? accounts : [];
    const validVouchers = Array.isArray(vouchers) ? vouchers : [];
    const validInventory = Array.isArray(inventory) ? inventory : [];
    const validConsumptions = Array.isArray(consumptions) ? consumptions : [];

    if (validAccounts.length === 0 && validVouchers.length === 0 && validInventory.length === 0) {
      throw new Error('No financial records found in this backup file.');
    }

    if (validAccounts.length > 0) localStorage.setItem('ledger_accounts', JSON.stringify(validAccounts));
    if (validVouchers.length > 0) localStorage.setItem('account_book_vouchers', JSON.stringify(validVouchers));
    if (validInventory.length > 0) localStorage.setItem('inventory_items', JSON.stringify(validInventory));
    if (validConsumptions.length > 0) localStorage.setItem('material_consumptions', JSON.stringify(validConsumptions));

    window.dispatchEvent(new CustomEvent('app_storage_updated'));

    return {
      success: true,
      firmName: parsed.backup_metadata?.firm_name || parsed.firm?.legal_name || 'Restored Firm',
      stats: {
        accountsCount: validAccounts.length,
        vouchersCount: validVouchers.length
      }
    };
  } catch (err) {
    throw new Error(err.message || 'Unknown restore error occurred.');
  }
};

export const restoreUniversalBackup = restoreFirmDataBackup;

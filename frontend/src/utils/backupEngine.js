// frontend/src/utils/backupEngine.js
export const restoreFirmDataBackup = async (jsonFileText) => {
  try {
    if (!jsonFileText || typeof jsonFileText !== 'string' || jsonFileText.trim() === '') {
      throw new Error('Backup file text is empty or unreadable.');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonFileText);
    } catch (parseErr) {
      throw new Error('Invalid JSON syntax: Please select a valid .json backup file.');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup structure: Root must be a JSON object.');
    }

    const accounts = parsed.accounts || parsed.ledger_accounts || parsed.chart_of_accounts || [];
    const vouchers = parsed.vouchers || parsed.account_book_vouchers || parsed.transactions || parsed.daybook || [];
    const inventory = parsed.inventory || parsed.inventory_items || parsed.stock || [];
    const consumptions = parsed.consumptions || parsed.material_consumptions || [];

    if (!Array.isArray(accounts) && !Array.isArray(vouchers) && !Array.isArray(inventory)) {
      throw new Error('Backup validation failed: No valid financial records found in file.');
    }

    if (Array.isArray(accounts) && accounts.length > 0) {
      localStorage.setItem('ledger_accounts', JSON.stringify(accounts));
    }
    if (Array.isArray(vouchers) && vouchers.length > 0) {
      localStorage.setItem('account_book_vouchers', JSON.stringify(vouchers));
    }
    if (Array.isArray(inventory) && inventory.length > 0) {
      localStorage.setItem('inventory_items', JSON.stringify(inventory));
    }
    if (Array.isArray(consumptions) && consumptions.length > 0) {
      localStorage.setItem('material_consumptions', JSON.stringify(consumptions));
    }

    window.dispatchEvent(new CustomEvent('app_storage_updated'));

    return {
      success: true,
      firmName: parsed.backup_metadata?.firm_name || parsed.firm?.legal_name || 'Restored Firm',
      stats: {
        accountsCount: accounts.length,
        vouchersCount: vouchers.length,
        inventoryCount: inventory.length,
        consumptionsCount: consumptions.length
      }
    };
  } catch (err) {
    console.error('Restore execution error:', err);
    throw new Error(err.message || 'Restore failed to complete.');
  }
};

export const restoreUniversalBackup = restoreFirmDataBackup;

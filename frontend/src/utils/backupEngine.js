// frontend/src/utils/backupEngine.js

/**
 * Universal JSON Backup Exporter
 * Exports the complete Chart of Accounts, Vouchers, Inventory, and Settings
 */
export const exportUniversalBackup = (firmId = 'FIRM-001', firmName = 'Firm') => {
  const backupPayload = {
    version: '2.0.0',
    export_timestamp: new Date().toISOString(),
    firm_id: firmId,
    firm_name: firmName,
    data: {}
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes(firmId) || key.startsWith('app_firms') || key.startsWith('app_active_firm') || key.startsWith('app_payroll_'))) {
      try {
        backupPayload.data[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        backupPayload.data[key] = localStorage.getItem(key);
      }
    }
  }

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const sanitizedFirmName = (firmName || 'Firm').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStamp = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `AccountBook_Backup_${sanitizedFirmName}_${dateStamp}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, timestamp: backupPayload.export_timestamp };
};

/**
 * Universal JSON Backup Restorer
 * Self-healing parser for previous schema versions and voucher formats
 */
export const restoreUniversalBackup = (jsonString) => {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    const rawData = parsed.data || parsed.payload || parsed;

    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid backup archive. No valid data records detected.');
    }

    // Write all stored keys back into localStorage
    Object.keys(rawData).forEach((key) => {
      const value = rawData[key];
      if (typeof value === 'object' && value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value || '');
      }
    });

    // Schema Self-Healing: Guarantee modern voucher keys and IDs
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('app_vouchers_')) {
        const vchs = JSON.parse(localStorage.getItem(key) || '[]');
        let modified = false;

        vchs.forEach((v, idx) => {
          if (!v.id) {
            v.id = `VCH-${Date.now()}-${idx}`;
            modified = true;
          }
          if (!v.entries || !Array.isArray(v.entries) || v.entries.length === 0) {
            v.entries = [
              { type: 'Dr', account_name: v.dr_account || v.dr_party || 'General Expense', amount: parseFloat(v.amount || 0) },
              { type: 'Cr', account_name: v.cr_account || v.cr_party || 'Cash in Hand (रोकड़)', amount: parseFloat(v.amount || 0) }
            ];
            modified = true;
          }
        });

        if (modified) {
          localStorage.setItem(key, JSON.stringify(vchs));
        }
      }
    }

    // Trigger state reactivity across all open views
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('stock_updated'));

    return { 
      success: true, 
      message: '✓ Backup restored successfully. All ledger accounts, daybooks, and stock records are live.' 
    };
  } catch (err) {
    throw new Error(`Backup restoration failed: ${err.message}`);
  }
};

// Backwards-compatibility aliases
export const downloadSystemBackupJSON = exportUniversalBackup;
export const restoreSystemBackupJSON = restoreUniversalBackup;

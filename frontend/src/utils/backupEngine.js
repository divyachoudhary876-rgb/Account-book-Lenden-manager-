// frontend/src/utils/backupEngine.js

/**
 * Universal JSON Backup Exporter
 */
export const exportUniversalBackup = (firmId = 'FIRM-001', firmName = 'Firm') => {
  const backupPayload = {
    version: '2.5.0',
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
 * Universal JSON Backup Restorer (Self-Healing Schema Migration)
 */
export const restoreUniversalBackup = (jsonString) => {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    const rawData = parsed.data || parsed.payload || parsed;

    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid backup file. No data section found.');
    }

    Object.keys(rawData).forEach((key) => {
      const value = rawData[key];
      if (typeof value === 'object' && value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value || '');
      }
    });

    // Self-healing migration for existing vouchers
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('app_vouchers_')) {
        const vchs = JSON.parse(localStorage.getItem(key) || '[]');
        let changed = false;

        vchs.forEach((v, idx) => {
          if (!v.id) {
            v.id = `VCH-MIGRATED-${Date.now()}-${idx}`;
            changed = true;
          }
          if (!v.entries || !Array.isArray(v.entries) || v.entries.length === 0) {
            v.entries = [
              { type: 'Dr', account_name: v.dr_account || v.dr_party || 'General Expense', amount: parseFloat(v.amount || 0) },
              { type: 'Cr', account_name: v.cr_account || v.cr_party || 'Cash in Hand (रोकड़)', amount: parseFloat(v.amount || 0) }
            ];
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem(key, JSON.stringify(vchs));
        }
      }
    }

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('stock_updated'));

    return { 
      success: true, 
      message: '✓ Backup successfully restored. All ledgers, stock, and entries are synchronized.' 
    };
  } catch (err) {
    throw new Error(`Restoration failed: ${err.message}`);
  }
};

// Backwards-compatibility aliases
export const downloadSystemBackupJSON = exportUniversalBackup;
export const restoreSystemBackupJSON = restoreUniversalBackup;

// frontend/src/utils/backupEngine.js

/**
 * Download complete firm snapshot as JSON file
 */
export const downloadSystemBackupJSON = (firmId = 'FIRM-001', firmName = 'Firm') => {
  const backupPayload = {
    app_version: '2.0.0',
    export_date: new Date().toISOString(),
    firm_id: firmId,
    firm_name: firmName,
    data: {}
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes(firmId) || key.startsWith('app_firms') || key.startsWith('app_active_firm'))) {
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
  link.href = url;
  link.download = `Backup_${firmName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true };
};

/**
 * Universal Backup Restorer (Self-healing for backward compatibility)
 */
export const restoreSystemBackupJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    const dataObj = parsed.data || parsed.payload || parsed;

    if (!dataObj || typeof dataObj !== 'object') {
      throw new Error('⚠️ Invalid backup file format.');
    }

    // Direct key-value restore
    Object.keys(dataObj).forEach(key => {
      const val = dataObj[key];
      if (typeof val === 'object') {
        localStorage.setItem(key, JSON.stringify(val));
      } else {
        localStorage.setItem(key, val);
      }
    });

    // Self-Healing Voucher Check
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('app_vouchers_')) {
        const vchs = JSON.parse(localStorage.getItem(key) || '[]');
        let modified = false;
        vchs.forEach((v, idx) => {
          if (!v.id) {
            v.id = `VCH-RESTORED-${Date.now()}-${idx}`;
            modified = true;
          }
          if (!v.entries) {
            v.entries = [
              { type: 'Dr', account_name: v.dr_account || v.dr_party, amount: parseFloat(v.amount || 0) },
              { type: 'Cr', account_name: v.cr_account || v.cr_party, amount: parseFloat(v.amount || 0) }
            ];
            modified = true;
          }
        });
        if (modified) {
          localStorage.setItem(key, JSON.stringify(vchs));
        }
      }
    }

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('stock_updated'));

    return { success: true, message: '✓ Backup successfully restored! Sabhi khate aur vouchers active hain.' };
  } catch (err) {
    throw new Error(`Restore failed: ${err.message}`);
  }
};

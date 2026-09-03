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
    if (key && (
      key.includes(firmId) || 
      key.startsWith('app_firms') || 
      key.startsWith('app_active_firm') || 
      key.startsWith('app_payroll_') ||
      key.startsWith('app_stock_') ||
      key.startsWith('app_sales_invoices_') ||
      key.startsWith('app_purchase_bills_')
    )) {
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
 * Universal JSON Backup Restorer (Self-Healing Schema Migration & Dynamic Counters)
 */
export const restoreUniversalBackup = (jsonString) => {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    const rawData = parsed.data || parsed.payload || parsed;

    if (!rawData || typeof rawData !== 'object') {
      throw new Error('Invalid backup archive. No valid data records detected.');
    }

    // 1. Resolve Active Firm ID from local memory
    let activeFirmId = null;
    try {
      const storedActive = localStorage.getItem('app_active_firm');
      if (storedActive) {
        if (storedActive.startsWith('{')) {
          activeFirmId = JSON.parse(storedActive)?.id;
        } else {
          activeFirmId = storedActive;
        }
      }
    } catch {
      // Fallback
    }

    if (!activeFirmId) {
      // Look for active firm in the raw backup payload
      for (let key in rawData) {
        if (key.startsWith('app_vouchers_')) {
          activeFirmId = key.replace('app_vouchers_', '');
          break;
        }
      }
    }
    activeFirmId = activeFirmId || 'FIRM-001';

    // 2. Restore all data records directly
    Object.keys(rawData).forEach((key) => {
      const value = rawData[key];
      if (typeof value === 'object' && value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value || '');
      }
    });

    // 3. Remap Data to Current Active Firm ID if different
    const sourceFirmId = parsed.firm_id;
    if (sourceFirmId && sourceFirmId !== activeFirmId) {
      const modules = [
        'accounts',
        'vouchers',
        'stock',
        'sales_invoices',
        'purchase_bills',
        'payroll_entities',
        'payroll_work_logs'
      ];

      modules.forEach((mod) => {
        const srcKey = `app_${mod}_${sourceFirmId}`;
        const destKey = `app_${mod}_${activeFirmId}`;
        const srcData = localStorage.getItem(srcKey);
        if (srcData) {
          localStorage.setItem(destKey, srcData);
        }
      });
    }

    // 4. Schema Self-Healing for Universal Vouchers
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

    // 5. Compute Exact Non-Zero Entity Counts
    let accountsCount = 0;
    let vouchersCount = 0;
    let stockCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('app_accounts_')) {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(list)) accountsCount = Math.max(accountsCount, list.length);
          } catch {}
        } else if (key.startsWith('app_vouchers_')) {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(list)) vouchersCount = Math.max(vouchersCount, list.length);
          } catch {}
        } else if (key.startsWith('app_stock_')) {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(list)) stockCount = Math.max(stockCount, list.length);
          } catch {}
        }
      }
    }

    // 6. Broadcast Real-Time Events
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('stock_updated'));

    // Return response containing all common key aliases
    return {
      success: true,
      message: '✓ Backup Restored Successfully!',
      accounts: accountsCount,
      accountsCount: accountsCount,
      vouchers: vouchersCount,
      vouchersCount: vouchersCount,
      stockSKUs: stockCount,
      stockCount: stockCount,
      stock: stockCount
    };
  } catch (err) {
    throw new Error(`Backup restoration failed: ${err.message}`);
  }
};

// Aliases for backwards compatibility
export const downloadSystemBackupJSON = exportUniversalBackup;
export const restoreSystemBackupJSON = restoreUniversalBackup;

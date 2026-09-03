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

    // Identify the active firm ID to ensure cross-firm restore works seamlessly
    let activeFirmId = localStorage.getItem('app_active_firm');
    try {
      if (activeFirmId && activeFirmId.startsWith('{')) {
        activeFirmId = JSON.parse(activeFirmId)?.id;
      }
    } catch {
      // Keep raw activeFirmId
    }
    const targetFirmId = parsed.firm_id || activeFirmId || 'FIRM-001';

    // 1. Write all stored keys back into localStorage
    Object.keys(rawData).forEach((key) => {
      const value = rawData[key];
      if (typeof value === 'object' && value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value || '');
      }
    });

    // 2. Cross-firm Mapping: If backup was taken under another firm ID, clone to current active firm
    if (activeFirmId && targetFirmId !== activeFirmId) {
      ['accounts', 'vouchers', 'stock', 'sales_invoices', 'purchase_bills', 'payroll_entities', 'payroll_work_logs'].forEach(moduleKey => {
        const sourceKey = `app_${moduleKey}_${targetFirmId}`;
        const destKey = `app_${moduleKey}_${activeFirmId}`;
        const sourceData = localStorage.getItem(sourceKey);
        if (sourceData && !localStorage.getItem(destKey)) {
          localStorage.setItem(destKey, sourceData);
        }
      });
    }

    // 3. Schema Self-Healing: Guarantee modern voucher keys and IDs
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

    // 4. Calculate Exact Counts for the UI Feedback Banner
    let totalAccounts = 0;
    let totalVouchers = 0;
    let totalStock = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('app_accounts_')) {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          totalAccounts = Math.max(totalAccounts, list.length);
        } else if (key.startsWith('app_vouchers_')) {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          totalVouchers = Math.max(totalVouchers, list.length);
        } else if (key.startsWith('app_stock_')) {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          totalStock = Math.max(totalStock, list.length);
        }
      }
    }

    // 5. Trigger System-wide Reactive Events
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('stock_updated'));

    // Return all common property variations to satisfy any UI expectations
    return { 
      success: true, 
      message: '✓ Backup restored successfully. All ledger accounts, daybooks, and stock records are live.',
      accountsCount: totalAccounts,
      accounts: totalAccounts,
      vouchersCount: totalVouchers,
      vouchers: totalVouchers,
      stockCount: totalStock,
      stockSKUs: totalStock,
      stock: totalStock
    };
  } catch (err) {
    throw new Error(`Backup restoration failed: ${err.message}`);
  }
};

// Backwards-compatibility aliases
export const downloadSystemBackupJSON = exportUniversalBackup;
export const restoreSystemBackupJSON = restoreUniversalBackup;

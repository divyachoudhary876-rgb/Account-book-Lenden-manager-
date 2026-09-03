// frontend/src/utils/backupEngine.js

/**
 * Universal JSON Backup Exporter
 */
export const exportUniversalBackup = (firmId = 'FIRM-001', firmName = 'Firm') => {
  const backupPayload = {
    version: '3.0.0',
    export_timestamp: new Date().toISOString(),
    firm_id: firmId,
    firm_name: firmName,
    data: {}
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes(firmId) || 
      key.startsWith('app_') ||
      key.startsWith('business_')
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
 * Universal Deep-Scanner Backup Restorer
 * Resolves all legacy formats, cross-firm ID drift, and single-to-compound voucher migration
 */
export const restoreUniversalBackup = (jsonInput) => {
  try {
    let parsed = null;
    if (typeof jsonInput === 'string') {
      parsed = JSON.parse(jsonInput);
    } else if (typeof jsonInput === 'object' && jsonInput !== null) {
      parsed = jsonInput;
    } else {
      throw new Error('Invalid backup file format.');
    }

    // 1. Current Active Firm ID nikalna
    let activeFirmId = null;
    try {
      const activeRaw = localStorage.getItem('app_active_firm');
      if (activeRaw) {
        if (activeRaw.startsWith('{')) {
          activeFirmId = JSON.parse(activeRaw)?.id;
        } else {
          activeFirmId = activeRaw;
        }
      }
    } catch {}

    if (!activeFirmId) {
      // Header se auto-detect karein
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('app_accounts_')) {
          activeFirmId = k.replace('app_accounts_', '');
          break;
        }
      }
    }
    activeFirmId = activeFirmId || 'FIRM-001';

    // 2. Data pool ko flat banakar saare array objects dhoondhna
    const dataPool = parsed.data || parsed.payload || parsed;

    let recoveredVouchers = [];
    let recoveredAccounts = [];
    let recoveredStock = [];

    // Helper function: Array ke elements ko check karke identify karna
    const classifyAndCollectArray = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return;

      const sample = arr[0];
      if (!sample || typeof sample !== 'object') return;

      // Voucher Pehchan: date, voucher_number, reference_no, dr_account, ya amount
      if (sample.voucher_number || sample.reference_no || sample.voucher_type || (sample.dr_account && sample.cr_account)) {
        if (arr.length > recoveredVouchers.length) {
          recoveredVouchers = arr;
        }
      }
      // Account Pehchan: account_name, primary_type, sub_group
      else if (sample.account_name || sample.primary_type || sample.sub_group) {
        if (arr.length > recoveredAccounts.length) {
          recoveredAccounts = arr;
        }
      }
      // Stock Pehchan: item_name, current_stock, selling_price, unit
      else if (sample.item_name || sample.current_stock !== undefined) {
        if (arr.length > recoveredStock.length) {
          recoveredStock = arr;
        }
      }
    };

    // Deep recursive scan poore backup object par
    const scanObject = (obj) => {
      if (!obj || typeof obj !== 'object') return;

      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (Array.isArray(value)) {
          classifyAndCollectArray(value);
        } else if (typeof value === 'object' && value !== null) {
          scanObject(value);
        }
      });
    };

    scanObject(dataPool);

    // 3. Purane vouchers ko naye double-entry format me normalize karna
    const normalizedVouchers = recoveredVouchers.map((v, idx) => {
      const vchDate = v.voucher_date || v.date || new Date().toISOString().split('T')[0];
      const vchType = (v.voucher_type || v.type || 'JOURNAL').toUpperCase();
      const vchNum = v.voucher_number || v.reference_no || `VCH-${Date.now()}-${idx}`;
      const amt = parseFloat(v.amount || 0);

      let entries = v.entries;
      if (!Array.isArray(entries) || entries.length === 0) {
        entries = [
          { type: 'Dr', account_name: v.dr_account || v.dr_party || 'General Expense', amount: amt },
          { type: 'Cr', account_name: v.cr_account || v.cr_party || 'Cash in Hand (रोकड़)', amount: amt }
        ];
      }

      return {
        ...v,
        id: v.id || `VCH-RESTORED-${Date.now()}-${idx}`,
        voucher_date: vchDate,
        date: vchDate,
        voucher_type: vchType,
        type: vchType,
        voucher_number: vchNum,
        reference_no: vchNum,
        amount: amt,
        is_compound: entries.length > 2,
        entries: entries,
        dr_account: v.dr_account || v.dr_party || entries.find(e => e.type === 'Dr')?.account_name || 'Debit A/c',
        cr_account: v.cr_account || v.cr_party || entries.find(e => e.type === 'Cr')?.account_name || 'Credit A/c'
      };
    });

    // 4. Forcefully active firm ke localStorage me save karna
    if (normalizedVouchers.length > 0) {
      localStorage.setItem(`app_vouchers_${activeFirmId}`, JSON.stringify(normalizedVouchers));
    }
    if (recoveredAccounts.length > 0) {
      localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(recoveredAccounts));
    }
    if (recoveredStock.length > 0) {
      localStorage.setItem(`app_stock_${activeFirmId}`, JSON.stringify(recoveredStock));
    }

    // Backup ke baaki generic data ko bhi write karna
    if (typeof dataPool === 'object') {
      Object.keys(dataPool).forEach((k) => {
        if (!k.startsWith('app_vouchers_') && !k.startsWith('app_accounts_') && !k.startsWith('app_stock_')) {
          const val = dataPool[k];
          localStorage.setItem(k, typeof val === 'object' ? JSON.stringify(val) : val);
        }
      });
    }

    // 5. Global Events trigger karna
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('stock_updated'));

    return {
      success: true,
      message: '✓ Backup Restored Successfully!',
      accounts: recoveredAccounts.length,
      accountsCount: recoveredAccounts.length,
      vouchers: normalizedVouchers.length,
      vouchersCount: normalizedVouchers.length,
      stockSKUs: recoveredStock.length,
      stockCount: recoveredStock.length,
      stock: recoveredStock.length
    };
  } catch (err) {
    throw new Error(`Backup restoration failed: ${err.message}`);
  }
};

export const downloadSystemBackupJSON = exportUniversalBackup;
export const restoreSystemBackupJSON = restoreUniversalBackup;

// frontend/src/utils/backupEngine.js

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

/**
 * 1. Export Universal Backup with Native Android Filesystem & Share Support
 */
export const exportUniversalBackup = async (firmId = 'FIRM-001', firmName = 'Enterprise') => {
  try {
    const backupPayload = {
      manifest: {
        app: 'Business Book ERP',
        backupVersion: '2.0.0',
        firmId: firmId,
        firmName: firmName,
        exportedAt: new Date().toISOString()
      },
      accounts: JSON.parse(localStorage.getItem(`app_accounts_${firmId}`) || '[]'),
      vouchers: JSON.parse(localStorage.getItem(`app_vouchers_${firmId}`) || '[]'),
      stock: JSON.parse(localStorage.getItem(`app_stock_${firmId}`) || '[]'),
      firmsRegistry: JSON.parse(localStorage.getItem('app_firms_registry') || '[]')
    };

    const sanitizedFirmName = firmName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStamp = new Date().toISOString().split('T')[0];
    const fileName = `BusinessBook_Backup_${sanitizedFirmName}_${dateStamp}.json`;
    const jsonString = JSON.stringify(backupPayload, null, 2);

    let savedPath = null;
    let savedViaNative = false;

    // STEP 1: Try Native Capacitor Filesystem write (Android Documents Directory)
    try {
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: jsonString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      savedPath = writeResult.uri || `Documents/${fileName}`;
      savedViaNative = true;
    } catch (nativeErr) {
      console.warn('Native filesystem write fallback:', nativeErr);
    }

    // STEP 2: Try Native Mobile Web Share (WhatsApp / Drive / Save to Files)
    try {
      const file = new File([jsonString], fileName, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Account Book Backup - ${firmName}`,
          text: `Complete Accounting Backup for ${firmName} (${dateStamp})`
        });
        return {
          success: true,
          fileName,
          count: backupPayload.vouchers.length,
          method: 'SHARE',
          jsonString
        };
      }
    } catch (shareErr) {
      console.warn('Web share bypassed/cancelled:', shareErr);
    }

    // STEP 3: Fallback Blob anchor download for Desktop/Chrome
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
    } catch (blobErr) {
      console.warn('Blob anchor download bypassed:', blobErr);
    }

    return {
      success: true,
      fileName,
      savedPath: savedPath || 'Documents Folder',
      count: backupPayload.vouchers.length,
      method: savedViaNative ? 'NATIVE_FILESYSTEM' : 'DOWNLOAD_TRIGGERED',
      jsonString
    };
  } catch (error) {
    throw new Error('Backup generation failed: ' + error.message);
  }
};

/**
 * 2. Adaptive Backup Restore Engine (From File or Raw JSON String)
 */
export const restoreUniversalBackup = async (sourceData, targetFirmId = 'FIRM-001') => {
  let rawData = null;

  if (typeof sourceData === 'string') {
    // Direct JSON string paste
    try {
      rawData = JSON.parse(sourceData);
    } catch {
      throw new Error('Invalid JSON text format. Please paste valid backup data.');
    }
  } else if (sourceData instanceof File) {
    // File upload
    rawData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(JSON.parse(e.target.result));
        } catch {
          reject(new Error('Corrupted JSON file. Unable to parse data.'));
        }
      };
      reader.onerror = () => reject(new Error('Unable to read selected file.'));
      reader.readAsText(sourceData);
    });
  } else {
    throw new Error('Unsupported backup data source.');
  }

  // Normalize legacy vs modern schema
  const accounts = rawData.accounts || rawData.accountList || rawData.account_heads || [];
  const vouchers = rawData.vouchers || rawData.voucherList || rawData.journal_entries || [];
  const stock = rawData.stock || rawData.stockItems || rawData.inventory || [];
  const firms = rawData.firmsRegistry || rawData.firms || [];

  const normalizedAccounts = accounts.map((acc, index) => ({
    id: acc.id || `ACC-${Date.now()}-${index}`,
    account_name: (acc.account_name || acc.name || acc.party_name || 'General Account').trim(),
    primary_type: (acc.primary_type || acc.type || 'ASSETS').toUpperCase(),
    sub_group: acc.sub_group || acc.group || 'Sundry Debtors (Customer / देनदार)',
    opening_balance: parseFloat(acc.opening_balance || acc.opening || 0),
    balance_type: acc.balance_type || (acc.opening_balance >= 0 ? 'Dr' : 'Cr'),
    gstin: acc.gstin || '',
    phone: acc.phone || acc.mobile || '',
    is_system_locked: Boolean(acc.is_system_locked),
    updated_at: acc.updated_at || new Date().toISOString()
  }));

  const normalizedVouchers = vouchers.map((vch, index) => ({
    id: vch.id || `VCH-${Date.now()}-${index}`,
    firm_id: targetFirmId,
    voucher_date: vch.voucher_date || vch.date || new Date().toISOString().split('T')[0],
    date: vch.voucher_date || vch.date || new Date().toISOString().split('T')[0],
    voucher_type: (vch.voucher_type || vch.type || 'JOURNAL').toUpperCase(),
    type: (vch.voucher_type || vch.type || 'JOURNAL').toUpperCase(),
    dr_account: (vch.dr_account || vch.debit_account || vch.dr_party || '').trim(),
    cr_account: (vch.cr_account || vch.credit_account || vch.cr_party || '').trim(),
    dr_party: (vch.dr_account || vch.debit_account || vch.dr_party || '').trim(),
    cr_party: (vch.cr_account || vch.credit_account || vch.cr_party || '').trim(),
    amount: parseFloat(vch.amount || vch.total_amount || 0),
    reference_no: vch.reference_no || vch.bill_no || `REF-${index + 1}`,
    narration: vch.narration || vch.remarks || '',
    created_at: vch.created_at || new Date().toISOString()
  }));

  const normalizedStock = stock.map((stk, index) => ({
    id: stk.id || `STK-${Date.now()}-${index}`,
    item_name: (stk.item_name || stk.name || 'Stock Item').trim(),
    unit: stk.unit || 'Pcs',
    current_stock: parseFloat(stk.current_stock || stk.quantity || stk.stock || 0),
    unit_purchase_price: parseFloat(stk.unit_purchase_price || stk.purchase_rate || stk.cost || 0),
    selling_price: parseFloat(stk.selling_price || stk.sale_rate || 0),
    updated_at: stk.updated_at || new Date().toISOString()
  }));

  // Store in active firm partitions
  localStorage.setItem(`app_accounts_${targetFirmId}`, JSON.stringify(normalizedAccounts));
  localStorage.setItem(`app_vouchers_${targetFirmId}`, JSON.stringify(normalizedVouchers));
  localStorage.setItem(`app_stock_${targetFirmId}`, JSON.stringify(normalizedStock));

  if (firms.length > 0) {
    localStorage.setItem('app_firms_registry', JSON.stringify(firms));
  }

  // Reactive global event trigger
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('stock_updated'));

  return {
    accountsRestored: normalizedAccounts.length,
    vouchersRestored: normalizedVouchers.length,
    stockRestored: normalizedStock.length
  };
};

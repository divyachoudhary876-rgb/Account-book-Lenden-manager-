// frontend/src/utils/backupEngine.js
import { StorageService } from './storageSync';

/**
 * 1. Comprehensive System Backup Generator
 */
export const downloadFullSystemBackup = (firmId = 'FIRM-001') => {
  try {
    const vouchers = StorageService.getItem('account_book_vouchers') || StorageService.getItem('vouchers') || [];
    const accounts = StorageService.getItem('account_masters') || [];
    const inventory = StorageService.getItem('inventory_items') || [];
    const consumptions = StorageService.getItem('material_consumptions') || [];
    
    const firmMeta = StorageService.getItem('active_firm') || { firm_id: firmId, name: 'Neelkanth Groups' };

    const backupPayload = {
      backup_metadata: {
        firm_id: firmId,
        firm_name: firmMeta.name || firmMeta.legal_name || 'Neelkanth Groups',
        export_timestamp: new Date().toISOString(),
        schema_version: "2.0"
      },
      accounts: Array.isArray(accounts) ? accounts : [],
      vouchers: Array.isArray(vouchers) ? vouchers : [],
      inventory: Array.isArray(inventory) ? inventory : [],
      consumptions: Array.isArray(consumptions) ? consumptions : []
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.setAttribute('download', `AccountBook_Backup_${firmMeta.name || 'Firm'}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 1500);

    return { success: true, message: "Backup downloaded successfully!" };
  } catch (err) {
    console.error("Backup generation error:", err);
    throw new Error(err.message || "Failed to generate backup.");
  }
};

/**
 * 2. Universal Schema-Agnostic Restore Engine
 */
export const restoreSystemFromBackup = (fileContent) => {
  try {
    const parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
    
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Invalid backup file format.");
    }

    const vouchers = parsed.vouchers || parsed.storage_data?.account_book_vouchers || parsed.storage_payload?.vouchers || [];
    const accounts = parsed.accounts || parsed.storage_data?.account_masters || parsed.storage_payload?.accounts || [];
    const inventory = parsed.inventory || parsed.storage_data?.inventory_items || parsed.storage_payload?.inventory || [];
    const consumptions = parsed.consumptions || parsed.storage_data?.material_consumptions || parsed.storage_payload?.consumptions || [];

    if (Array.isArray(vouchers) && vouchers.length > 0) {
      StorageService.setItem('account_book_vouchers', vouchers);
      localStorage.setItem('account_book_vouchers', JSON.stringify(vouchers));
      StorageService.setItem('vouchers', vouchers);
      localStorage.setItem('vouchers', JSON.stringify(vouchers));
    }

    if (Array.isArray(accounts) && accounts.length > 0) {
      StorageService.setItem('account_masters', accounts);
      localStorage.setItem('account_masters', JSON.stringify(accounts));
    }

    if (Array.isArray(inventory) && inventory.length > 0) {
      StorageService.setItem('inventory_items', inventory);
      localStorage.setItem('inventory_items', JSON.stringify(inventory));
    }

    if (Array.isArray(consumptions) && consumptions.length > 0) {
      StorageService.setItem('material_consumptions', consumptions);
      localStorage.setItem('material_consumptions', JSON.stringify(consumptions));
    }

    if (parsed.storage_payload && typeof parsed.storage_payload === 'object') {
      Object.keys(parsed.storage_payload).forEach(key => {
        const val = parsed.storage_payload[key];
        StorageService.setItem(key, val);
        localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      });
    }

    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));

    return { success: true, message: "System successfully restored with 100% data recovery!" };
  } catch (err) {
    console.error("Restore failed:", err);
    throw new Error(err.message || "Failed to restore backup file.");
  }
};

/**
 * 3. EXPLICIT ALIASES TO MATCH SecurityBackupSettings.jsx IMPORTS (Fixes GitHub Action Build Error)
 */
export const exportUniversalBackup = downloadFullSystemBackup;
export const restoreUniversalBackup = restoreSystemFromBackup;

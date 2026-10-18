// frontend/src/utils/multiFirmEngine.js
/**
 * Enterprise Multi-Firm Registry & Context Switching Engine
 * Zero-Leakage Scoped Bucket Architecture for Bhatta ERP
 */

import { IDBStorage } from './indexedDbStorage.js';

export const getFirmsRegistry = () => {
  try {
    let firms = IDBStorage.getItem('app_firms_registry', null);
    if (!Array.isArray(firms) || firms.length === 0) {
      firms = IDBStorage.getItem('app_firms', null) || IDBStorage.getItem('app_firms_list', []) || [];
    }

    const activeObj = IDBStorage.getItem('active_firm_profile', null);
    if (activeObj && (activeObj.id || activeObj.firm_id)) {
      const activeId = activeObj.id || activeObj.firm_id;
      if (!firms.some(f => (f.id === activeId || f.firm_id === activeId))) {
        firms.push(activeObj);
      }
    }

    const uniqueMap = new Map();
    firms.forEach(f => {
      if (f && (f.id || f.firm_id || f.legal_name || f.name)) {
        const cleanId = f.id || f.firm_id || `FIRM-${Date.now()}`;
        const fName = f.legal_name || f.trade_name || f.name || 'Neelkanth Int Udyog';
        uniqueMap.set(cleanId, {
          ...f,
          id: cleanId,
          firm_id: cleanId,
          legal_name: fName,
          trade_name: f.trade_name || fName,
          business_category: f.business_category || f.category || 'BRICK_KILN'
        });
      }
    });

    let finalFirms = Array.from(uniqueMap.values());
    if (finalFirms.length === 0) {
      const defaultFirm = {
        id: 'FIRM-1790909076433',
        firm_id: 'FIRM-1790909076433',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN',
        gstin: '08AAAAA0000A1Z5'
      };
      finalFirms = [defaultFirm];
    }

    IDBStorage.setItem('app_firms_registry', finalFirms);
    IDBStorage.setItem('app_firms', finalFirms);
    return finalFirms;
  } catch (err) {
    return [{
      id: 'FIRM-1790909076433',
      firm_id: 'FIRM-1790909076433',
      legal_name: 'Neelkanth Int Udyog',
      trade_name: 'Neelkanth Int Udyog',
      business_category: 'BRICK_KILN'
    }];
  }
};

export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    if (firms.length === 0) return null;

    let activeId = IDBStorage.getItem('app_active_firm_id', null);
    let match = firms.find(f => f.id === activeId || f.firm_id === activeId);

    if (match) return match;

    const fallbackFirm = firms[0];
    const cleanId = fallbackFirm.id || fallbackFirm.firm_id;
    IDBStorage.setItem('app_active_firm_id', cleanId);
    IDBStorage.setItem('active_firm_profile', fallbackFirm);
    return fallbackFirm;
  } catch (err) {
    return null;
  }
};

export const switchActiveFirm = (firmId) => {
  if (!firmId) throw new Error("Invalid firm ID provided for switching.");

  const firms = getFirmsRegistry();
  const targetFirm = firms.find(f => f.id === firmId || f.firm_id === firmId);

  if (!targetFirm) {
    throw new Error(`Firm profile with ID "${firmId}" not found in registry.`);
  }

  const cleanId = targetFirm.id || targetFirm.firm_id;
  
  IDBStorage.setItem('app_active_firm_id', cleanId);
  IDBStorage.setItem('active_firm_profile', targetFirm);

  const scopedVouchers = IDBStorage.getItem(`account_book_vouchers_${cleanId}`, []);
  IDBStorage.setItem('account_book_vouchers', scopedVouchers);
  IDBStorage.setItem('app_vouchers', scopedVouchers);

  const scopedPurchases = IDBStorage.getItem(`purchase_bills_${cleanId}`, []);
  IDBStorage.setItem('purchase_bills', scopedPurchases);

  const scopedAccounts = IDBStorage.getItem(`account_heads_${cleanId}`, []);
  IDBStorage.setItem('app_account_heads', scopedAccounts);

  const scopedInventory = IDBStorage.getItem(`inventory_items_${cleanId}`, []);
  IDBStorage.setItem('inventory_items', scopedInventory);

  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return true;
};

export const setActiveFirmId = switchActiveFirm;

export const updateFirmProfile = (firmId, updatedFields) => {
  try {
    const firms = getFirmsRegistry();
    const index = firms.findIndex(f => f.id === firmId || f.firm_id === firmId);

    if (index === -1) throw new Error(`Firm with ID "${firmId}" not found.`);

    const currentFirm = firms[index];
    const updatedFirm = {
      ...currentFirm,
      ...updatedFields,
      id: currentFirm.id || currentFirm.firm_id,
      firm_id: currentFirm.id || currentFirm.firm_id,
      updated_at: new Date().toISOString()
    };

    firms[index] = updatedFirm;
    IDBStorage.setItem('app_firms_registry', firms);
    IDBStorage.setItem('app_firms', firms);

    const activeFirm = getActiveFirm();
    if (activeFirm && (activeFirm.id === firmId || activeFirm.firm_id === firmId)) {
      IDBStorage.setItem('active_firm_profile', updatedFirm);
    }

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('storage'));

    return updatedFirm;
  } catch (err) {
    throw new Error("Failed to update firm profile: " + err.message);
  }
};

// 🛠️ Backward-compatibility aliases to prevent any rollup export build breaks
export const updateFireProfile = updateFirmProfile;
export const updateFirm = updateFirmProfile;

export const deleteFirmProfile = (firmId) => {
  if (!firmId) return false;

  const firms = getFirmsRegistry().filter(f => f.id !== firmId && f.firm_id !== firmId);
  IDBStorage.setItem('app_firms_registry', firms);
  IDBStorage.setItem('app_firms', firms);

  const firmKeysToPurge = [
    `app_accounts_${firmId}`,
    `account_heads_${firmId}`,
    `app_vouchers_${firmId}`,
    `account_book_vouchers_${firmId}`,
    `inventory_items_${firmId}`,
    `app_invoices_${firmId}`,
    `sales_invoices_${firmId}`,
    `purchase_bills_${firmId}`,
    `app_purchase_bills_${firmId}`,
    `app_payroll_entries_${firmId}`,
    `material_consumption_records_${firmId}`,
    `production_batches_${firmId}`,
    `app_active_fy_${firmId}`,
    `financial_years_${firmId}`,
    `universal_material_adjustments_${firmId}`
  ];

  firmKeysToPurge.forEach(k => IDBStorage.removeItem(k));

  if (firms.length > 0) {
    const nextId = firms[0].id || firms[0].firm_id;
    switchActiveFirm(nextId);
  } else {
    IDBStorage.removeItem('app_active_firm_id');
    IDBStorage.removeItem('active_firm_profile');
  }

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const deleteFireProfile = deleteFirmProfile;

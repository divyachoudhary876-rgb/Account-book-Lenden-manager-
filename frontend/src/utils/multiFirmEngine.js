/**
 * Multi-Firm Isolation Engine for Account Book ERP (Stable Baseline)
 */

import { IDBStorage } from './indexedDbStorage.js';

export const getFirmsRegistry = () => {
  try {
    let firms = [];
    const rawFirms = IDBStorage.getItem('app_firms_registry', null) || IDBStorage.getItem('app_firms', null);
    
    if (rawFirms) {
      firms = typeof rawFirms === 'string' ? JSON.parse(rawFirms) : rawFirms;
    }

    if (!Array.isArray(firms)) {
      firms = [];
    }

    if (firms.length === 0) {
      firms = [{
        id: 'FIRM-1790909076433',
        firm_id: 'FIRM-1790909076433',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN',
        gstin: 'UNREGISTERED'
      }];
    }

    return firms;
  } catch (err) {
    return [{
      id: 'FIRM-1790909076433',
      firm_id: 'FIRM-1790909076433',
      legal_name: 'Neelkanth Int Udyog',
      trade_name: 'Neelkanth Int Udyog',
      business_category: 'BRICK_KILN',
      gstin: 'UNREGISTERED'
    }];
  }
};

export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    if (firms.length === 0) return null;

    let activeId = IDBStorage.getItem('app_active_firm_id', null);
    let match = firms.find(f => f && (f.id === activeId || f.firm_id === activeId));

    if (!match) {
      match = firms[0];
      IDBStorage.setItem('app_active_firm_id', match.id || match.firm_id);
      IDBStorage.setItem('active_firm_profile', match);
    }

    return match;
  } catch (err) {
    return {
      id: 'FIRM-1790909076433',
      firm_id: 'FIRM-1790909076433',
      legal_name: 'Neelkanth Int Udyog',
      trade_name: 'Neelkanth Int Udyog',
      business_category: 'BRICK_KILN',
      gstin: 'UNREGISTERED'
    };
  }
};

export const switchActiveFirm = (firmId) => {
  if (!firmId) return false;
  try {
    const firms = getFirmsRegistry();
    const targetFirm = firms.find(f => f && (f.id === firmId || f.firm_id === firmId));

    if (!targetFirm) return false;

    const cleanId = targetFirm.id || targetFirm.firm_id;
    IDBStorage.setItem('app_active_firm_id', cleanId);
    IDBStorage.setItem('active_firm_profile', targetFirm);

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('storage'));
    return true;
  } catch (err) {
    return false;
  }
};

export const setActiveFirmId = switchActiveFirm;

export const createNewFirm = (firmData) => {
  try {
    const firms = getFirmsRegistry();
    const newId = `FIRM-${Date.now()}`;
    const newFirm = {
      id: newId,
      firm_id: newId,
      legal_name: firmData?.legal_name || firmData?.name || 'New Firm',
      trade_name: firmData?.trade_name || firmData?.legal_name || 'New Firm',
      business_category: firmData?.business_category || 'BRICK_KILN',
      gstin: firmData?.gstin || 'UNREGISTERED',
      created_at: new Date().toISOString()
    };

    firms.push(newFirm);
    IDBStorage.setItem('app_firms_registry', firms);
    IDBStorage.setItem('app_active_firm_id', newId);
    IDBStorage.setItem('active_firm_profile', newFirm);

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('storage'));

    return newFirm;
  } catch (err) {
    throw new Error("Failed to create firm: " + err.message);
  }
};

export const updateFirmProfile = (firmId, updatedFields) => {
  try {
    const firms = getFirmsRegistry();
    const index = firms.findIndex(f => f && (f.id === firmId || f.firm_id === firmId));

    if (index === -1) {
      throw new Error(`Firm with ID "${firmId}" not found.`);
    }

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

export const deleteFirmProfile = (firmId) => {
  if (!firmId) return false;
  try {
    const firms = getFirmsRegistry().filter(f => f && f.id !== firmId && f.firm_id !== firmId);
    IDBStorage.setItem('app_firms_registry', firms);
    
    const firmKeysToPurge = [
      `app_accounts_${firmId}`,
      `account_heads_${firmId}`,
      `app_vouchers_${firmId}`,
      `account_book_vouchers_${firmId}`,
      `inventory_items_${firmId}`,
      `purchase_bills_${firmId}`
    ];

    firmKeysToPurge.forEach(k => {
      IDBStorage.removeItem(k);
    });

    if (firms.length > 0) {
      const nextId = firms[0].id || firms[0].firm_id;
      IDBStorage.setItem('app_active_firm_id', nextId);
      IDBStorage.setItem('active_firm_profile', firms[0]);
    } else {
      IDBStorage.removeItem('app_active_firm_id');
      IDBStorage.removeItem('active_firm_profile');
    }

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('storage'));
    return true;
  } catch (err) {
    return false;
  }
};

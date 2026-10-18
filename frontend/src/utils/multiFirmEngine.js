/**
 * Multi-Firm Isolation Engine for Account Book ERP
 * Manages enterprise firm profiles, active session context, and isolated storage buckets.
 */

import { IDBStorage } from './indexedDbStorage.js';

export const getFirmsRegistry = () => {
  try {
    let firms = IDBStorage.getItem('app_firms_registry', []);
    if (!Array.isArray(firms) || firms.length === 0) {
      firms = IDBStorage.getItem('app_firms', []);
    }

    const activeRaw = IDBStorage.getItem('active_firm_profile', null);
    if (activeRaw) {
      try {
        const activeObj = typeof activeRaw === 'string' ? JSON.parse(activeRaw) : activeRaw;
        if (activeObj && (activeObj.id || activeObj.firm_id)) {
          const activeId = activeObj.id || activeObj.firm_id;
          if (!firms.some(f => (f.id === activeId || f.firm_id === activeId))) {
            firms.push(activeObj);
          }
        }
      } catch (e) {}
    }

    if (firms.length === 0) {
      const defaultFirm = {
        id: 'FIRM-1790909076433',
        firm_id: 'FIRM-1790909076433',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN',
        gstin: 'UNREGISTERED'
      };
      firms = [defaultFirm];
    }

    const uniqueMap = new Map();
    firms.forEach(f => {
      if (f && (f.id || f.firm_id || f.legal_name)) {
        const fId = f.id || f.firm_id || `FIRM-${Math.floor(Math.random() * 100000)}`;
        uniqueMap.set(fId, {
          ...f,
          id: fId,
          firm_id: fId,
          legal_name: f.legal_name || f.trade_name || f.name || 'AccountBook Firm'
        });
      }
    });

    const finalFirms = Array.from(uniqueMap.values());
    IDBStorage.setItem('app_firms_registry', finalFirms);
    return finalFirms;
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
    const activeId = IDBStorage.getItem('app_active_firm_id', firms[0].id);
    let match = firms.find(f => f.id === activeId || f.firm_id === activeId);

    if (match) return match;

    IDBStorage.setItem('app_active_firm_id', firms[0].id);
    IDBStorage.setItem('active_firm_profile', firms[0]);
    return firms[0];
  } catch (err) {
    return null;
  }
};

export const switchActiveFirm = (firmId) => {
  if (!firmId) throw new Error("Invalid firm ID provided.");
  const firms = getFirmsRegistry();
  const targetFirm = firms.find(f => f.id === firmId || f.firm_id === firmId);

  if (!targetFirm) {
    throw new Error(`Firm profile with ID "${firmId}" not found.`);
  }

  const cleanId = targetFirm.id || targetFirm.firm_id;
  IDBStorage.setItem('app_active_firm_id', cleanId);
  IDBStorage.setItem('active_firm_profile', targetFirm);

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const setActiveFirmId = switchActiveFirm;

export const createNewFirm = (firmData) => {
  try {
    const firms = getFirmsRegistry();
    const newId = `FIRM-${Date.now()}`;
    const newFirm = {
      id: newId,
      firm_id: newId,
      legal_name: firmData.legal_name || firmData.name || 'New Firm',
      trade_name: firmData.trade_name || firmData.legal_name || 'New Firm',
      business_category: firmData.business_category || 'BRICK_KILN',
      gstin: firmData.gstin || 'UNREGISTERED',
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

/**
 * Update specific fields of an existing firm profile
 */
export const updateFirmProfile = (firmId, updatedFields) => {
  try {
    const firms = getFirmsRegistry();
    const index = firms.findIndex(f => f.id === firmId || f.firm_id === firmId);

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

/**
 * Delete a firm profile and purge its isolated storage buckets
 */
export const deleteFirmProfile = (firmId) => {
  if (!firmId) return false;

  const firms = getFirmsRegistry().filter(f => f.id !== firmId && f.firm_id !== firmId);
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
};

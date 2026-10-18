// frontend/src/utils/multiFirmEngine.js
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
  if (!firmId) throw new Error("Invalid firm ID provided.");
  const firms = getFirmsRegistry();
  const targetFirm = firms.find(f => f.id === firmId || f.firm_id === firmId);
  if (!targetFirm) throw new Error(`Firm not found.`);

  const cleanId = targetFirm.id || targetFirm.firm_id;
  IDBStorage.setItem('app_active_firm_id', cleanId);
  IDBStorage.setItem('active_firm_profile', targetFirm);

  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};

export const setActiveFirmId = switchActiveFirm;

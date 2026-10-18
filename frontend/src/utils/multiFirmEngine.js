// frontend/src/utils/multiFirmEngine.js
/**
 * Enterprise Multi-Firm Registry & Context Switching Engine
 * Strict Scoped Tenant Architecture for Account Book Smart Manager
 */

import { IDBStorage } from './indexedDbStorage.js';

export const getFirmsRegistry = () => {
  try {
    let firms = [];
    const raw = localStorage.getItem('app_firms_registry') || localStorage.getItem('app_firms');
    if (raw) {
      firms = JSON.parse(raw);
    }

    const activeObjStr = localStorage.getItem('active_firm_profile');
    if (activeObjStr) {
      try {
        const activeObj = JSON.parse(activeObjStr);
        if (activeObj && (activeObj.id || activeObj.firm_id)) {
          const activeId = activeObj.id || activeObj.firm_id;
          if (!firms.some(f => f && (f.id === activeId || f.firm_id === activeId))) {
            firms.push(activeObj);
          }
        }
      } catch (e) {}
    }

    const uniqueMap = new Map();
    firms.forEach(f => {
      if (f && (f.id || f.firm_id || f.legal_name || f.name)) {
        const cleanId = f.id || f.firm_id || `FIRM-${Date.now()}`;
        const fName = f.legal_name || f.trade_name || f.name || 'Enterprise Firm';
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

    return Array.from(uniqueMap.values());
  } catch (err) {
    return [];
  }
};

export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    if (!firms || firms.length === 0) return null;

    let activeId = localStorage.getItem('app_active_firm_id');
    let match = firms.find(f => f && (f.id === activeId || f.firm_id === activeId));

    if (match) return match;

    const fallbackFirm = firms[0];
    const cleanId = fallbackFirm.id || fallbackFirm.firm_id;
    localStorage.setItem('app_active_firm_id', cleanId);
    localStorage.setItem('active_firm_profile', JSON.stringify(fallbackFirm));
    return fallbackFirm;
  } catch (err) {
    return null;
  }
};

export const switchActiveFirm = (firmId) => {
  if (!firmId) return false;
  const firms = getFirmsRegistry();
  const targetFirm = firms.find(f => f && (f.id === firmId || f.firm_id === firmId));
  if (!targetFirm) return false;

  const cleanId = targetFirm.id || targetFirm.firm_id;
  localStorage.setItem('app_active_firm_id', cleanId);
  localStorage.setItem('active_firm_profile', JSON.stringify(targetFirm));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const setActiveFirmId = switchActiveFirm;

export const updateFirmProfile = (firmId, updatedFields) => {
  try {
    const firms = getFirmsRegistry();
    const index = firms.findIndex(f => f && (f.id === firmId || f.firm_id === firmId));

    if (index === -1) throw new Error(`Firm not found.`);

    const currentFirm = firms[index];
    const updatedFirm = {
      ...currentFirm,
      ...updatedFields,
      id: currentFirm.id || currentFirm.firm_id,
      firm_id: currentFirm.id || currentFirm.firm_id,
      updated_at: new Date().toISOString()
    };

    firms[index] = updatedFirm;
    localStorage.setItem('app_firms_registry', JSON.stringify(firms));

    const activeFirm = getActiveFirm();
    if (activeFirm && (activeFirm.id === firmId || activeFirm.firm_id === firmId)) {
      localStorage.setItem('active_firm_profile', JSON.stringify(updatedFirm));
    }

    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
    return updatedFirm;
  } catch (err) {
    throw new Error(err.message);
  }
};

export const updateFireProfile = updateFirmProfile;
export const updateFirm = updateFirmProfile;

export const deleteFirmProfile = (firmId) => {
  if (!firmId) return false;
  const firms = getFirmsRegistry().filter(f => f && f.id !== firmId && f.firm_id !== firmId);
  localStorage.setItem('app_firms_registry', JSON.stringify(firms));

  if (firms.length > 0) {
    switchActiveFirm(firms[0].id || firms[0].firm_id);
  } else {
    localStorage.removeItem('app_active_firm_id');
    localStorage.removeItem('active_firm_profile');
  }

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const deleteFireProfile = deleteFirmProfile;

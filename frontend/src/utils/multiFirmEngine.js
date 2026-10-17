/**
 * Enterprise Multi-Firm Registry & Context Switching Engine
 * Zero-Leakage Scoped Bucket Architecture for Bhatta ERP
 */

export const getFirmsRegistry = () => {
  try {
    let firms = [];
    const rawReg = localStorage.getItem('app_firms_registry') || localStorage.getItem('app_firms');
    if (rawReg) firms = JSON.parse(rawReg);

    if (!Array.isArray(firms)) firms = [];

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

    if (firms.length === 0) {
      const defaultFirm = {
        id: 'FIRM-1790909076433',
        firm_id: 'FIRM-1790909076433',
        legal_name: 'Neelkanth Int Udyog',
        trade_name: 'Neelkanth Int Udyog',
        business_category: 'BRICK_KILN',
        gstin: 'UNREGISTERED'
      };
      firms.push(defaultFirm);
      localStorage.setItem('app_firms_registry', JSON.stringify(firms));
      localStorage.setItem('app_active_firm_id', 'FIRM-1790909076433');
      localStorage.setItem('active_firm_profile', JSON.stringify(defaultFirm));
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
    let activeId = localStorage.getItem('app_active_firm_id');
    
    let match = firms.find(f => f && (f.id === activeId || f.firm_id === activeId));
    if (match) return match;

    if (firms.length > 0) {
      const fallback = firms[0];
      const fId = fallback.id || fallback.firm_id;
      localStorage.setItem('app_active_firm_id', fId);
      localStorage.setItem('active_firm_profile', JSON.stringify(fallback));
      return fallback;
    }

    return null;
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

  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return true;
};

export const setActiveFirmId = switchActiveFirm;

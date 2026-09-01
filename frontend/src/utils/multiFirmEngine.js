// frontend/src/utils/multiFirmEngine.js

export const getFirmsRegistry = () => {
  try {
    const raw = localStorage.getItem('app_firms_registry');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return [];
  } catch {
    return [];
  }
};

export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    if (firms.length === 0) return null;

    const activeId = localStorage.getItem('app_active_firm_id');
    const match = firms.find(f => f.id === activeId);
    if (match) return match;

    // Fallback to first existing firm
    localStorage.setItem('app_active_firm_id', firms[0].id);
    return firms[0];
  } catch {
    return null;
  }
};

export const setActiveFirmId = (firmId) => {
  localStorage.setItem('app_active_firm_id', firmId);
  window.dispatchEvent(new Event('app_state_updated'));
};

export const deleteFirmProfile = (firmId) => {
  const firms = getFirmsRegistry().filter(f => f.id !== firmId);
  localStorage.setItem('app_firms_registry', JSON.stringify(firms));
  
  localStorage.removeItem(`app_accounts_${firmId}`);
  localStorage.removeItem(`app_vouchers_${firmId}`);
  localStorage.removeItem(`app_stock_${firmId}`);

  if (firms.length > 0) {
    localStorage.setItem('app_active_firm_id', firms[0].id);
  } else {
    localStorage.removeItem('app_active_firm_id');
  }

  window.dispatchEvent(new Event('app_state_updated'));
  return true;
};

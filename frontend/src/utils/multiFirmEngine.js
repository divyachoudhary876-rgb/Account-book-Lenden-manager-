// frontend/src/utils/multiFirmEngine.js

export const DEFAULT_FIRM = {
  id: 'FIRM-001',
  legal_name: 'Neelkanth Enterprise',
  trade_name: 'Neelkanth Group',
  category: 'TRADING',
  business_category: 'TRADING',
  gstin: 'UNREGISTERED',
  phone: '9829000000',
  created_at: '2026-04-01T00:00:00.000Z'
};

export const getFirmsRegistry = () => {
  try {
    const raw = localStorage.getItem('app_firms_registry');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem('app_firms_registry', JSON.stringify([DEFAULT_FIRM]));
    return [DEFAULT_FIRM];
  } catch {
    return [DEFAULT_FIRM];
  }
};

export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    const activeId = localStorage.getItem('app_active_firm_id');
    const match = firms.find(f => f.id === activeId);
    if (match) return match;

    // Fallback to first available firm
    const fallback = firms[0] || DEFAULT_FIRM;
    localStorage.setItem('app_active_firm_id', fallback.id);
    return fallback;
  } catch {
    return DEFAULT_FIRM;
  }
};

export const setActiveFirmId = (firmId) => {
  localStorage.setItem('app_active_firm_id', firmId);
  window.dispatchEvent(new Event('app_state_updated'));
};

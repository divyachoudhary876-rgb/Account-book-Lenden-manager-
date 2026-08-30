// frontend/src/utils/multiFirmEngine.js

export const getAllFirms = () => {
  return JSON.parse(localStorage.getItem('app_all_firms_registry') || '[]');
};

export const getActiveFirm = () => {
  return JSON.parse(localStorage.getItem('active_firm_profile') || 'null');
};

export const saveOrUpdateFirm = (firmData) => {
  const existingFirms = getAllFirms();
  const isEdit = Boolean(firmData.id);
  
  const firmId = isEdit ? firmData.id : `FIRM-${Date.now()}`;
  const updatedFirm = {
    ...firmData,
    id: firmId,
    updated_at: new Date().toISOString()
  };

  let newRegistry = [];
  if (isEdit) {
    newRegistry = existingFirms.map(f => f.id === firmId ? updatedFirm : f);
  } else {
    newRegistry = [...existingFirms, updatedFirm];
    
    // Initialize isolated local storage keys for NEW firm
    localStorage.setItem(`app_inventory_${firmId}`, JSON.stringify([]));
    localStorage.setItem(`app_journal_entries_${firmId}`, JSON.stringify([]));
    localStorage.setItem(`app_account_heads_${firmId}`, JSON.stringify([]));
  }

  localStorage.setItem('app_all_firms_registry', JSON.stringify(newRegistry));
  localStorage.setItem('active_firm_profile', JSON.stringify(updatedFirm));

  window.dispatchEvent(new Event('storage'));
  return updatedFirm;
};

export const switchActiveFirm = (firmId) => {
  const existingFirms = getAllFirms();
  const targetFirm = existingFirms.find(f => f.id === firmId);
  if (!targetFirm) throw new Error("Selected firm not found.");

  localStorage.setItem('active_firm_profile', JSON.stringify(targetFirm));
  window.dispatchEvent(new Event('storage'));
  return targetFirm;
};

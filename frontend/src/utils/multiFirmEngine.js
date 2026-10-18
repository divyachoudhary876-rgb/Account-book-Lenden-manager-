/**
 * Multi-Firm Isolation Engine for Account Book ERP
 * Manages enterprise firm profiles, active session context, and isolated storage buckets.
 */

export const getFirmsRegistry = () => {
  try {
    const raw = localStorage.getItem('app_firms_registry');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    
    const activeRaw = localStorage.getItem('active_firm_profile');
    if (activeRaw) {
      try {
        const activeObj = JSON.parse(activeRaw);
        if (activeObj && activeObj.id) {
          const defaultList = [activeObj];
          localStorage.setItem('app_firms_registry', JSON.stringify(defaultList));
          localStorage.setItem('app_active_firm_id', activeObj.id);
          return defaultList;
        }
      } catch (e) {}
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
    
    localStorage.setItem('app_active_firm_id', firms[0].id);
    localStorage.setItem('active_firm_profile', JSON.stringify(firms[0]));
    return firms[0];
  } catch {
    return null;
  }
};

export const switchActiveFirm = (firmId) => {
  if (!firmId) throw new Error("Invalid firm ID provided for switching.");
  
  const firms = getFirmsRegistry();
  const targetFirm = firms.find(f => f.id === firmId);
  if (!targetFirm) {
    throw new Error(`Firm profile with ID "${firmId}" not found in registry.`);
  }
  
  localStorage.setItem('app_active_firm_id', firmId);
  localStorage.setItem('active_firm_profile', JSON.stringify(targetFirm));
  
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
      legal_name: firmData?.legal_name || firmData?.name || 'New Firm',
      trade_name: firmData?.trade_name || firmData?.legal_name || 'New Firm',
      business_category: firmData?.business_category || 'BRICK_KILN',
      gstin: firmData?.gstin || 'UNREGISTERED',
      mobile: firmData?.mobile || '',
      address: firmData?.address || '',
      created_at: new Date().toISOString()
    };

    firms.push(newFirm);
    localStorage.setItem('app_firms_registry', JSON.stringify(firms));
    localStorage.setItem('app_active_firm_id', newId);
    localStorage.setItem('active_firm_profile', JSON.stringify(newFirm));

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
    const index = firms.findIndex(f => f.id === firmId);
    if (index === -1) {
      throw new Error(`Firm with ID "${firmId}" not found.`);
    }
    
    const currentFirm = firms[index];
    const updatedFirm = { 
      ...currentFirm, 
      ...updatedFields, 
      id: currentFirm.id, 
      firm_id: currentFirm.id,
      updated_at: new Date().toISOString() 
    };
    
    firms[index] = updatedFirm;
    localStorage.setItem('app_firms_registry', JSON.stringify(firms));
    
    const activeFirm = getActiveFirm();
    if (activeFirm && activeFirm.id === firmId) {
      localStorage.setItem('active_firm_profile', JSON.stringify(updatedFirm));
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
  
  const firms = getFirmsRegistry().filter(f => f.id !== firmId);
  localStorage.setItem('app_firms_registry', JSON.stringify(firms));
  
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
    `financial_years_${firmId}`
  ];
  
  firmKeysToPurge.forEach(k => {
    localStorage.removeItem(k);
  });
  
  if (firms.length > 0) {
    localStorage.setItem('app_active_firm_id', firms[0].id);
    localStorage.setItem('active_firm_profile', JSON.stringify(firms[0]));
  } else {
    localStorage.removeItem('app_active_firm_id');
    localStorage.removeItem('active_firm_profile');
  }
  
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

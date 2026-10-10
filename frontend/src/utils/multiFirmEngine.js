// frontend/src/utils/multiFirmEngine.js

/**
 * Retrieve the list of all created enterprise firm profiles from localStorage with de-duplication
 */
export const getFirmsRegistry = () => {
  try {
    const raw = localStorage.getItem('app_firms_registry');
    let firms = [];
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) firms = parsed;
      } catch (e) {}
    }
    
    // Fallback: Check if there is an active firm profile created via initialization engine
    const activeRaw = localStorage.getItem('active_firm_profile');
    if (activeRaw) {
      try {
        const activeObj = JSON.parse(activeRaw);
        if (activeObj && (activeObj.id || activeObj.firm_id)) {
          const activeId = activeObj.id || activeObj.firm_id;
          if (!firms.some(f => (f.id === activeId || f.firm_id === activeId))) {
            firms.push(activeObj);
          }
        }
      } catch (e) {}
    }

    // Intelligent De-duplication by Firm Name to prevent multiple profiles of the same firm
    const uniqueMap = new Map();
    firms.forEach(f => {
      if (f && (f.id || f.firm_id || f.legal_name)) {
        const fName = (f.legal_name || f.trade_name || f.name || 'AccountBook Firm').trim().toLowerCase();
        if (!uniqueMap.has(fName)) {
          uniqueMap.set(fName, {
            ...f,
            id: f.id || f.firm_id,
            firm_id: f.id || f.firm_id
          });
        }
      }
    });

    const finalFirms = Array.from(uniqueMap.values());
    if (finalFirms.length > 0 && JSON.stringify(finalFirms) !== raw) {
      localStorage.setItem('app_firms_registry', JSON.stringify(finalFirms));
    }

    return finalFirms;
  } catch {
    return [];
  }
};

/**
 * Get the currently active firm profile object intelligently
 */
export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    if (firms.length === 0) return null;

    const activeId = localStorage.getItem('app_active_firm_id');
    let match = firms.find(f => f.id === activeId || f.firm_id === activeId);
    
    if (match) return match;

    // Fallback to first available clean firm if active ID is not set or invalid
    localStorage.setItem('app_active_firm_id', firms[0].id || firms[0].firm_id);
    localStorage.setItem('active_firm_profile', JSON.stringify(firms[0]));
    return firms[0];
  } catch {
    return null;
  }
};

/**
 * Switch the active firm context safely across the application
 */
export const switchActiveFirm = (firmId) => {
  if (!firmId) throw new Error("Invalid firm ID provided for switching.");
  
  const firms = getFirmsRegistry();
  const targetFirm = firms.find(f => f.id === firmId || f.firm_id === firmId);
  
  if (!targetFirm) {
    throw new Error(`Firm profile with ID "${firmId}" not found in registry.`);
  }

  const cleanId = targetFirm.id || targetFirm.firm_id;
  localStorage.setItem('app_active_firm_id', cleanId);
  localStorage.setItem('active_firm_profile', JSON.stringify(targetFirm));

  // Broadcast events to trigger instant re-render across all active views & components
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  
  return true;
};

export const setActiveFirmId = switchActiveFirm;

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
    localStorage.setItem('app_firms_registry', JSON.stringify(firms));
    
    const activeFirm = getActiveFirm();
    if (activeFirm && (activeFirm.id === firmId || activeFirm.firm_id === firmId)) {
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

/**
 * Delete a firm profile and purge ALL of its strictly isolated storage buckets
 */
export const deleteFirmProfile = (firmId) => {
  if (!firmId) return false;

  const firms = getFirmsRegistry().filter(f => f.id !== firmId && f.firm_id !== firmId);
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
    const nextId = firms[0].id || firms[0].firm_id;
    localStorage.setItem('app_active_firm_id', nextId);
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

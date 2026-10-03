// frontend/src/utils/multiFirmEngine.js

/**
 * Retrieve the list of all created enterprise firm profiles from localStorage
 */
export const getFirmsRegistry = () => {
  try {
    const raw = localStorage.getItem('app_firms_registry');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    
    // Fallback: Check if there is an active firm profile created via initialization engine
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

/**
 * Get the currently active firm profile object
 */
export const getActiveFirm = () => {
  try {
    const firms = getFirmsRegistry();
    if (firms.length === 0) return null;

    const activeId = localStorage.getItem('app_active_firm_id');
    const match = firms.find(f => f.id === activeId);
    if (match) return match;

    // Fallback to first available firm if active ID is not set or invalid
    localStorage.setItem('app_active_firm_id', firms[0].id);
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
  const targetFirm = firms.find(f => f.id === firmId);
  
  if (!targetFirm) {
    throw new Error(`Firm profile with ID "${firmId}" not found in registry.`);
  }

  localStorage.setItem('app_active_firm_id', firmId);
  localStorage.setItem('active_firm_profile', JSON.stringify(targetFirm));

  // Broadcast events to trigger instant re-render across all active views & components
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  
  return true;
};

/**
 * Alias for active firm setter for backward compatibility
 */
export const setActiveFirmId = switchActiveFirm;

/**
 * Update specific fields of an existing firm profile
 */
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

/**
 * Delete a firm profile and purge its strictly isolated storage buckets
 */
export const deleteFirmProfile = (firmId) => {
  const firms = getFirmsRegistry().filter(f => f.id !== firmId);
  localStorage.setItem('app_firms_registry', JSON.stringify(firms));
  
  // Purge firm-scoped storage keys to prevent data leakage or stale data retention
  localStorage.removeItem(`app_accounts_${firmId}`);
  localStorage.removeItem(`account_heads_${firmId}`);
  localStorage.removeItem(`app_vouchers_${firmId}`);
  localStorage.removeItem(`account_book_vouchers_${firmId}`);
  localStorage.removeItem(`inventory_items_${firmId}`);
  localStorage.removeItem(`app_invoices_${firmId}`);
  localStorage.removeItem(`app_payroll_entities_${firmId}`);
  localStorage.removeItem(`app_payroll_work_logs_${firmId}`);

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

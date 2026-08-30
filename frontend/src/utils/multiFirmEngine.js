// frontend/src/utils/multiFirmEngine.js

export const checkIsFirstTimeUser = () => {
  const registry = JSON.parse(localStorage.getItem('app_all_firms_registry') || '[]');
  return registry.length === 0;
};

export const createInitialFirmProfile = (firmPayload) => {
  const firmId = `FIRM-${Date.now()}`;
  const newFirm = {
    id: firmId,
    legal_name: firmPayload.legal_name.trim(),
    industry_type: firmPayload.industry_type || 'TRADING',
    gstin: firmPayload.gstin ? firmPayload.gstin.trim().toUpperCase() : 'Unregistered',
    office_address: firmPayload.office_address ? firmPayload.office_address.trim() : '',
    contact_mobile: firmPayload.contact_mobile ? firmPayload.contact_mobile.trim() : '',
    created_at: new Date().toISOString()
  };

  // 1. Register Firm in Registry
  const existingFirms = JSON.parse(localStorage.getItem('app_all_firms_registry') || '[]');
  existingFirms.push(newFirm);
  localStorage.setItem('app_all_firms_registry', JSON.stringify(existingFirms));

  // 2. Set as Active Firm Context
  localStorage.setItem('active_firm_profile', JSON.stringify(newFirm));

  // 3. Initialize Default Chart of Accounts for new firm
  const defaultAccounts = [
    { id: `ACC-DEF-1-${firmId}`, name: 'Cash-in-Hand A/C', primary_type: 'ASSETS', group_type: 'CASH', opening_balance: 0, balance_type: 'Dr' },
    { id: `ACC-DEF-2-${firmId}`, name: 'Main Bank Account', primary_type: 'ASSETS', group_type: 'BANK', opening_balance: 0, balance_type: 'Dr' },
    { id: `ACC-DEF-3-${firmId}`, name: 'General Sales Account', primary_type: 'INCOME', group_type: 'SALES_ACCOUNT', opening_balance: 0, balance_type: 'Cr' },
    { id: `ACC-DEF-4-${firmId}`, name: 'General Purchase Account', primary_type: 'EXPENSES', group_type: 'PURCHASE_ACCOUNT', opening_balance: 0, balance_type: 'Dr' }
  ];
  localStorage.setItem(`app_account_heads_${firmId}`, JSON.stringify(defaultAccounts));

  window.dispatchEvent(new Event('storage'));
  return newFirm;
};

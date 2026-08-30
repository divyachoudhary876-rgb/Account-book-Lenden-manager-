// frontend/src/utils/industryEngine.js

export const getIndustryDefaultInventory = (industryType = 'TRADING') => {
  if (industryType === 'BRICK_KILN') {
    return [
      { id: 'INV-BK-1', item_name: 'कच्ची ईंट (Raw Unbaked Brick)', stage: 'RAW_KACHI', current_qty: 0, uom: 'NOS' },
      { id: 'INV-BK-2', item_name: 'पक्की ईंट - अव्वल (Class A Brick)', stage: 'FINISHED_PAKKI', current_qty: 0, uom: 'NOS' },
      { id: 'INV-BK-3', item_name: 'पक्की ईंट - दोयं (Class B Brick)', stage: 'FINISHED_PAKKI', current_qty: 0, uom: 'NOS' },
      { id: 'INV-BK-4', item_name: 'चट्टा / रोड़ा (Roda)', stage: 'FINISHED_PAKKI', current_qty: 0, uom: 'NOS' }
    ];
  } else if (industryType === 'SERVICES') {
    return [
      { id: 'INV-SRV-1', item_name: 'Consulting Service / Professional Charges', stage: 'SERVICE', current_qty: 1, uom: 'JOB' }
    ];
  } else {
    // TRADING / MANUFACTURING / GENERAL BUSINESS
    return [
      { id: 'INV-GEN-1', item_name: 'Trading Goods Stock Item A', stage: 'GENERAL', current_qty: 0, uom: 'PCS' },
      { id: 'INV-GEN-2', item_name: 'General Material Stock Item B', stage: 'GENERAL', current_qty: 0, uom: 'KG' }
    ];
  }
};

export const filterMenuByIndustry = (industryType = 'TRADING') => {
  const isBhatta = industryType === 'BRICK_KILN';

  return [
    { id: 'dashboard', label: '1. Firm Dashboard & Overview', icon: '📊' },
    { id: 'firm_setup', label: '2. Firm Profile Settings', icon: '⚙️' },
    { id: 'create_account', label: '3. Create Account Head', icon: '➕' },
    { id: 'inventory', label: '4. Inventory & Stock Master', icon: '📦' },
    { id: 'billing', label: '5. Sales Billing & Invoicing', icon: '🧾' },
    { id: 'purchase', label: '6. Purchase Entry & Inward Stock', icon: '🛍️' },
    { id: 'vouchers', label: '7. Voucher Entry (JV/PV/RV)', icon: '📒' },
    ...(isBhatta ? [{ id: 'bhatta_prod', label: '8. Brick Production / Nikasi', icon: '🧱' }] : []),
    { id: 'settlement', label: '9. Bill Settlement (FIFO)', icon: '💳' },
    { id: 'ledger', label: '10. Account Milan & Ledger', icon: '📖' },
    { id: 'journal', label: '11. General Journal Register', icon: '📝' },
    { id: 'reports', label: '12. Financial Reports (P&L / BS)', icon: '📈' },
    { id: 'backup', label: '13. Data Backup & Protection', icon: '🔒' },
    { id: 'purge', label: '14. Clear Demo Data', icon: '🗑️' }
  ];
};

// frontend/src/utils/navigationRegistry.js

export const getDynamicWorkflowMenu = (businessCategory = 'TRADING') => {
  const cat = (businessCategory || 'TRADING').toUpperCase();

  let productionModule = null;
  if (cat.includes('BRICK') || cat.includes('BHATTA')) {
    productionModule = {
      order: 8,
      key: 'production',
      label: '8. Brick Production / Nikasi',
      icon: '🧱',
      type: 'view'
    };
  } else if (cat.includes('BIOMASS') || cat.includes('BRIQUETTE')) {
    productionModule = {
      order: 8,
      key: 'production',
      label: '8. Biomass Plant & Pressing',
      icon: '🪵',
      type: 'view'
    };
  } else if (cat.includes('MANUFACTURING')) {
    productionModule = {
      order: 8,
      key: 'production',
      label: '8. Production & Processing WIP',
      icon: '🏭',
      type: 'view'
    };
  }

  const rawMenu = [
    { order: 1, key: 'dashboard', label: '1. Firm Dashboard & Overview', icon: '📊', type: 'view' },
    { order: 2, key: 'firm_settings', label: '2. Firm Profile Settings', icon: '⚙️', type: 'view' },
    { order: 3, key: 'create_account', label: '3. Create Account Head', icon: '➕', type: 'modal' },
    { order: 4, key: 'inventory', label: '4. Inventory & Stock Master', icon: '📦', type: 'view' },
    { order: 5, key: 'sales', label: '5. Sales Billing & Invoicing', icon: '🧾', type: 'view' },
    { order: 6, key: 'purchase', label: '6. Purchase Entry & Inward Stock', icon: '🛍️', type: 'view' },
    { order: 7, key: 'vouchers', label: '7. Voucher Entry (JV/PV/RV)', icon: '📒', type: 'view' },
    ...(productionModule ? [productionModule] : []),
    { order: 9, key: 'settlement', label: '9. Bill Settlement (FIFO)', icon: '💳', type: 'view' },
    { order: 10, key: 'milan', label: '10. Account Milan & Ledger', icon: '📖', type: 'view' },
    { order: 11, key: 'journal', label: '11. General Journal Register', icon: '📝', type: 'view' },
    { order: 12, key: 'reports', label: '12. Financial Reports (P&L / BS)', icon: '📈', type: 'view' },
    { order: 13, key: 'backup', label: '13. Data Backup & Protection', icon: '🔒', type: 'view' },
    { order: 14, key: 'purge', label: '14. Clear Demo Data', icon: '🗑️', type: 'view', isDanger: true }
  ];

  return rawMenu;
};

export const filterMenuByIndustry = (items, category) => getDynamicWorkflowMenu(category);

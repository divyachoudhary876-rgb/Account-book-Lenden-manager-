// frontend/src/utils/navigationRegistry.js

/**
 * 14-Item Standard Accounting & Operational Workflow Registry
 * Dynamically tailored based on Firm Business Category (BRICK_KILN, TRADING, MANUFACTURING)
 */
export const getDynamicWorkflowMenu = (firmCategory = 'TRADING') => {
  const isBhatta = firmCategory === 'BRICK_KILN' || firmCategory === 'BHATTA';

  const menu = [
    { key: 'dashboard', label: 'Dashboard (डैशबोर्ड)', icon: '📊', category: 'CORE' },
    { key: 'create_account', label: 'Add New Account Head (नया खाता)', icon: '➕', category: 'MASTERS' },
    { key: 'sales', label: 'Sales / Tax Invoice (बिक्री बिल)', icon: '🧾', category: 'TRANSACTIONS' },
    { key: 'purchase', label: 'Purchase & Inward Stock (खरीद बिल)', icon: '📦', category: 'TRANSACTIONS' },
    { key: 'vouchers', label: 'Voucher Entry (JV / PV / RV / Contra)', icon: '📝', category: 'TRANSACTIONS' },
    { key: 'consumption', label: 'Fuel & Material Consumption (डीजल/खपत)', icon: '🚜', category: 'OPERATIONS' },
    { key: 'settlement', label: 'Bill Settlement / Khata Milan', icon: '⚖️', category: 'RECONCILIATION' },
    { key: 'inventory', label: 'Inventory & Stock Count (स्टॉक रजिस्टर)', icon: '📋', category: 'INVENTORY' }
  ];

  // Bhatta specific production module
  if (isBhatta) {
    menu.push({ key: 'production', label: 'Bhatta Kachi/Pakki Production (ईंट पकाई)', icon: '🧱', category: 'OPERATIONS' });
  }

  menu.push(
    { key: 'milan', label: 'Account Milan & Ledger (खाता बही)', icon: '📖', category: 'REPORTS' },
    { key: 'journal', label: 'General Journal Register (रोज़नामचा)', icon: '📑', category: 'REPORTS' },
    { key: 'reports', label: 'Financial Reports (P&L / Balance Sheet)', icon: '📈', category: 'REPORTS' },
    { key: 'firm_settings', label: 'Firm Profile & Settings (फर्म विवरण)', icon: '⚙️', category: 'SETTINGS' },
    { key: 'backup', label: 'Backup & Restore Center (डाटा बैकअप)', icon: '🛡️', category: 'SECURITY' },
    { key: 'purge', label: 'Factory Reset / Clear Data (डेटा रीसेट)', icon: '🗑️', category: 'SECURITY', isDanger: true }
  );

  return menu;
};

export const filterMenuByIndustry = getDynamicWorkflowMenu;

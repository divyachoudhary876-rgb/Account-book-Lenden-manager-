// frontend/src/utils/navigationRegistry.js

/**
 * Standard Multi-Sector Accounting & Operational Workflow Navigation Registry
 * Configures the complete 14+ workflow drawer items with dynamic categorization.
 * 
 * @param {string} firmCategory - 'BRICK_KILN', 'MANUFACTURING', 'TRADING', 'SERVICES', etc.
 * @returns {Array} List of navigational workflow menu objects
 */
export const getDynamicWorkflowMenu = (firmCategory = 'TRADING') => {
  const isManufacturingOrBhatta = 
    firmCategory === 'BRICK_KILN' || 
    firmCategory === 'BHATTA' || 
    firmCategory === 'MANUFACTURING' ||
    firmCategory === 'PRODUCTION';

  const menu = [
    // 1. CORE OVERVIEW
    { 
      key: 'dashboard', 
      label: 'Dashboard (डैशबोर्ड)', 
      icon: '📊', 
      category: 'CORE' 
    },
    
    // 2. MASTER DIRECTORIES
    { 
      key: 'create_account', 
      label: 'Add Account Head (नया खाता)', 
      icon: '➕', 
      category: 'MASTERS' 
    },
    
    // 3. DAILY FINANCIAL TRANSACTIONS
    { 
      key: 'sales', 
      label: 'Sales / Tax Invoice (बिक्री बिल)', 
      icon: '🧾', 
      category: 'TRANSACTIONS' 
    },
    { 
      key: 'purchase', 
      label: 'Purchase & Inward Stock (खरीद बिल)', 
      icon: '📦', 
      category: 'TRANSACTIONS' 
    },
    { 
      key: 'vouchers', 
      label: 'Voucher Entry (JV / PV / RV / Contra)', 
      icon: '📝', 
      category: 'TRANSACTIONS' 
    },

    // 4. INVENTORY & OPERATIONAL PROCESSES
    { 
      key: 'consumption', 
      label: 'Fuel & Material Consumption (डीजल/खपत)', 
      icon: '🚜', 
      category: 'OPERATIONS' 
    }
  ];

  // 5. PRODUCTION / MANUFACTURING MODULE (Always enabled for Bhatta & Manufacturing firms)
  if (isManufacturingOrBhatta) {
    menu.push({ 
      key: 'production', 
      label: 'Production & Conversion (ईंट पकाई / निर्माण)', 
      icon: '🧱', 
      category: 'OPERATIONS' 
    });
  }

  // 6. RECONCILIATION, STOCK & AUDIT REPORTS
  menu.push(
    { 
      key: 'settlement', 
      label: 'Bill Settlement / Khata Milan', 
      icon: '⚖️', 
      category: 'RECONCILIATION' 
    },
    { 
      key: 'inventory', 
      label: 'Inventory & Stock Count (स्टॉक रजिस्टर)', 
      icon: '📋', 
      category: 'INVENTORY' 
    },
    { 
      key: 'milan', 
      label: 'Account Milan & Ledger (खाता बही)', 
      icon: '📖', 
      category: 'REPORTS' 
    },
    { 
      key: 'journal', 
      label: 'General Journal Register (रोज़नामचा)', 
      icon: '📑', 
      category: 'REPORTS' 
    },
    { 
      key: 'reports', 
      label: 'Financial Reports (P&L / Balance Sheet)', 
      icon: '📈', 
      category: 'REPORTS' 
    },

    // 7. SETTINGS & SYSTEM SECURITY
    { 
      key: 'firm_settings', 
      label: 'Firm Profile & Settings (फर्म विवरण)', 
      icon: '⚙️', 
      category: 'SETTINGS' 
    },
    { 
      key: 'backup', 
      label: 'Backup & Restore Center (डाटा बैकअप)', 
      icon: '🛡️', 
      category: 'SECURITY' 
    },
    { 
      key: 'purge', 
      label: 'Factory Reset / Clear Data (डेटा रीसेट)', 
      icon: '🗑️', 
      category: 'SECURITY', 
      isDanger: true 
    }
  );

  return menu;
};

/**
 * Named Export Aliases for Rollup Bundler & Backwards Compatibility
 */
export const filterMenuByIndustry = getDynamicWorkflowMenu;
export const getNavigationMenuItems = getDynamicWorkflowMenu;

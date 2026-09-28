// frontend/src/utils/navigationRegistry.js

/**
 * Enterprise Multi-Sector Dynamic Workflow Navigation Registry
 * Configures tailored menu items, labels, and sector-specific icons based on active firm category.
 */
export const getDynamicWorkflowMenu = (firmCategory = 'TRADING') => {
  const cat = String(firmCategory || '').toUpperCase();

  const isBrickKiln = cat.includes('BRICK') || cat.includes('BHATTA') || cat.includes('CLAY');
  const isBiomass = cat.includes('BIOMASS') || cat.includes('BRIQUETTE') || cat.includes('FUEL');
  const isTransport = cat.includes('TRANSPORT') || cat.includes('LOGISTICS') || cat.includes('VEHICLE');
  const isManufacturing = cat.includes('MANUFACTURING') || cat.includes('PRODUCTION') || cat.includes('FACTORY');

  // Common Core & Master Menus for all businesses
  const menu = [
    { 
      key: 'dashboard', 
      label: 'Dashboard (डैशबोर्ड)', 
      icon: '📊', 
      category: 'CORE' 
    },
    { 
      key: 'create_account', 
      label: 'Add Account Head (नया खाता)', 
      icon: '➕', 
      category: 'MASTERS' 
    },
    { 
      key: 'sales', 
      label: isBrickKiln ? 'Brick Sales / Tax Invoice (ईंट बिक्री बिल)' : 'Sales / Tax Invoice (बिक्री बिल)', 
      icon: '🧾', 
      category: 'TRANSACTIONS' 
    },
    { 
      key: 'purchase', 
      label: isBrickKiln ? 'Raw Material Purchase (मिट्टी/कोयला खरीद)' : 'Purchase & Inward Stock (खरीद बिल)', 
      icon: '📦', 
      category: 'TRANSACTIONS' 
    },
    { 
      key: 'vouchers', 
      label: 'Voucher Entry (JV / PV / RV / Contra)', 
      icon: '📝', 
      category: 'TRANSACTIONS' 
    }
  ];

  // 1. Brick Kiln & Clay Works Specific Operations
  if (isBrickKiln) {
    menu.push(
      { 
        key: 'consumption', 
        label: 'Fuel & Material Consumption (कोयला/डीजल खपत)', 
        icon: '⛽', 
        category: 'OPERATIONS' 
      },
      { 
        key: 'production', 
        label: 'Production & Chamber Pakai (ईंट पकाई / निर्माण)', 
        icon: '🧱', 
        category: 'OPERATIONS' 
      }
    );
  } 
  // 2. Biomass Briquettes & Manufacturing Operations
  else if (isBiomass || isManufacturing) {
    menu.push(
      { 
        key: 'consumption', 
        label: 'Raw Material Consumption (कच्चा माल खपत)', 
        icon: '⚙️', 
        category: 'OPERATIONS' 
      },
      { 
        key: 'production', 
        label: 'Finished Goods Production (उत्पादन व पैकिंग)', 
        icon: '🏭', 
        category: 'OPERATIONS' 
      }
    );
  } 
  // 3. Transport & Logistics Operations
  else if (isTransport) {
    menu.push(
      { 
        key: 'consumption', 
        label: 'Vehicle Fuel & Maintenance (डीजल एवं रख-रखाव)', 
        icon: '⛽', 
        category: 'OPERATIONS' 
      }
    );
  }

  // Common Labour, Payroll, and Audit Reports for all sectors
  menu.push(
    { 
      key: 'payroll', 
      label: isBrickKiln ? 'Labour, Pathai & Tractor Wages (मजदूरी/पथाई/वेतन)' : 'Labour & Employee Salary (वेतन एवं मजदूरी)', 
      icon: '👷', 
      category: 'OPERATIONS' 
    },
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

export const filterMenuByIndustry = getDynamicWorkflowMenu;
export const getNavigationMenuItems = getDynamicWorkflowMenu;

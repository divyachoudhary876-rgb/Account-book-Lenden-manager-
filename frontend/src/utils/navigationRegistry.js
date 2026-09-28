// frontend/src/utils/navigationRegistry.js

/**
 * Enterprise Multi-Sector Dynamic Workflow Navigation Registry
 * Configures tailored menu items, specialized sector modules, and category-specific icons.
 */
export const getDynamicWorkflowMenu = (firmCategory = 'TRADING') => {
  const cat = String(firmCategory || '').toUpperCase();

  const isBrickKiln = cat.includes('BRICK') || cat.includes('BHATTA') || cat.includes('CLAY');
  const isBiomass = cat.includes('BIOMASS') || cat.includes('BRIQUETTE') || cat.includes('FUEL');
  const isTransport = cat.includes('TRANSPORT') || cat.includes('LOGISTICS') || cat.includes('VEHICLE');
  const isManufacturing = cat.includes('MANUFACTURING') || cat.includes('PRODUCTION') || cat.includes('FACTORY');

  // Common Core & Master Menus
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
      label: isBrickKiln ? 'Brick Sales / Tax Invoice (ईंट बिक्री बिल)' : isTransport ? 'Freight / Transport Bill (लॉजिस्टिक बिल)' : 'Sales / Tax Invoice (बिक्री बिल)', 
      icon: '🧾', 
      category: 'TRANSACTIONS' 
    },
    { 
      key: 'purchase', 
      label: isBrickKiln ? 'Raw Material Purchase (मिट्टी/कोयला खरीद)' : isTransport ? 'Spare Parts & Tyre Purchase (स्पेयर पार्ट्स खरीद)' : 'Purchase & Inward Stock (खरीद बिल)', 
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

  // 1. BRICK KILN (ईंट भट्ठा) SPECIALIZED MENUS
  if (isBrickKiln) {
    menu.push(
      { 
        key: 'consumption', 
        label: 'Fuel & Coal Consumption (कोयला/डीजल खपत)', 
        icon: '⛽', 
        category: 'OPERATIONS' 
      },
      { 
        key: 'production', 
        label: 'Bhatta Production & Pakai (ईंट पकाई व निर्माण)', 
        icon: '🧱', 
        category: 'OPERATIONS' 
      },
      { 
        key: 'payroll', 
        label: 'Labour, Pathai & Tractor Wages (पथाई/मजदूरी/ट्रैक्टर)', 
        icon: '👷', 
        category: 'OPERATIONS' 
      }
    );
  } 
  // 2. BIOMASS & MANUFACTURING (बायोमास व विनिर्माण) SPECIALIZED MENUS
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
      },
      { 
        key: 'payroll', 
        label: 'Factory Worker & Staff Salary (कर्मचारी वेतन व मजदूरी)', 
        icon: '👷', 
        category: 'OPERATIONS' 
      }
    );
  } 
  // 3. TRANSPORT & LOGISTICS (ट्रांसपोर्ट व लॉजिस्टिक्स) SPECIALIZED MENUS
  else if (isTransport) {
    menu.push(
      { 
        key: 'consumption', 
        label: 'Vehicle Fuel & Maintenance (गाड़ी डीजल व रख-रखाव)', 
        icon: '⛽', 
        category: 'OPERATIONS' 
      },
      { 
        key: 'production', 
        label: 'Trip Sheet & LR Management (ट्रिप शीट व एलआर बुकिंग)', 
        icon: '🚚', 
        category: 'OPERATIONS' 
      },
      { 
        key: 'payroll', 
        label: 'Driver Salary & Advance (ड्राइवर वेतन व पेशगी)', 
        icon: '👨‍✈️', 
        category: 'OPERATIONS' 
      }
    );
  } 
  // 4. TRADING & GENERAL RETAIL SPECIALIZED MENUS
  else {
    menu.push(
      { 
        key: 'payroll', 
        label: 'Staff Salary & Employee Wages (स्टाफ वेतन व मजदूरी)', 
        icon: '👷', 
        category: 'OPERATIONS' 
      }
    );
  }

  // Common Reconciliation, Reports & Security Settings for all sectors
  menu.push(
    { 
      key: 'settlement', 
      label: 'Bill Settlement / Khata Milan', 
      icon: '⚖️', 
      category: 'RECONCILIATION' 
    },
    { 
      key: 'inventory', 
      label: 'Inventory & Stock Register (स्टॉक रजिस्टर)', 
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

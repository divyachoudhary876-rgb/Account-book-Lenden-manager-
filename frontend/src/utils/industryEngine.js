// frontend/src/utils/industryEngine.js

export const INDUSTRY_SECTORS = {
  MANUFACTURING: {
    label: 'Manufacturing & Processing (उत्पादन व प्रसंस्करण उद्योग)',
    categories: [
      { code: 'BRICK_KILN', label: 'Brick Kiln & Clay Works (ईंट भट्ठा उद्योग)', icon: '🧱', hasProduction: true },
      { code: 'BIOMASS_BRIQUETTES', label: 'Biomass Briquettes & Bio-Fuel (बायोमास ब्रिकेट्स व ईंधन)', icon: '🪵', hasProduction: true },
      { code: 'GENERAL_MANUFACTURING', label: 'General Goods Manufacturing (सामान्य विनिर्माण)', icon: '🏭', hasProduction: true },
      { code: 'TEXTILE_GARMENTS', label: 'Textile, Spinning & Garments (कपड़ा व परिधान उद्योग)', icon: '🧵', hasProduction: true }
    ]
  },
  TRADING: {
    label: 'Trading, Wholesale & Retail (व्यापार व वितरण)',
    categories: [
      { code: 'TRADING', label: 'General Wholesale & Distribution (थोक व सामान्य व्यापार)', icon: '📦', hasProduction: false },
      { code: 'RETAIL_FMCG', label: 'Retail & Supermarket / FMCG (फुटकर व किराना स्टोर)', icon: '🏪', hasProduction: false },
      { code: 'BUILDING_HARDWARE', label: 'Building Material, Cement & Steel (हार्डवेयर व भवन निर्माण)', icon: '🏗️', hasProduction: false },
      { code: 'AGRO_MANDI', label: 'Agro Commodity & Mandi Trading (अनाज, तूड़ी व कृषि उपज)', icon: '🌾', hasProduction: false }
    ]
  },
  SERVICES: {
    label: 'Services, Logistics & Infrastructure (सेवाएं व परिवहन)',
    categories: [
      { code: 'TRANSPORT_LOGISTICS', label: 'Transport, Logistics & Fleet (गाड़ी, माल ढुलाई व परिवहन)', icon: '🚛', hasProduction: false, hasFleet: true },
      { code: 'CONTRACTOR_CONSTRUCTION', label: 'Civil Works & Labour Contractors (ठेकेदारी व सिविल निर्माण)', icon: '🚜', hasProduction: false },
      { code: 'PETROLEUM_PUMP', label: 'Fuel Station / Diesel Pumps (पेट्रोल व डीजल पंप)', icon: '⛽', hasProduction: false },
      { code: 'PROFESSIONAL_SERVICES', label: 'Corporate, Consulting & IT (पेशेवर, सीए व आईटी सेवाएं)', icon: '💼', hasProduction: false }
    ]
  }
};

export const getAllAvailableCategories = () => {
  const list = [];
  Object.values(INDUSTRY_SECTORS).forEach(sector => {
    sector.categories.forEach(cat => list.push(cat));
  });
  return list;
};

export const getStarterAccountsForCategory = (categoryCode = 'TRADING') => {
  const baseAccounts = [
    { id: 'ACC-01', account_name: 'Cash-in-Hand', primary_type: 'ASSETS', sub_group: 'Cash-in-Hand (नकद रोकड़)', opening_balance: 0, balance_type: 'Dr', is_system_locked: true },
    { id: 'ACC-02', account_name: 'Primary Bank Account', primary_type: 'ASSETS', sub_group: 'Bank Accounts (बैंक खाते)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false },
    { id: 'ACC-03', account_name: 'Sales & Revenue', primary_type: 'INCOME', sub_group: 'Sales & Operating Revenue (बिक्री व मुख्य आय)', opening_balance: 0, balance_type: 'Cr', is_system_locked: true },
    { id: 'ACC-04', account_name: 'Proprietor Capital A/C', primary_type: 'EQUITY', sub_group: 'Proprietor / Partner Capital A/C (पूंजी खाता)', opening_balance: 0, balance_type: 'Cr', is_system_locked: false }
  ];

  if (categoryCode === 'BRICK_KILN') {
    baseAccounts.push(
      { id: 'ACC-BK-01', account_name: 'Coal & Fuel Supplier', primary_type: 'LIABILITIES', sub_group: 'Sundry Creditors (Supplier / लेनदार)', opening_balance: 0, balance_type: 'Cr' },
      { id: 'ACC-BK-02', account_name: 'Pathai & Labour Expenses', primary_type: 'EXPENSES', sub_group: 'Direct Expenses (पथाई / मजदूरी / निकासी)', opening_balance: 0, balance_type: 'Dr' },
      { id: 'ACC-BK-03', account_name: 'Raw Soil & Sand Purchases', primary_type: 'EXPENSES', sub_group: 'Raw Material & Coal Purchases (कोयला व कच्चा माल)', opening_balance: 0, balance_type: 'Dr' }
    );
  } else if (categoryCode === 'BIOMASS_BRIQUETTES') {
    baseAccounts.push(
      { id: 'ACC-BM-01', account_name: 'Mustard Husk / Agro Waste Supplier', primary_type: 'LIABILITIES', sub_group: 'Sundry Creditors (Supplier / लेनदार)', opening_balance: 0, balance_type: 'Cr' },
      { id: 'ACC-BM-02', account_name: 'Electricity & Plant Power', primary_type: 'EXPENSES', sub_group: 'Direct Expenses (पथाई / मजदूरी / निकासी)', opening_balance: 0, balance_type: 'Dr' },
      { id: 'ACC-BM-03', account_name: 'Diesel & Generator Fuel', primary_type: 'EXPENSES', sub_group: 'Diesel & Fuel Expenses (ईंधन खर्च)', opening_balance: 0, balance_type: 'Dr' }
    );
  } else if (categoryCode === 'TRANSPORT_LOGISTICS') {
    baseAccounts.push(
      { id: 'ACC-TR-01', account_name: 'Diesel Fuel Station', primary_type: 'LIABILITIES', sub_group: 'Diesel & Fuel Pumps (डीजल व पेट्रोल पंप)', opening_balance: 0, balance_type: 'Cr' },
      { id: 'ACC-TR-02', account_name: 'Driver & Toll Expenses', primary_type: 'EXPENSES', sub_group: 'Direct Expenses (पथाई / मजदूरी / निकासी)', opening_balance: 0, balance_type: 'Dr' },
      { id: 'ACC-TR-03', account_name: 'Vehicle Maintenance & Tyre Cost', primary_type: 'EXPENSES', sub_group: 'Repair & Maintenance (मरम्मत खर्च)', opening_balance: 0, balance_type: 'Dr' }
    );
  } else {
    baseAccounts.push(
      { id: 'ACC-TD-01', account_name: 'Primary Goods Supplier', primary_type: 'LIABILITIES', sub_group: 'Sundry Creditors (Supplier / लेनदार)', opening_balance: 0, balance_type: 'Cr' },
      { id: 'ACC-TD-02', account_name: 'Trade Purchases A/C', primary_type: 'EXPENSES', sub_group: 'Raw Material & Coal Purchases (कोयला व कच्चा माल)', opening_balance: 0, balance_type: 'Dr' },
      { id: 'ACC-TD-03', account_name: 'Freight & Inward Cartage', primary_type: 'EXPENSES', sub_group: 'Indirect Expenses (कार्यालय व सामान्य खर्च)', opening_balance: 0, balance_type: 'Dr' }
    );
  }

  return baseAccounts;
};

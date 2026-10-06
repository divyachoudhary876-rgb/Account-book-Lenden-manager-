// frontend/src/utils/accountMasterEngine.js

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';

export const ACCOUNT_HIERARCHY = {
  ASSETS: {
    label: 'ASSETS (संपत्तियां)',
    normalBalance: 'Dr',
    subGroups: [
      'Cash in Hand (रोकड़)',
      'Bank Accounts (बैंक खाते)',
      'Sundry Debtors (Customer / देनदार)',
      'Raw Material Inventory (कच्चा माल)',
      'Finished Goods Inventory (तैयार माल)',
      'Consumables & Fuel Stock (ईंधन/डीजल/स्टॉक)',
      'Loans & Advances (Given)',
      'Fixed Assets (Machinery / Vehicles / Land / Building)'
    ]
  },
  LIABILITIES: {
    label: 'LIABILITIES (देनदारियां / दायित्व)',
    normalBalance: 'Cr',
    subGroups: [
      'Sundry Creditors (Suppliers / लेनदार)',
      'Duties & Taxes (GST / TDS Payable)',
      'Bank Overdraft / CC Accounts',
      'Secured & Unsecured Loans',
      'Outstanding Expenses Payable'
    ]
  },
  EQUITY: {
    label: 'EQUITY & CAPITAL (पूंजी / स्वामित्व)',
    normalBalance: 'Cr',
    subGroups: [
      'Proprietor / Partner Capital Account',
      'Drawings Account (आहरण)',
      'Retained Earnings / Reserves'
    ]
  },
  EXPENSES: {
    label: 'EXPENSES (खर्च / लागत)',
    normalBalance: 'Dr',
    subGroups: [
      'Direct Production & Factory Expenses',
      'Direct Trading Purchases (व्यापारिक खरीद)',
      'Operating Fuel Costs (Tractor / Generator Diesel)',
      'Kiln Burning Fuel (Coal / Briquette / Husk)',
      'Direct Labor & Wages (मजदूरी)',
      'Machinery Maintenance & Repairs',
      'Freight & Cartage Inward (भाड़ा)',
      'Administrative & Office Expenses',
      'Selling & Distribution Expenses',
      'Financial Charges & Bank Interest'
    ]
  },
  INCOME: {
    label: 'INCOME / REVENUE (आय व बिक्री)',
    normalBalance: 'Cr',
    subGroups: [
      'Direct Sales Revenue (बिक्री)',
      'Contract & Manufacturing Receipts',
      'Service & Transport Freight Income',
      'Discount & Rebate Received',
      'Other Indirect Operating Income'
    ]
  }
};

// Universal Suggestions Directory by Industry Sector
export const INDUSTRY_SUGGESTION_BANKS = {
  // 1. Brick Kiln (ईंट भट्ठा उद्योग)
  BRICK_KILN: [
    { name: 'Ramlal (Eent Grahak)', categoryId: 'DEBTOR', type: 'ASSETS', subGroup: 'Sundry Debtors (Customer / देनदार)', balanceType: 'Dr' },
    { name: 'Jai Shree Ram Builders (Grahak)', categoryId: 'DEBTOR', type: 'ASSETS', subGroup: 'Sundry Debtors (Customer / देनदार)', balanceType: 'Dr' },
    { name: 'Sharma Coal & Fuel Agency', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Agarwal Cement & Building Material', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Mitti Supplier (Bhatta Soil)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Mustard Husk / Turi Supplier', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Ramesh Mistri (Pathai Thekedar)', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Sonu Mistri (Bharai & Pakai)', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Nikasi & Loading Labour Thekedar', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Mahindra Tractor Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Jhughi Construction A/c (Labour Sheds)', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Tractor Diesel & Fuel Expense', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Operating Fuel Costs (Tractor / Generator Diesel)', balanceType: 'Dr' },
    { name: 'Bhatta Repair & Maintenance A/c', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Machinery Maintenance & Repairs', balanceType: 'Dr' }
  ],

  // 2. Trading / Retail / Wholesale Shop (दुकान व व्यापार)
  TRADING: [
    { name: 'Walk-in Retail Customer (दुकान ग्राहक)', categoryId: 'DEBTOR', type: 'ASSETS', subGroup: 'Sundry Debtors (Customer / देनदार)', balanceType: 'Dr' },
    { name: 'Sharma Traders (Wholesale Grahak)', categoryId: 'DEBTOR', type: 'ASSETS', subGroup: 'Sundry Debtors (Customer / देनदार)', balanceType: 'Dr' },
    { name: 'National Distributors (Supplier)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Direct Factory Goods Supplier', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Shop Staff / Salesman Salary', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Shop Rent & Maintenance A/c', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Transport & Freight Inward (भाड़ा)', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Freight & Cartage Inward (भाड़ा)', balanceType: 'Dr' },
    { name: 'Electricity & Shop Power Bill', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Shop Furniture & Display Counter Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' }
  ],

  // 3. Transport & Logistics (ट्रांसपोर्ट व फ्लीट)
  TRANSPORT: [
    { name: 'Consignor / Freight Booking Party', categoryId: 'DEBTOR', type: 'ASSETS', subGroup: 'Sundry Debtors (Customer / देनदार)', balanceType: 'Dr' },
    { name: 'Fleet Truck / Dumper Owner (Market Vehicle)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Diesel Fuel Station (Fuel Creditor)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Tyre & Spare Parts Dealer', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Truck Driver & Helper Wages', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Toll Tax & Fastag Recharge Expense', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Direct Production & Factory Expenses', balanceType: 'Dr' },
    { name: 'Vehicle Insurance & Fitness RTO Fees', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Heavy Commercial Truck Fleet Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' }
  ],

  // 4. Manufacturing / Factory (कारखाना व उत्पादन)
  MANUFACTURING: [
    { name: 'Commercial Buyer / Distributor', categoryId: 'DEBTOR', type: 'ASSETS', subGroup: 'Sundry Debtors (Customer / देनदार)', balanceType: 'Dr' },
    { name: 'Raw Material Bulk Supplier', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Packaging Material Supplier', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Factory Production Labor & Wages', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Plant Machinery & Generator Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Factory Electricity & Power Cost', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Direct Production & Factory Expenses', balanceType: 'Dr' },
    { name: 'Plant Maintenance & Breakdown Repairs', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Machinery Maintenance & Repairs', balanceType: 'Dr' }
  ],

  // 5. Universal Defaults (Har Business me shamil)
  UNIVERSAL_COMMON: [
    { name: 'Cash in Hand (रोकड़ / गल्ला)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Cash in Hand (रोकड़)', balanceType: 'Dr' },
    { name: 'State Bank of India (Current A/c)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Punjab National Bank (PNB)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'HDFC Bank Current Account', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Business QR Code / UPI Account', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Bank Overdraft / CC Limit A/c', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Bank Overdraft / CC Accounts', balanceType: 'Cr' },
    { name: 'Proprietor Capital Account (स्वामी की पूंजी)', categoryId: 'CREDITOR', type: 'EQUITY', subGroup: 'Proprietor / Partner Capital Account', balanceType: 'Cr' },
    { name: 'Partner / Owner Drawings (निजी आहरण)', categoryId: 'DEBTOR', type: 'EQUITY', subGroup: 'Drawings Account (आहरण)', balanceType: 'Dr' },
    { name: 'GST Output Tax Payable (CGST + SGST)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Duties & Taxes (GST / TDS Payable)', balanceType: 'Cr' },
    { name: 'TDS Tax Payable Account', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Duties & Taxes (GST / TDS Payable)', balanceType: 'Cr' },
    { name: 'Chai-Pani, Guest & Office Refreshment', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Stationery, Printing & CA Audit Fees', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' }
  ]
};

// Retrieve industry-specific suggestions dynamically
export const getIndustrySuggestions = (firmCategory = 'BRICK_KILN') => {
  const cat = String(firmCategory || '').toUpperCase();
  let sectorList = INDUSTRY_SUGGESTION_BANKS.BRICK_KILN;

  if (cat.includes('TRANSPORT') || cat.includes('LOGISTIC') || cat.includes('FLEET')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.TRANSPORT;
  } else if (cat.includes('TRADING') || cat.includes('RETAIL') || cat.includes('WHOLESALE') || cat.includes('SHOP')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.TRADING;
  } else if (cat.includes('MANUFACTURING') || cat.includes('FACTORY') || cat.includes('PRODUCTION')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.MANUFACTURING;
  }

  return [...sectorList, ...INDUSTRY_SUGGESTION_BANKS.UNIVERSAL_COMMON];
};

export const STANDARD_ACCOUNT_SUGGESTIONS = getIndustrySuggestions('BRICK_KILN');

const resolveFirmId = (firmId) => {
  if (firmId && typeof firmId === 'string' && firmId.trim()) {
    return firmId.trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

// Robust Auto-Normalizer for Existing & Restored Accounts
export const upgradeAndNormalizeAccount = (acc) => {
  if (!acc) return null;
  const name = (acc.account_name || acc.name || '').trim();
  const lowerName = name.toLowerCase();
  let pType = String(acc.primary_type || acc.type || 'EXPENSES').toUpperCase();
  let sGroup = String(acc.sub_group || acc.group || 'General Ledger').trim();
  let bCat = acc.businessCategory || '';

  // Smart detect Capital & Drawings
  if (lowerName.includes('capital') || lowerName.includes('poonji') || lowerName.includes('पूंजी') || lowerName.includes('partner')) {
    bCat = 'CREDITOR';
    pType = 'EQUITY';
    sGroup = 'Proprietor / Partner Capital Account';
  } else if (lowerName.includes('drawing') || lowerName.includes('aaharan') || lowerName.includes('आहरण')) {
    bCat = 'DEBTOR';
    pType = 'EQUITY';
    sGroup = 'Drawings Account (आहरण)';
  } else if (lowerName.includes('cc limit') || lowerName.includes('overdraft') || lowerName.includes('od a/c')) {
    bCat = 'CREDITOR';
    pType = 'LIABILITIES';
    sGroup = 'Bank Overdraft / CC Accounts';
  } else if (!bCat || bCat === 'MANUFACTURING') {
    if (sGroup.toLowerCase().includes('debtor') || lowerName.includes('customer') || lowerName.includes('grahak')) {
      bCat = 'DEBTOR';
      pType = 'ASSETS';
      sGroup = 'Sundry Debtors (Customer / देनदार)';
    } else if (sGroup.toLowerCase().includes('creditor') || lowerName.includes('supplier') || lowerName.includes('vendor')) {
      bCat = 'CREDITOR';
      pType = 'LIABILITIES';
      sGroup = 'Sundry Creditors (Suppliers / लेनदार)';
    } else if (sGroup.toLowerCase().includes('labor') || sGroup.toLowerCase().includes('payable') || lowerName.includes('mistri') || lowerName.includes('thekedar') || lowerName.includes('driver')) {
      bCat = 'THEKEDAR';
      pType = 'LIABILITIES';
      sGroup = 'Outstanding Expenses Payable';
    } else if (lowerName.includes('cash') || lowerName.includes('bank') || lowerName.includes('रोकड़')) {
      bCat = 'BANK_CASH';
      pType = 'ASSETS';
      sGroup = lowerName.includes('cash') || lowerName.includes('रोकड़') ? 'Cash in Hand (रोकड़)' : 'Bank Accounts (बैंक खाते)';
    } else if (pType === 'ASSETS' && (lowerName.includes('tractor') || lowerName.includes('jcb') || lowerName.includes('asset') || lowerName.includes('truck') || lowerName.includes('machine'))) {
      bCat = 'ASSET';
      sGroup = 'Fixed Assets (Machinery / Vehicles / Land / Building)';
    } else if (pType === 'INCOME' || lowerName.includes('sale') || lowerName.includes('revenue')) {
      bCat = 'INCOME';
      sGroup = 'Direct Sales Revenue (बिक्री)';
    } else {
      bCat = 'EXPENSE';
      if (!sGroup || sGroup === 'General Ledger') sGroup = 'Direct Production & Factory Expenses';
    }
  }

  return {
    ...acc,
    account_name: name,
    name: name,
    sub_group: sGroup,
    group: sGroup,
    primary_type: pType,
    type: pType,
    businessCategory: bCat,
    opening_balance: Number(acc.opening_balance || acc.openingBalance || 0),
    openingBalance: Number(acc.opening_balance || acc.openingBalance || 0),
    balance_type: acc.balance_type || acc.balanceType || 'Dr',
    balanceType: acc.balance_type || acc.balanceType || 'Dr'
  };
};

export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  const activeFirmId = resolveFirmId(firmId);

  try {
    const primaryKey = `app_accounts_${activeFirmId}`;
    const primaryRaw = localStorage.getItem(primaryKey);

    if (primaryRaw) {
      const parsed = JSON.parse(primaryRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let isModified = false;
        const normalized = parsed.map(acc => {
          const up = upgradeAndNormalizeAccount(acc);
          if (up && (!acc.businessCategory || acc.businessCategory !== up.businessCategory)) {
            isModified = true;
          }
          return up;
        }).filter(Boolean);

        if (isModified) {
          localStorage.setItem(primaryKey, JSON.stringify(normalized));
          localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(normalized));
        }

        return normalized;
      }
    }

    const defaultAccounts = [
      { id: `ACC-${activeFirmId}-001`, account_name: 'Cash in Hand (रोकड़)', name: 'Cash in Hand (रोकड़)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Cash in Hand (रोकड़)', group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr', businessCategory: 'BANK_CASH', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${activeFirmId}-002`, account_name: 'State Bank of India (बैंक)', name: 'State Bank of India (बैंक)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Bank Accounts (बैंक खाते)', group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', businessCategory: 'BANK_CASH', is_system_locked: false, isSystemLocked: false },
      { id: `ACC-${activeFirmId}-003`, account_name: 'Sales Revenue Account', name: 'Sales Revenue Account', primary_type: 'INCOME', type: 'Income', sub_group: 'Direct Sales Revenue (बिक्री)', group: 'Sales / Revenue Accounts', opening_balance: 0, balance_type: 'Cr', businessCategory: 'INCOME', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${activeFirmId}-004`, account_name: 'Purchase Raw Material Account', name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Production & Factory Expenses', group: 'Raw Material Consumed', opening_balance: 0, balance_type: 'Dr', businessCategory: 'EXPENSE', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${activeFirmId}-005`, account_name: 'Labor & Pathai Expense (मजदूरी/लेबर)', name: 'Labor & Pathai Expense (मजदूरी/लेबर)', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Labor & Wages (मजदूरी)', group: 'Direct Labor & Wages (मज़दूर)', opening_balance: 0, balance_type: 'Dr', businessCategory: 'EXPENSE', is_system_locked: false, isSystemLocked: false },
      { id: `ACC-${activeFirmId}-006`, account_name: 'Capital Account (स्वामी की पूंजी)', name: 'Capital Account (स्वामी की पूंजी)', primary_type: 'EQUITY', type: 'Income', sub_group: 'Proprietor / Partner Capital Account', group: 'Capital / Owner Equity', opening_balance: 0, balance_type: 'Cr', businessCategory: 'EQUITY', is_system_locked: false, isSystemLocked: false }
    ];

    localStorage.setItem(primaryKey, JSON.stringify(defaultAccounts));
    localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  } catch (e) {
    console.error(`Error loading master accounts for firm ${activeFirmId}:`, e);
    return [];
  }
};

export const getExpenseAccountHeads = (firmId = 'FIRM-001') => {
  const accounts = getFirmMasterAccounts(firmId);
  return accounts.filter(a => 
    a.primary_type === 'EXPENSES' || 
    (a.sub_group && (
      a.sub_group.toLowerCase().includes('expense') || 
      a.sub_group.toLowerCase().includes('fuel') || 
      a.sub_group.toLowerCase().includes('labor') || 
      a.sub_group.toLowerCase().includes('repair')
    ))
  );
};

export const saveMasterAccount = (firmId = 'FIRM-001', accountData = {}) => {
  const activeFirmId = resolveFirmId(firmId);
  const accounts = getFirmMasterAccounts(activeFirmId);
  const cleanName = (accountData.account_name || accountData.name || '').trim();

  if (!cleanName) throw new Error('Account name khali nahi ho sakta.');

  const existingIdx = accounts.findIndex(
    a => (accountData.id && a.id === accountData.id) || 
         (a.account_name && a.account_name.toLowerCase() === cleanName.toLowerCase()) ||
         (a.name && a.name.toLowerCase() === cleanName.toLowerCase())
  );

  let oldName = '';
  if (existingIdx !== -1) {

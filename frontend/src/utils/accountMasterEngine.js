// frontend/src/utils/accountMasterEngine.js

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';
import { makeBilingualName } from './bilingualEngine.js';

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

// क्लीन इंडस्ट्री सजेशन बैंक (द्विभाषी)
export const INDUSTRY_SUGGESTION_BANKS = {
  BRICK_KILN: [
    { name: 'Coal / Fuel Supplier A/c', name_hi: 'कोयला सप्लायर खाता', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Soil / Mitti Supplier A/c', name_hi: 'मिट्टी सप्लायर खाता', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Mustard Husk / Turi Supplier', name_hi: 'तूड़ी / बायोमास सप्लायर', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Pathai Mistri Thekedar (Wages)', name_hi: 'पथाई ठेकेदार (मजदूरी)', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Bharai & Pakai Mistri (Wages)', name_hi: 'भराई व पकाई मिस्त्री', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Nikasi & Loading Thekedar', name_hi: 'निकासी व लोडिंग ठेकेदार', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Tractor Driver Wages A/c', name_hi: 'ट्रैक्टर ड्राइवर मजदूरी', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Tractor Machinery Asset', name_hi: 'ट्रैक्टर मशीनरी संपत्ति', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Jhughi Labour Sheds Asset', name_hi: 'झोपड़ी व लेबर शेड संपत्ति', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Kiln Chimney & Pawa Asset', name_hi: 'चिमनी व पावा संपत्ति', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Tractor Diesel & Fuel Expense', name_hi: 'ट्रैक्टर डीजल व ईंधन खर्च', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Operating Fuel Costs (Tractor / Generator Diesel)', balanceType: 'Dr' },
    { name: 'Kiln Coal Burning Expense', name_hi: 'कोयला झोंकाई खर्च', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Kiln Burning Fuel (Coal / Briquette / Husk)', balanceType: 'Dr' },
    { name: 'Kiln Maintenance & Repairs', name_hi: 'भट्ठा मरम्मत व रख-रखाव', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Machinery Maintenance & Repairs', balanceType: 'Dr' }
  ],
  BUILDING_MATERIAL: [
    { name: 'Cement Manufacturer Depot Supplier', name_hi: 'सीमेंट कंपनी / डिपो सप्लायर', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Steel TMT Sariya Distributor', name_hi: 'सरिया / स्टील डिस्ट्रीब्यूटर', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Sanitary & Hardware Wholesale Dealer', name_hi: 'हार्डवेयर व सेनेटरी डीलर', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Reti / Bajri / Grit Supplier', name_hi: 'रेती / बजरी सप्लायर', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Godown & Loading Labour Wages', name_hi: 'गोदाम लोडिंग लेबर मजदूरी', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Pickup Delivery Vehicle Driver', name_hi: 'पिकअप डिलीवरी ड्राइवर', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Commercial Delivery Vehicle Asset', name_hi: 'कमर्शियल वाहन संपत्ति', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Shop & Godown Shed Asset', name_hi: 'दुकान व गोदाम शेड संपत्ति', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Freight Inward Vehicle Bhada', name_hi: 'आवक गाड़ी भाड़ा', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Freight & Cartage Inward (भाड़ा)', balanceType: 'Dr' },
    { name: 'Shop & Godown Rent A/c', name_hi: 'दुकान व गोदाम किराया', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' }
  ],
  TRADING: [
    { name: 'Wholesale Goods Supplier', name_hi: 'होलसेल माल सप्लायर', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Shop Salesman & Staff Salary', name_hi: 'दुकान स्टाफ वेतन', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Shop Rent Account', name_hi: 'दुकान किराया खाता', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Freight Inward Cartage', name_hi: 'आवक ढुलाई / भाड़ा', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Freight & Cartage Inward (भाड़ा)', balanceType: 'Dr' },
    { name: 'Shop Electricity & Power Bill', name_hi: 'दुकान बिजली बिल', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Shop Furniture & Counter Asset', name_hi: 'दुकान फर्नीचर व काउंटर', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' }
  ],
  UNIVERSAL_COMMON: [
    { name: 'Cash in Hand (Tijori)', name_hi: 'रोकड़ (गल्ला/तिजोरी)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Cash in Hand (रोकड़)', balanceType: 'Dr' },
    { name: 'State Bank of India', name_hi: 'भारतीय स्टेट बैंक', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Punjab National Bank', name_hi: 'पंजाब नेशनल बैंक', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Bank Overdraft CC Limit A/c', name_hi: 'बैंक सीसी लिमिट / लोन', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Bank Overdraft / CC Accounts', balanceType: 'Cr' },
    { name: 'Proprietor Capital Account', name_hi: 'स्वामी पूंजी खाता', categoryId: 'CREDITOR', type: 'EQUITY', subGroup: 'Proprietor / Partner Capital Account', balanceType: 'Cr' },
    { name: 'Owner Personal Drawings A/c', name_hi: 'मालिक निजी आहरण', categoryId: 'DEBTOR', type: 'EQUITY', subGroup: 'Drawings Account (आहरण)', balanceType: 'Dr' },
    { name: 'Discount Received Account', name_hi: 'छूट मिली खाता', categoryId: 'EXPENSE', type: 'INCOME', subGroup: 'Discount & Rebate Received', balanceType: 'Cr' },
    { name: 'GST Output Tax Payable', name_hi: 'जीएसटी कर देय खाता', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Duties & Taxes (GST / TDS Payable)', balanceType: 'Cr' },
    { name: 'Office Refreshment Chai-Pani', name_hi: 'चाय-पानी व ऑफिस खर्च', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' }
  ]
};

export const resolveIndustryKey = (rawCat = '') => {
  const cat = String(rawCat || '').toUpperCase();
  if (cat.includes('BUILDING') || cat.includes('CEMENT') || cat.includes('STEEL') || cat.includes('HARDWARE')) return 'BUILDING_MATERIAL';
  if (cat.includes('TRANSPORT') || cat.includes('LOGISTIC') || cat.includes('FLEET')) return 'TRANSPORT';
  if (cat.includes('TRADING') || cat.includes('RETAIL') || cat.includes('SHOP') || cat.includes('STORE')) return 'TRADING';
  return 'BRICK_KILN';
};

export const getIndustrySuggestions = (firmCategory = '') => {
  const industryKey = resolveIndustryKey(firmCategory);
  const sectorList = INDUSTRY_SUGGESTION_BANKS[industryKey] || INDUSTRY_SUGGESTION_BANKS.BRICK_KILN;
  return [...sectorList, ...INDUSTRY_SUGGESTION_BANKS.UNIVERSAL_COMMON];
};

export const STANDARD_ACCOUNT_SUGGESTIONS = getIndustrySuggestions('BRICK_KILN');

const resolveFirmId = (firmId) => {
  if (firmId && typeof firmId === 'string' && firmId.trim()) {
    return firmId.trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

/**
 * पुराने व नए खातों को स्वतः द्वैध-भाषी "English (हिन्दी)" प्रारूप में रूपांतरित करता है
 */
export const upgradeAndNormalizeAccount = (acc) => {
  if (!acc) return null;
  const rawName = (acc.account_name || acc.name || '').trim();
  const rawHi = (acc.name_hi || acc.account_name_hi || '').trim();

  // बाइलिंगुअल मैपिंग जनरेट करें
  const bilingual = makeBilingualName(rawName, rawHi);
  const lowerName = bilingual.primary.toLowerCase();

  let pType = String(acc.primary_type || acc.type || 'EXPENSES').toUpperCase();
  let sGroup = String(acc.sub_group || acc.group || 'General Ledger').trim();
  let bCat = acc.businessCategory || '';
  let bType = acc.balance_type || acc.balanceType || 'Dr';

  // सख्त अकाउंटिंग मानक वर्गीकरण (GAAP / Ind AS Rule Overrides)
  if (lowerName.includes('discount received') || lowerName.includes('rebate received') || lowerName.includes('छूट मिली')) {
    bCat = 'EXPENSE';
    pType = 'INCOME';
    sGroup = 'Discount & Rebate Received';
    bType = 'Cr';
  } else if (lowerName.includes('capital') || lowerName.includes('poonji') || lowerName.includes('पूंजी') || lowerName.includes('malik')) {
    bCat = 'CREDITOR';
    pType = 'EQUITY';
    sGroup = 'Proprietor / Partner Capital Account';
    bType = 'Cr';
  } else if (lowerName.includes('drawing') || lowerName.includes('aaharan') || lowerName.includes('आहरण')) {
    bCat = 'DEBTOR';
    pType = 'EQUITY';
    sGroup = 'Drawings Account (आहरण)';
    bType = 'Dr';
  } else if (lowerName.includes('security deposit') || lowerName.includes('mining security') || lowerName.includes('धरोहर')) {
    bCat = 'ASSET';
    pType = 'ASSETS';
    sGroup = 'Loans & Advances (Given)';
    bType = 'Dr';
  } else if (lowerName.includes('stock account') || lowerName.includes('स्टॉक खाता') || lowerName.includes('finished goods')) {
    bCat = 'ASSET';
    pType = 'ASSETS';
    sGroup = 'Finished Goods Inventory (तैयार माल)';
    bType = 'Dr';
  } else if (lowerName.includes('cc limit') || lowerName.includes('overdraft') || lowerName.includes('od a/c')) {
    bCat = 'CREDITOR';
    pType = 'LIABILITIES';
    sGroup = 'Bank Overdraft / CC Accounts';
    bType = 'Cr';
  } else if (!bCat || bCat === 'MANUFACTURING') {
    if (sGroup.toLowerCase().includes('debtor') || lowerName.includes('customer') || lowerName.includes('grahak')) {
      bCat = 'DEBTOR';
      pType = 'ASSETS';
      sGroup = 'Sundry Debtors (Customer / देनदार)';
    } else if (sGroup.toLowerCase().includes('creditor') || lowerName.includes('supplier') || lowerName.includes('vendor')) {
      bCat = 'CREDITOR';
      pType = 'LIABILITIES';
      sGroup = 'Sundry Creditors (Suppliers / लेनदार)';
    } else if (sGroup.toLowerCase().includes('labor') || sGroup.toLowerCase().includes('thekedar') || lowerName.includes('driver')) {
      bCat = 'THEKEDAR';
      pType = 'LIABILITIES';
      sGroup = 'Outstanding Expenses Payable';
    } else if (lowerName.includes('cash') || lowerName.includes('bank') || lowerName.includes('रोकड़')) {
      bCat = 'BANK_CASH';
      pType = 'ASSETS';
      sGroup = lowerName.includes('cash') || lowerName.includes('रोकड़') ? 'Cash in Hand (रोकड़)' : 'Bank Accounts (बैंक खाते)';
    } else if (pType === 'ASSETS') {
      bCat = 'ASSET';
      sGroup = 'Fixed Assets (Machinery / Vehicles / Land / Building)';
    } else {
      bCat = 'EXPENSE';
      if (!sGroup || sGroup === 'General Ledger') sGroup = 'Direct Production & Factory Expenses';
    }
  }

  return {
    ...acc,
    account_name: bilingual.display,
    name: bilingual.display,
    name_en: bilingual.primary,
    name_hi: bilingual.secondary,
    display_name: bilingual.display,
    sub_group: sGroup,
    group: sGroup,
    primary_type: pType,
    type: pType,
    businessCategory: bCat,
    opening_balance: Number(acc.opening_balance || acc.openingBalance || 0),
    openingBalance: Number(acc.opening_balance || acc.openingBalance || 0),
    balance_type: bType,
    balanceType: bType
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
          if (up && (acc.account_name !== up.account_name || acc.display_name !== up.display_name)) {
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
      { id: `ACC-${activeFirmId}-001`, account_name: 'Cash in Hand', name_hi: 'रोकड़ (गल्ला)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Cash in Hand (रोकड़)', group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr', businessCategory: 'BANK_CASH', is_system_locked: true },
      { id: `ACC-${activeFirmId}-002`, account_name: 'State Bank of India', name_hi: 'भारतीय स्टेट बैंक', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Bank Accounts (बैंक खाते)', group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', businessCategory: 'BANK_CASH', is_system_locked: false },
      { id: `ACC-${activeFirmId}-003`, account_name: 'Sales Revenue Account', name_hi: 'बिक्री खाता', primary_type: 'INCOME', type: 'Income', sub_group: 'Direct Sales Revenue (बिक्री)', group: 'Sales / Revenue Accounts', opening_balance: 0, balance_type: 'Cr', businessCategory: 'INCOME', is_system_locked: true },
      { id: `ACC-${activeFirmId}-004`, account_name: 'Purchase Raw Material Account', name_hi: 'कच्चा माल खरीद खाता', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Production & Factory Expenses', group: 'Raw Material Consumed', opening_balance: 0, balance_type: 'Dr', businessCategory: 'EXPENSE', is_system_locked: true },
      { id: `ACC-${activeFirmId}-005`, account_name: 'Labor & Wages Expense', name_hi: 'मजदूरी व लेबर खर्च', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Labor & Wages (मजदूरी)', group: 'Direct Labor & Wages (मज़दूर)', opening_balance: 0, balance_type: 'Dr', businessCategory: 'EXPENSE', is_system_locked: false },
      { id: `ACC-${activeFirmId}-006`, account_name: 'Proprietor Capital Account', name_hi: 'स्वामी पूंजी खाता', primary_type: 'EQUITY', type: 'Income', sub_group: 'Proprietor / Partner Capital Account', group: 'Capital / Owner Equity', opening_balance: 0, balance_type: 'Cr', businessCategory: 'EQUITY', is_system_locked: false }
    ].map(acc => upgradeAndNormalizeAccount(acc));

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
  const rawInput = (accountData.account_name || accountData.name || '').trim();

  if (!rawInput) throw new Error('Account name khali nahi ho sakta.');

  // सिंगल इनपुट से स्वतः English (हिन्दी) ऑब्जेक्ट बनाएं
  const bilingual = makeBilingualName(rawInput, accountData.name_hi || '');
  const cleanDisplayName = bilingual.display;

  const existingIdx = accounts.findIndex(
    a => (accountData.id && a.id === accountData.id) || 
         (a.account_name && a.account_name.toLowerCase() === cleanDisplayName.toLowerCase()) ||
         (a.name_en && a.name_en.toLowerCase() === bilingual.primary.toLowerCase()) ||
         (a.name && a.name.toLowerCase() === bilingual.primary.toLowerCase())
  );

  let oldName = '';
  if (existingIdx !== -1) {
    oldName = accounts[existingIdx].account_name || accounts[existingIdx].name || '';
  }

  // अकाउंटिंग ओवरराइड्स (Rules)
  const lowerPrimary = bilingual.primary.toLowerCase();
  let finalType = accountData.primary_type || accountData.type || 'EXPENSES';
  let finalGroup = accountData.sub_group || accountData.group || 'Direct Production & Factory Expenses';
  let finalBalType = accountData.balance_type || accountData.balanceType || 'Dr';

  if (lowerPrimary.includes('discount received') || lowerPrimary.includes('छूट मिली')) {
    finalType = 'INCOME';
    finalGroup = 'Discount & Rebate Received';
    finalBalType = 'Cr';
  } else if (lowerPrimary.includes('capital') || lowerPrimary.includes('पूंजी')) {
    finalType = 'EQUITY';
    finalGroup = 'Proprietor / Partner Capital Account';
    finalBalType = 'Cr';
  } else if (lowerPrimary.includes('security') || lowerPrimary.includes('धरोहर')) {
    finalType = 'ASSETS';
    finalGroup = 'Loans & Advances (Given)';
    finalBalType = 'Dr';
  } else if (lowerPrimary.includes('stock account') || lowerPrimary.includes('स्टॉक खाता')) {
    finalType = 'ASSETS';
    finalGroup = 'Finished Goods Inventory (तैयार माल)';
    finalBalType = 'Dr';
  }

  const payload = {
    id: accountData.id || (existingIdx !== -1 ? accounts[existingIdx].id : `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    account_name: cleanDisplayName,
    name: cleanDisplayName,
    name_en: bilingual.primary,
    name_hi: bilingual.secondary,
    display_name: cleanDisplayName,
    primary_type: finalType,
    type: finalType,
    sub_group: finalGroup,
    group: finalGroup,
    opening_balance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    openingBalance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    balance_type: finalBalType,
    balanceType: finalBalType,
    phone: accountData.phone || '',
    mobile: accountData.phone || '',
    address: accountData.address || '',
    gstin: accountData.gstin || '',
    businessCategory: accountData.businessCategory || '',
    createdAtFY: accountData.createdAtFY || '',
    is_system_locked: Boolean(accountData.is_system_locked || accountData.isSystemLocked),
    isSystemLocked: Boolean(accountData.is_system_locked || accountData.isSystemLocked),
    updated_at: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    if ((accounts[existingIdx].is_system_locked || accounts[existingIdx].isSystemLocked) && accounts[existingIdx].account_name !== payload.account_name) {
      throw new Error(`System core account "${accounts[existingIdx].account_name}" ka naam nahi badla ja sakta.`);
    }
    accounts[existingIdx] = { ...accounts[existingIdx], ...payload };
  } else {
    accounts.push(payload);
  }

  localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(accounts));
  localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(accounts));

  // कैस्केड रिनेम इंजन (वाउचर्स एवं बिलों में नाम स्वतः अपडेट)
  if (oldName && oldName.trim().toLowerCase() !== cleanDisplayName.trim().toLowerCase()) {
    const oldTarget = oldName.trim().toLowerCase();
    const firmTargetKeys = [
      `app_vouchers_${activeFirmId}`,
      `account_book_vouchers_${activeFirmId}`,
      `sales_invoices_${activeFirmId}`,
      `purchase_bills_${activeFirmId}`,
      `bill_settlements_${activeFirmId}`,
      `app_payroll_entries_${activeFirmId}`
    ];

    firmTargetKeys.forEach(storageKey => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        let data = JSON.parse(raw);
        let modified = false;

        const deepReplace = (node) => {
          if (!node) return;
          if (Array.isArray(node)) {
            node.forEach(item => deepReplace(item));
          } else if (typeof node === 'object') {
            ['dr_account', 'cr_account', 'account_name', 'name', 'party', 'supplier', 'worker'].forEach(field => {
              if (typeof node[field] === 'string' && (node[field].trim().toLowerCase() === oldTarget || node[field].trim().toLowerCase() === bilingual.primary.toLowerCase())) {
                node[field] = cleanDisplayName;
                modified = true;
              }
            });
            if (Array.isArray(node.entries)) node.entries.forEach(e => deepReplace(e));
          }
        };

        deepReplace(data);
        if (modified) localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (err) {}
    });
  }

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return payload;
};

export const deleteMasterAccount = (firmId = 'FIRM-001', accountId = '') => {
  const activeFirmId = resolveFirmId(firmId);
  const accounts = getFirmMasterAccounts(activeFirmId);
  const target = accounts.find(a => a.id === accountId);

  if (!target) return false;
  if (target.is_system_locked || target.isSystemLocked) {
    throw new Error(`Core statutory ledger account "${target.account_name || target.name}" delete nahi ho sakta.`);
  }

  const updated = accounts.filter(a => a.id !== accountId);
  localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(updated));
  localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(updated));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

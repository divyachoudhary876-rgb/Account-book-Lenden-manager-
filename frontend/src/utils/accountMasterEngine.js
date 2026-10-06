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

// Clean Industry-Specific Suggestion Directory
export const INDUSTRY_SUGGESTION_BANKS = {
  // 1. Brick Kiln (ईंट भट्ठा उद्योग)
  BRICK_KILN: [
    { name: 'Koyla / Coal Supplier Account', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Mitti / Soil Supplier Account', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Turi / Husk Supplier Account', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Pathai Mistri Thekedar (लेबर)', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Bharai & Pakai Mistri (लेबर)', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Nikasi & Loading Thekedar (लेबर)', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Tractor Driver Wages A/c', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Tractor Asset Account', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Jhughi Construction A/c', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Bhatta Chimney & Kothi Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Tractor Diesel & Fuel Expense', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Operating Fuel Costs (Tractor / Generator Diesel)', balanceType: 'Dr' },
    { name: 'Kiln Coal Consumption (कोयला खर्च)', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Kiln Burning Fuel (Coal / Briquette / Husk)', balanceType: 'Dr' },
    { name: 'Bhatta Maintenance & Repair A/c', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Machinery Maintenance & Repairs', balanceType: 'Dr' }
  ],

  // 2. Building Material, Cement & Steel / Hardware (हार्डवेयर, सीमेंट व सरिया)
  BUILDING_MATERIAL: [
    { name: 'Cement Manufacturer / Depot Supplier', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Steel TMT Rebar Distributor (सरिया)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Sanitary & Hardware Wholesale Dealer', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Reti / Bajri / Grit Quarry Supplier', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Godown & Loading Labour Wages', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Pickup / Delivery Vehicle Driver', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Delivery Commercial Vehicle (Bolero/Pickup)', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Shop & Godown Infrastructure Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' },
    { name: 'Freight Inward (सीमेंट/सरिया गाड़ी भाड़ा)', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Freight & Cartage Inward (भाड़ा)', balanceType: 'Dr' },
    { name: 'Shop & Godown Rent A/c', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Loading / Unloading Labor Expense', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Direct Labor & Wages (मजदूरी)', balanceType: 'Dr' }
  ],

  // 3. General Trading / Retail / Kirana / Shop (व्यापार व दुकान)
  TRADING: [
    { name: 'Wholesale Goods Supplier (डिस्ट्रीब्यूटर)', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Shop Staff / Salesman Salary', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Shop Rent Account', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Freight & Cartage Inward (माल भाड़ा)', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Freight & Cartage Inward (भाड़ा)', balanceType: 'Dr' },
    { name: 'Shop Electricity & Power Bill', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Shop Furniture & Counter Asset', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' }
  ],

  // 4. Transport & Logistics (ट्रांसपोर्ट व फ्लीट)
  TRANSPORT: [
    { name: 'Diesel Fuel Station A/c', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Tyre & Spare Parts Dealer', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Sundry Creditors (Suppliers / लेनदार)', balanceType: 'Cr' },
    { name: 'Truck Driver & Helper Wages', categoryId: 'THEKEDAR', type: 'LIABILITIES', subGroup: 'Outstanding Expenses Payable', balanceType: 'Cr' },
    { name: 'Toll Tax & Fastag Recharge', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Direct Production & Factory Expenses', balanceType: 'Dr' },
    { name: 'Vehicle Insurance & RTO Tax', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Commercial Truck Asset A/c', categoryId: 'ASSET', type: 'ASSETS', subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)', balanceType: 'Dr' }
  ],

  // 5. Universal Defaults (All Firms)
  UNIVERSAL_COMMON: [
    { name: 'Cash in Hand (रोकड़)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Cash in Hand (रोकड़)', balanceType: 'Dr' },
    { name: 'State Bank of India (Current A/c)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Punjab National Bank (Current A/c)', categoryId: 'BANK_CASH', type: 'ASSETS', subGroup: 'Bank Accounts (बैंक खाते)', balanceType: 'Dr' },
    { name: 'Bank Overdraft / CC Limit A/c', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Bank Overdraft / CC Accounts', balanceType: 'Cr' },
    { name: 'Proprietor Capital Account (स्वामी पूंजी)', categoryId: 'CREDITOR', type: 'EQUITY', subGroup: 'Proprietor / Partner Capital Account', balanceType: 'Cr' },
    { name: 'Owner Personal Drawings (आहरण)', categoryId: 'DEBTOR', type: 'EQUITY', subGroup: 'Drawings Account (आहरण)', balanceType: 'Dr' },
    { name: 'GST Output Tax Payable', categoryId: 'CREDITOR', type: 'LIABILITIES', subGroup: 'Duties & Taxes (GST / TDS Payable)', balanceType: 'Cr' },
    { name: 'Office Refreshment & Chai-Pani', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' },
    { name: 'Electricity & Power Expense', categoryId: 'EXPENSE', type: 'EXPENSES', subGroup: 'Administrative & Office Expenses', balanceType: 'Dr' }
  ]
};

// Retrieve industry-specific suggestions dynamically
export const getIndustrySuggestions = (firmCategory = '') => {
  const cat = String(firmCategory || '').toUpperCase();
  let sectorList = INDUSTRY_SUGGESTION_BANKS.BRICK_KILN;

  if (cat.includes('BUILDING') || cat.includes('CEMENT') || cat.includes('STEEL') || cat.includes('HARDWARE')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.BUILDING_MATERIAL;
  } else if (cat.includes('TRANSPORT') || cat.includes('LOGISTIC') || cat.includes('FLEET')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.TRANSPORT;
  } else if (cat.includes('TRADING') || cat.includes('RETAIL') || cat.includes('WHOLESALE') || cat.includes('SHOP') || cat.includes('STORE')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.TRADING;
  } else if (cat.includes('BRICK') || cat.includes('BHATTA')) {
    sectorList = INDUSTRY_SUGGESTION_BANKS.BRICK_KILN;
  } else {
    sectorList = INDUSTRY_SUGGESTION_BANKS.BUILDING_MATERIAL;
  }

  return [...sectorList, ...INDUSTRY_SUGGESTION_BANKS.UNIVERSAL_COMMON];
};

export const STANDARD_ACCOUNT_SUGGESTIONS = getIndustrySuggestions('BUILDING_MATERIAL');

const resolveFirmId = (firmId) => {
  if (firmId && typeof firmId === 'string' && firmId.trim()) {
    return firmId.trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

export const upgradeAndNormalizeAccount = (acc) => {
  if (!acc) return null;
  const name = (acc.account_name || acc.name || '').trim();
  const lowerName = name.toLowerCase();
  let pType = String(acc.primary_type || acc.type || 'EXPENSES').toUpperCase();
  let sGroup = String(acc.sub_group || acc.group || 'General Ledger').trim();
  let bCat = acc.businessCategory || '';

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
    oldName = accounts[existingIdx].account_name || accounts[existingIdx].name || '';
  }

  const payload = {
    id: accountData.id || (existingIdx !== -1 ? accounts[existingIdx].id : `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
    account_name: cleanName,
    name: cleanName,
    primary_type: accountData.primary_type || accountData.type || 'EXPENSES',
    type: accountData.type || accountData.primary_type || 'Expenses',
    sub_group: accountData.sub_group || accountData.group || 'Direct Production & Factory Expenses',
    group: accountData.group || accountData.sub_group || 'Direct Production & Factory Expenses',
    opening_balance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    openingBalance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    balance_type: accountData.balance_type || accountData.balanceType || 'Dr',
    balanceType: accountData.balance_type || accountData.balanceType || 'Dr',
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

  if (oldName && oldName.trim().toLowerCase() !== cleanName.trim().toLowerCase()) {
    const oldTarget = oldName.trim().toLowerCase();

    const firmTargetKeys = [
      `app_vouchers_${activeFirmId}`,
      `account_book_vouchers_${activeFirmId}`,
      `sales_invoices_${activeFirmId}`,
      `app_sales_invoices_${activeFirmId}`,
      `app_invoices_${activeFirmId}`,
      `purchase_bills_${activeFirmId}`,
      `app_purchase_bills_${activeFirmId}`,
      `bill_settlements_${activeFirmId}`,
      `party_transactions_${activeFirmId}`,
      `transport_trips_${activeFirmId}`,
      `app_payroll_entries_${activeFirmId}`,
      `payroll_entries_${activeFirmId}`,
      `material_consumptions_${activeFirmId}`
    ];

    const matchFields = [
      'dr_account', 'cr_account', 'dr_party', 'cr_party',
      'account_name', 'accountName', 'name', 'party',
      'party_name', 'partyName', 'customer_name', 'customerName',
      'supplier_name', 'supplierName', 'customer_account', 'supplier_account',
      'customerParty', 'supplierParty', 'customerId', 'supplierId',
      'worker', 'worker_name', 'expense_ledger', 'linked_ledger_account', 
      'ledger_account', 'debit_account', 'credit_account'
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
            matchFields.forEach(field => {
              if (typeof node[field] === 'string' && node[field].trim().toLowerCase() === oldTarget) {
                node[field] = cleanName;
                modified = true;
              }
            });

            if (Array.isArray(node.entries)) {
              node.entries.forEach(entry => deepReplace(entry));
              if (modified) {
                node.dr_account = node.entries
                  .filter(e => e.type === 'Dr' || e.type === 'DR')
                  .map(e => e.account_name || e.party || cleanName)
                  .join(', ');
                node.cr_account = node.entries
                  .filter(e => e.type === 'Cr' || e.type === 'CR')
                  .map(e => e.account_name || e.party || cleanName)
                  .join(', ');
              }
            }

            if (Array.isArray(node.items)) {
              node.items.forEach(it => deepReplace(it));
            }

            Object.keys(node).forEach(key => {
              if (typeof node[key] === 'object' && node[key] !== null) {
                deepReplace(node[key]);
              }
            });
          }
        };

        deepReplace(data);

        if (modified) {
          localStorage.setItem(storageKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error(`[CASCADE RENAME ERROR] Failed updating bucket ${storageKey}:`, err);
      }
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
    throw new Error(`Core statutory ledger account "${target.account_name || target.name}" ko delete nahi kiya ja sakta.`);
  }

  const targetName = (target.account_name || target.name || '').trim().toLowerCase();

  const existingVouchers = getUniversalVouchersByFirm(activeFirmId) || [];
  const hasActiveTransactions = existingVouchers.some(v => {
    if (!v) return false;
    const dr = (v.dr_account || v.debit_account || v.dr_party || '').trim().toLowerCase();
    const cr = (v.cr_account || v.credit_account || v.cr_party || '').trim().toLowerCase();
    if (dr === targetName || cr === targetName) return true;

    if (Array.isArray(v.entries)) {
      return v.entries.some(e => (e.account_name || e.party || '').trim().toLowerCase() === targetName);
    }
    return false;
  });

  if (hasActiveTransactions) {
    throw new Error(`⚠️ Is account "${target.account_name || target.name}" par purane transactions darj hain. Pehle iske vouchers delete ya adjust karein.`);
  }

  const updated = accounts.filter(a => a.id !== accountId);
  localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(updated));
  localStorage.setItem

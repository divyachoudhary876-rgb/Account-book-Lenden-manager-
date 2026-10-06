// frontend/src/utils/accountMasterEngine.js

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';

export const ACCOUNT_HIERARCHY = {
  ASSETS: {
    label: 'ASSETS (à¤¸à¤‚à¤ªà¤¤à¥à¤¤à¤¿à¤¯à¤¾à¤‚)',
    normalBalance: 'Dr',
    subGroups: [
      'Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)',
      'Bank Accounts (à¤¬à¥ˆà¤‚à¤• à¤–à¤¾à¤¤à¥‡)',
      'Sundry Debtors (Customer / à¤¦à¥‡à¤¨à¤¦à¤¾à¤°)',
      'Raw Material Inventory (à¤•à¤šà¥à¤šà¤¾ à¤®à¤¾à¤²)',
      'Finished Goods Inventory (à¤¤à¥ˆà¤¯à¤¾à¤° à¤®à¤¾à¤²)',
      'Consumables & Fuel Stock (à¤ˆà¤‚à¤§à¤¨/à¤¡à¥€à¤œà¤² à¤¸à¥à¤Ÿà¥‰à¤•)',
      'Loans & Advances (Given)',
      'Fixed Assets (Machinery / Vehicles / Land)'
    ]
  },
  LIABILITIES: {
    label: 'LIABILITIES (à¤¦à¥‡à¤¨à¤¦à¤¾à¤°à¤¿à¤¯à¤¾à¤‚ / à¤¦à¤¾à¤¯à¤¿à¤¤à¥à¤µ)',
    normalBalance: 'Cr',
    subGroups: [
      'Sundry Creditors (Suppliers / à¤²à¥‡à¤¨à¤¦à¤¾à¤°)',
      'Duties & Taxes (GST / TDS Payable)',
      'Bank Overdraft / CC Accounts',
      'Secured & Unsecured Loans',
      'Outstanding Expenses Payable'
    ]
  },
  EQUITY: {
    label: 'EQUITY & CAPITAL (à¤ªà¥‚à¤‚à¤œà¥€ / à¤¸à¥à¤µà¤¾à¤®à¤¿à¤¤à¥à¤µ)',
    normalBalance: 'Cr',
    subGroups: [
      'Proprietor / Partner Capital Account',
      'Drawings Account (à¤†à¤¹à¤°à¤£)',
      'Retained Earnings / Reserves'
    ]
  },
  EXPENSES: {
    label: 'EXPENSES (à¤–à¤°à¥à¤š / à¤²à¤¾à¤—à¤¤)',
    normalBalance: 'Dr',
    subGroups: [
      'Direct Production & Factory Expenses',
      'Direct Production Expenses',
      'Operating Fuel Costs (Tractor / Generator Diesel)',
      'Kiln Burning Fuel (Coal / Briquette / Husk)',
      'Direct Labor & Pathai Expenses (à¤®à¤œà¤¦à¥‚à¤°à¥€)',
      'Machinery Maintenance & Repairs',
      'Freight & Cartage Inward (à¤­à¤¾à¤¡à¤¼à¤¾)',
      'Administrative & Office Expenses',
      'Selling & Distribution Expenses',
      'Financial Charges & Bank Interest'
    ]
  },
  INCOME: {
    label: 'INCOME / REVENUE (à¤†à¤¯ à¤µ à¤¬à¤¿à¤•à¥à¤°à¥€)',
    normalBalance: 'Cr',
    subGroups: [
      'Direct Sales Revenue (à¤¬à¤¿à¤•à¥à¤°à¥€)',
      'Contract & Manufacturing Receipts',
      'Discount & Rebate Received',
      'Other Indirect Operating Income'
    ]
  }
};

const resolveFirmId = (firmId) => {
  if (firmId && typeof firmId === 'string' && firmId.trim()) {
    return firmId.trim();
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  const activeFirmId = resolveFirmId(firmId);

  try {
    const primaryKey = `app_accounts_${activeFirmId}`;
    const primaryRaw = localStorage.getItem(primaryKey);

    if (primaryRaw) {
      const parsed = JSON.parse(primaryRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(acc => {
          const name = (acc.account_name || acc.name || '').trim();
          return {
            ...acc,
            account_name: name,
            name: name,
            sub_group: acc.sub_group || acc.group || 'General Ledger',
            group: acc.group || acc.sub_group || 'General Ledger',
            primary_type: acc.primary_type || acc.type || 'EXPENSES',
            type: acc.type || acc.primary_type || 'Expenses',
            opening_balance: Number(acc.opening_balance || acc.openingBalance || 0),
            openingBalance: Number(acc.opening_balance || acc.openingBalance || 0),
            balance_type: acc.balance_type || acc.balanceType || 'Dr',
            balanceType: acc.balance_type || acc.balanceType || 'Dr'
          };
        });
      }
    }

    const defaultAccounts = [
      { id: `ACC-${activeFirmId}-001`, account_name: 'Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)', name: 'Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Cash in Hand (à¤°à¥‹à¤•à¤¡à¤¼)', group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${activeFirmId}-002`, account_name: 'State Bank of India (à¤¬à¥ˆà¤‚à¤•)', name: 'State Bank of India (à¤¬à¥ˆà¤‚à¤•)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Bank Accounts (à¤¬à¥ˆà¤‚à¤• à¤–à¤¾à¤¤à¥‡)', group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', is_system_locked: false, isSystemLocked: false },
      { id: `ACC-${activeFirmId}-003`, account_name: 'Sales Revenue Account', name: 'Sales Revenue Account', primary_type: 'INCOME', type: 'Income', sub_group: 'Direct Sales Revenue (à¤¬à¤¿à¤•à¥à¤°à¥€)', group: 'Sales / Revenue Accounts', opening_balance: 0, balance_type: 'Cr', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${activeFirmId}-004`, account_name: 'Purchase Raw Material Account', name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Production Expenses', group: 'Raw Material Consumed', opening_balance: 0, balance_type: 'Dr', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${activeFirmId}-005`, account_name: 'Labor & Pathai Expense (à¤®à¤œà¤¦à¥‚à¤°à¥€/à¤ªà¤¥à¤¾à¤ˆ)', name: 'Labor & Pathai Expense (à¤®à¤œà¤¦à¥‚à¤°à¥€/à¤ªà¤¥à¤¾à¤ˆ)', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Labor & Pathai Expenses (à¤®à¤œà¤¦à¥‚à¤°à¥€)', group: 'Direct Labor & Wages (à¤®à¤œà¤¼à¤¦à¥‚à¤°)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false, isSystemLocked: false },
      { id: `ACC-${activeFirmId}-006`, account_name: 'Capital Account (à¤¸à¥à¤µà¤¾à¤®à¥€ à¤•à¥€ à¤ªà¥‚à¤‚à¤œà¥€)', name: 'Capital Account (à¤¸à¥à¤µà¤¾à¤®à¥€ à¤•à¥€ à¤ªà¥‚à¤‚à¤œà¥€)', primary_type: 'EQUITY', type: 'Income', sub_group: 'Proprietor / Partner Capital Account', group: 'Capital / Owner Equity', opening_balance: 0, balance_type: 'Cr', is_system_locked: false, isSystemLocked: false }
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
      a.sub_group.toLowerCase().includes('burning')
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
    sub_group: accountData.sub_group || accountData.group || 'Direct Production Expenses',
    group: accountData.group || accountData.sub_group || 'Direct Production Expenses',
    opening_balance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    openingBalance: parseFloat(accountData.opening_balance || accountData.openingBalance || 0),
    balance_type: accountData.balance_type || accountData.balanceType || 'Dr',
    balanceType: accountData.balance_type || accountData.balanceType || 'Dr',
    phone: accountData.phone || '',
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

  // 1. Strictly firm-scoped keys only
  localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(accounts));
  localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(accounts));

  // 2. ULTIMATE MULTI-BUCKET CASCADE RENAME ENGINE
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

/**
 * Delete an Account Head with Foreign Key Dependency Check (Prevents Broken Orphan Vouchers)
 */
export const deleteMasterAccount = (firmId = 'FIRM-001', accountId = '') => {
  const activeFirmId = resolveFirmId(firmId);
  const accounts = getFirmMasterAccounts(activeFirmId);
  const target = accounts.find(a => a.id === accountId);

  if (!target) return false;

  // 1. Guard core statutory accounts
  if (target.is_system_locked || target.isSystemLocked) {
    throw new Error(`Core statutory ledger account "${target.account_name || target.name}" ko delete nahi kiya ja sakta.`);
  }

  const targetName = (target.account_name || target.name || '').trim().toLowerCase();

  // 2. Guard against orphan vouchers / active transaction dependency
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
    throw new Error(`âš ï¸ Is account "${target.account_name || target.name}" par purane transactions (vouchers/bills) darj hain. Account delete karne se pehle iske sabhi vouchers delete ya adjust karein, taaki Balance Sheet tally rahe.`);
  }

  const updated = accounts.filter(a => a.id !== accountId);
  localStorage.setItem(`app_accounts_${activeFirmId}`, JSON.stringify(updated));
  localStorage.setItem(`account_heads_${activeFirmId}`, JSON.stringify(updated));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

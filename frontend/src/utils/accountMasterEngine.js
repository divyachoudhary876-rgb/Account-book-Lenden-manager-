// frontend/src/utils/accountMasterEngine.js

/**
 * Standard Statutory Account Hierarchy (Ind AS / Indian GAAP Aligned)
 */
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
      'Consumables & Fuel Stock (ईंधन/डीजल स्टॉक)',
      'Loans & Advances (Given)',
      'Fixed Assets (Machinery / Vehicles / Land)'
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
      'Direct Production Expenses',
      'Operating Fuel Costs (Tractor / Generator Diesel)',
      'Kiln Burning Fuel (Coal / Briquette / Husk)',
      'Direct Labor & Pathai Expenses (मजदूरी)',
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
      'Discount & Rebate Received',
      'Other Indirect Operating Income'
    ]
  }
};

/**
 * Retrieve master account heads strictly isolated for active firm
 * ZERO CROSS-FIRM POLLUTION: Global 'app_accounts' key has been completely eliminated.
 */
export const getFirmMasterAccounts = (firmId = 'FIRM-001') => {
  try {
    const primaryKey = `app_accounts_${firmId}`;
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
            primary_type: acc.primary_type || acc.type || 'Expenses',
            type: acc.type || acc.primary_type || 'Expenses',
            opening_balance: Number(acc.opening_balance || acc.openingBalance || 0),
            openingBalance: Number(acc.opening_balance || acc.openingBalance || 0),
            balance_type: acc.balance_type || acc.balanceType || 'Dr',
            balanceType: acc.balance_type || acc.balanceType || 'Dr'
          };
        });
      }
    }

    // Default starter accounts isolated to this firmId only
    const defaultAccounts = [
      { id: `ACC-${firmId}-001`, account_name: 'Cash in Hand (रोकड़)', name: 'Cash in Hand (रोकड़)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Cash in Hand (रोकड़)', group: 'Cash-in-Hand', opening_balance: 0, balance_type: 'Dr', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${firmId}-002`, account_name: 'State Bank of India (बैंक)', name: 'State Bank of India (बैंक)', primary_type: 'ASSETS', type: 'Assets', sub_group: 'Bank Accounts (बैंक खाते)', group: 'Bank Accounts', opening_balance: 0, balance_type: 'Dr', is_system_locked: false, isSystemLocked: false },
      { id: `ACC-${firmId}-003`, account_name: 'Sales Revenue Account', name: 'Sales Revenue Account', primary_type: 'INCOME', type: 'Income', sub_group: 'Direct Sales Revenue (बिक्री)', group: 'Sales / Revenue Accounts', opening_balance: 0, balance_type: 'Cr', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${firmId}-004`, account_name: 'Purchase Raw Material Account', name: 'Purchase Raw Material Account', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Production Expenses', group: 'Raw Material Consumed', opening_balance: 0, balance_type: 'Dr', is_system_locked: true, isSystemLocked: true },
      { id: `ACC-${firmId}-005`, account_name: 'Labor & Pathai Expense (मजदूरी/पथाई)', name: 'Labor & Pathai Expense (मजदूरी/पथाई)', primary_type: 'EXPENSES', type: 'Expenses', sub_group: 'Direct Labor & Pathai Expenses (मजदूरी)', group: 'Direct Labor & Wages (मज़दूर)', opening_balance: 0, balance_type: 'Dr', is_system_locked: false, isSystemLocked: false },
      { id: `ACC-${firmId}-006`, account_name: 'Capital Account (स्वामी की पूंजी)', name: 'Capital Account (स्वामी की पूंजी)', primary_type: 'EQUITY', type: 'Income', sub_group: 'Proprietor / Partner Capital Account', group: 'Capital / Owner Equity', opening_balance: 0, balance_type: 'Cr', is_system_locked: false, isSystemLocked: false }
    ];

    localStorage.setItem(primaryKey, JSON.stringify(defaultAccounts));
    localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(defaultAccounts));
    return defaultAccounts;
  } catch (e) {
    console.error(`Error loading master accounts for firm ${firmId}:`, e);
    return [];
  }
};

/**
 * Filter and extract only Expense account heads
 */
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

/**
 * Save or Update an Account Head with Strict Firm-Isolation & Complete Cascade Rename
 */
export const saveMasterAccount = (firmId = 'FIRM-001', accountData = {}) => {
  const accounts = getFirmMasterAccounts(firmId);
  const cleanName = (accountData.account_name || accountData.name || '').trim();

  if (!cleanName) throw new Error('Account name cannot be empty.');

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
      throw new Error(`System core account "${accounts[existingIdx].account_name}" cannot be renamed.`);
    }
    accounts[existingIdx] = { ...accounts[existingIdx], ...payload };
  } else {
    accounts.push(payload);
  }

  // 1. Strictly firm-scoped keys only (NO GLOBAL KEYS OVERWRITTEN)
  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(accounts));
  localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(accounts));

  // 2. Cascade Rename Engine across Vouchers & Invoices of this specific firm
  if (oldName && oldName.trim().toLowerCase() !== cleanName.trim().toLowerCase()) {
    const oldTarget = oldName.trim().toLowerCase();

    // A. Update Vouchers for this firm
    const voucherKeys = [`app_vouchers_${firmId}`, `account_book_vouchers_${firmId}`];
    voucherKeys.forEach(vKey => {
      try {
        const raw = localStorage.getItem(vKey);
        if (!raw) return;
        const vouchers = JSON.parse(raw);
        let modified = false;

        vouchers.forEach(v => {
          if (!v) return;

          // Simple voucher account string update
          if (v.dr_account && v.dr_account.trim().toLowerCase() === oldTarget) {
            v.dr_account = cleanName;
            modified = true;
          }
          if (v.cr_account && v.cr_account.trim().toLowerCase() === oldTarget) {
            v.cr_account = cleanName;
            modified = true;
          }

          // Compound voucher entries array update
          if (Array.isArray(v.entries)) {
            v.entries.forEach(entry => {
              if (entry.account_name && entry.account_name.trim().toLowerCase() === oldTarget) {
                entry.account_name = cleanName;
                modified = true;
              }
              if (entry.party && entry.party.trim().toLowerCase() === oldTarget) {
                entry.party = cleanName;
                modified = true;
              }
            });

            // Rebuild compound display strings if modified
            if (modified) {
              v.dr_account = v.entries.filter(e => e.type === 'Dr' || e.type === 'DR').map(e => e.account_name || e.party).join(', ');
              v.cr_account = v.entries.filter(e => e.type === 'Cr' || e.type === 'CR').map(e => e.account_name || e.party).join(', ');
            }
          }
        });

        if (modified) {
          localStorage.setItem(vKey, JSON.stringify(vouchers));
        }
      } catch (err) {
        console.error(`Error cascading rename in voucher key ${vKey}:`, err);
      }
    });

    // B. Update Sales & Invoices for this firm
    const invoiceKeys = [`sales_invoices_${firmId}`, `purchase_bills_${firmId}`];
    invoiceKeys.forEach(iKey => {
      try {
        const raw = localStorage.getItem(iKey);
        if (!raw) return;
        const invoices = JSON.parse(raw);
        let modified = false;

        invoices.forEach(inv => {
          if (!inv) return;
          if (inv.party && inv.party.trim().toLowerCase() === oldTarget) {
            inv.party = cleanName;
            modified = true;
          }
          if (inv.customer_name && inv.customer_name.trim().toLowerCase() === oldTarget) {
            inv.customer_name = cleanName;
            modified = true;
          }
          if (inv.supplier_name && inv.supplier_name.trim().toLowerCase() === oldTarget) {
            inv.supplier_name = cleanName;
            modified = true;
          }
        });

        if (modified) {
          localStorage.setItem(iKey, JSON.stringify(invoices));
        }
      } catch (err) {
        console.error(`Error cascading rename in invoice key ${iKey}:`, err);
      }
    });
  }

  // Broadcast sync events to refresh all components instantly
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return payload;
};

/**
 * Delete an Account Head with Protected Master Guard
 */
export const deleteMasterAccount = (firmId = 'FIRM-001', accountId = '') => {
  const accounts = getFirmMasterAccounts(firmId);
  const target = accounts.find(a => a.id === accountId);

  if (!target) return false;

  if (target.is_system_locked || target.isSystemLocked) {
    throw new Error(`⚠️️ Cannot delete core ledger account "${target.account_name || target.name}".`);
  }

  const updated = accounts.filter(a => a.id !== accountId);
  localStorage.setItem(`app_accounts_${firmId}`, JSON.stringify(updated));
  localStorage.setItem(`account_heads_${firmId}`, JSON.stringify(updated));

  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

// frontend/src/utils/dashboardDataEngine.js

import { getUniversalVouchersByFirm } from './voucherPostingEngine.js';
import { getFirmMasterAccounts } from './accountMasterEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';
import { StorageService } from './storageSync.js';

/**
 * Compile real-time KPI metrics tailored to business category with strict multi-firm isolation
 */
export const getDynamicDashboardMetrics = (firm) => {
  const firmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const category = (firm?.category || firm?.business_category || firm?.businessCategory || 'TRADING').toUpperCase();

  // 1. Fetch strictly firm-isolated datasets
  const vouchers = getUniversalVouchersByFirm(firmId) || [];
  const stockItems = (typeof getStockItemsByFirm === 'function') 
    ? (getStockItemsByFirm(firmId) || []) 
    : (StorageService.getInventoryItems(firmId) || []);
  const accounts = getFirmMasterAccounts(firmId) || [];

  // 2. Double-entry ledger aggregation map
  const balanceMap = {};
  accounts.forEach(acc => {
    const name = (acc.account_name || acc.name || '').trim();
    if (!name) return;
    balanceMap[name] = {
      primary_type: (acc.primary_type || acc.type || 'EXPENSES').toUpperCase(),
      sub_group: acc.sub_group || acc.group || 'General',
      opening: parseFloat(acc.opening_balance || acc.openingBalance || 0),
      balance_type: acc.balance_type || acc.balanceType || 'Dr',
      dr: 0,
      cr: 0
    };
  });

  let totalSales = 0;
  let totalPurchases = 0;
  let totalDirectExpenses = 0;

  vouchers.forEach(v => {
    if (!v) return;
    const vType = String(v.voucher_type || v.type || '').toUpperCase();
    const vAmount = parseFloat(v.amount || v.total_amount || 0);

    // Track Revenue and Purchases by voucher type
    if (vType === 'SALES') totalSales += vAmount;
    if (vType === 'PURCHASE') totalPurchases += vAmount;

    // A. Handle compound multi-line entries
    if (Array.isArray(v.entries) && v.entries.length > 0) {
      v.entries.forEach(entry => {
        const accName = (entry.account_name || entry.party || '').trim();
        const amt = parseFloat(entry.amount || entry.debit || entry.credit || 0);
        const isDr = (entry.type || '').toUpperCase() === 'DR' || parseFloat(entry.debit || 0) > 0;
        const isCr = (entry.type || '').toUpperCase() === 'CR' || parseFloat(entry.credit || 0) > 0;

        if (accName && amt > 0) {
          if (!balanceMap[accName]) {
            balanceMap[accName] = {
              primary_type: isDr ? 'EXPENSES' : 'INCOME',
              sub_group: 'General',
              opening: 0,
              balance_type: isDr ? 'Dr' : 'Cr',
              dr: 0,
              cr: 0
            };
          }

          if (isDr) balanceMap[accName].dr += amt;
          if (isCr) balanceMap[accName].cr += amt;
        }
      });
    } else {
      // B. Handle single Dr/Cr vouchers
      const dr = (v.dr_account || v.debit_account || '').trim();
      const cr = (v.cr_account || v.credit_account || '').trim();

      if (dr && vAmount > 0) {
        if (!balanceMap[dr]) {
          balanceMap[dr] = { primary_type: 'EXPENSES', sub_group: 'General', opening: 0, balance_type: 'Dr', dr: 0, cr: 0 };
        }
        balanceMap[dr].dr += vAmount;
      }

      if (cr && vAmount > 0) {
        if (!balanceMap[cr]) {
          balanceMap[cr] = { primary_type: 'INCOME', sub_group: 'General', opening: 0, balance_type: 'Cr', dr: 0, cr: 0 };
        }
        balanceMap[cr].cr += vAmount;
      }
    }
  });

  let totalReceivables = 0; // Sundry Debtors
  let totalPayables = 0;    // Sundry Creditors
  let cashAndBank = 0;

  Object.entries(balanceMap).forEach(([name, acc]) => {
    const rawNet = (acc.balance_type === 'Dr' ? acc.opening : -acc.opening) + (acc.dr - acc.cr);
    const lowerName = name.toLowerCase();
    const type = (acc.primary_type || '').toUpperCase();
    const group = (acc.sub_group || '').toLowerCase();

    // Cash & Bank Balances
    if (lowerName.includes('cash') || lowerName.includes('bank') || group.includes('bank') || group.includes('cash')) {
      cashAndBank += rawNet;
    }
    // Receivables (Sundry Debtors)
    else if (type === 'ASSETS' || group.includes('debtor') || group.includes('customer') || lowerName.includes('debtor') || lowerName.includes('customer')) {
      if (rawNet > 0) {
        totalReceivables += rawNet;
      }
    }
    // Payables (Sundry Creditors)
    else if (type === 'LIABILITIES' || group.includes('creditor') || group.includes('supplier') || lowerName.includes('creditor') || lowerName.includes('supplier')) {
      if (rawNet < 0) {
        totalPayables += Math.abs(rawNet);
      }
    }
  });

  // 3. Stock Inventory Valuation
  const totalStockValuation = stockItems.reduce((acc, item) => {
    if (!item || item.is_service || item.item_type === 'SERVICE') return acc;
    const qty = parseFloat(item.current_stock || item.stock || item.qty || 0);
    const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
    return acc + (qty > 0 && rate > 0 ? (qty * rate) : 0);
  }, 0);

  // 4. Category-Specific KPIs (Brick Kiln, Biomass, Trading)
  const categorySpecifics = {
    category,
    cards: [],
    actions: []
  };

  if (category.includes('BRICK') || category.includes('BHATTA')) {
    const rawBricks = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('kacchi') || n.includes('raw') || n.includes('कच्ची');
    })?.current_stock || 0;

    const pakkiBricks = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('pakki') || n.includes('red') || n.includes('पक्की');
    })?.current_stock || 0;

    const coalStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('coal') || n.includes('fuel') || n.includes('कोयला');
    })?.current_stock || 0;

    categorySpecifics.cards = [
      { label: 'Raw Bricks (कच्ची ईंटें)', value: `${parseFloat(rawBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#0284c7', icon: '🧱' },
      { label: 'Finished Bricks (पक्की ईंटें)', value: `${parseFloat(pakkiBricks || 0).toLocaleString('en-IN')} Pcs`, color: '#d97706', icon: '🏗️' },
      { label: 'Fuel / Coal Stock', value: `${parseFloat(coalStock || 0).toFixed(2)} MT`, color: '#475569', icon: '⚡' },
      { label: 'Total Stock Value', value: `₹${totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📊' }
    ];

    categorySpecifics.actions = [
      { key: 'sales', label: 'Brick Dispatch / Sales', icon: '🧾', bg: '#0284c7' },
      { key: 'production', label: 'Bhatta Production Entry', icon: '🧱', bg: '#d97706' },
      { key: 'purchase', label: 'Fuel & Raw Purchases', icon: '🛍️', bg: '#059669' },
      { key: 'milan', label: 'Customer/Labour Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else if (category.includes('BIOMASS') || category.includes('BRIQUETTE')) {
    const huskStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('husk') || n.includes('तूड़ी') || n.includes('raw') || n.includes('sawdust');
    })?.current_stock || 0;

    const briquettesStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('briquette') || n.includes('finished') || n.includes('बायोमास');
    })?.current_stock || 0;

    const dieselStock = stockItems.find(i => {
      const n = (i.item_name || i.name || '').toLowerCase();
      return n.includes('diesel') || n.includes('डीजल');
    })?.current_stock || 0;

    categorySpecifics.cards = [
      { label: 'Raw Agro-Husk (तूड़ी स्टॉक)', value: `${parseFloat(huskStock || 0).toFixed(2)} MT`, color: '#d97706', icon: '🌾' },
      { label: 'Finished Briquettes', value: `${parseFloat(briquettesStock || 0).toFixed(2)} MT`, color: '#059669', icon: '🪵' },
      { label: 'Diesel / Fuel Stock', value: `${parseFloat(dieselStock || 0).toFixed(2)} Ltr`, color: '#0284c7', icon: '⛽' },
      { label: 'Stock Valuation', value: `₹${totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#4f46e5', icon: '💰' }
    ];

    categorySpecifics.actions = [
      { key: 'sales', label: 'Briquette Sales Invoice', icon: '🧾', bg: '#0284c7' },
      { key: 'purchase', label: 'Agro Raw Inward (+IN)', icon: '🌾', bg: '#d97706' },
      { key: 'inventory', label: 'Live Plant Inventory', icon: '📦', bg: '#059669' },
      { key: 'milan', label: 'Factory Account Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else {
    const lowStockCount = stockItems.filter(i => parseFloat(i.current_stock || i.stock || 0) <= 5).length;

    categorySpecifics.cards = [
      { label: 'Total Stock Valuation', value: `₹${totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📦' },
      { label: 'Active Product SKUs', value: `${stockItems.length} Items`, color: '#0284c7', icon: '🏷️' },
      { label: 'Total Sales Turnover', value: `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#0891b2', icon: '📈' },
      { label: 'Low Stock Warnings', value: `${lowStockCount} Items`, color: lowStockCount > 0 ? '#dc2626' : '#64748b', icon: '⚠️' }
    ];

    categorySpecifics.actions = [
      { key: 'sales', label: 'Create Sales Invoice', icon: '🧾', bg: '#0284c7' },
      { key: 'purchase', label: 'Stock Purchase Inward', icon: '🛍️', bg: '#059669' },
      { key: 'inventory', label: 'Stock & Price Master', icon: '📦', bg: '#0891b2' },
      { key: 'milan', label: 'Party Account Milan', icon: '📑', bg: '#7c3aed' }
    ];
  }

  return {
    receivables: Math.max(0, parseFloat(totalReceivables.toFixed(2))),
    payables: Math.max(0, parseFloat(totalPayables.toFixed(2))),
    cashAndBank: parseFloat(cashAndBank.toFixed(2)),
    totalSales: parseFloat(totalSales.toFixed(2)),
    totalPurchases: parseFloat(totalPurchases.toFixed(2)),
    totalStockValuation: parseFloat(totalStockValuation.toFixed(2)),
    categorySpecifics
  };
};

export const getCalculatedDashboardMetrics = getDynamicDashboardMetrics;

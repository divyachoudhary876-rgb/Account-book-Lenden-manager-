// frontend/src/utils/dashboardDataEngine.js

import { getAllUniversalVouchers, getAccountHeads } from './statementEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

export const getDynamicDashboardMetrics = (firm) => {
  const firmId = firm?.id || 'FIRM-001';
  const category = (firm?.category || firm?.business_category || 'TRADING').toUpperCase();

  const vouchers = getAllUniversalVouchers(firmId);
  const stockItems = getStockItemsByFirm(firmId);
  const accounts = getAccountHeads(firmId);

  const balanceMap = {};
  accounts.forEach(acc => {
    balanceMap[acc.account_name] = {
      primary_type: acc.primary_type,
      sub_group: acc.sub_group,
      opening: parseFloat(acc.opening_balance || 0),
      balance_type: acc.balance_type || 'Dr',
      dr: 0,
      cr: 0
    };
  });

  let totalSales = 0;
  let totalPurchases = 0;

  vouchers.forEach(v => {
    const amt = parseFloat(v.amount || 0);
    const dr = v.dr_account;
    const cr = v.cr_account;
    const type = (v.voucher_type || '').toUpperCase();

    if (!balanceMap[dr]) balanceMap[dr] = { primary_type: 'EXPENSES', sub_group: 'General', opening: 0, balance_type: 'Dr', dr: 0, cr: 0 };
    if (!balanceMap[cr]) balanceMap[cr] = { primary_type: 'INCOME', sub_group: 'General', opening: 0, balance_type: 'Cr', dr: 0, cr: 0 };

    balanceMap[dr].dr += amt;
    balanceMap[cr].cr += amt;

    if (type === 'SALES' || cr.toLowerCase().includes('sales')) totalSales += amt;
    if (type === 'PURCHASE' || dr.toLowerCase().includes('purchase') || dr.toLowerCase().includes('diesel')) totalPurchases += amt;
  });

  let totalReceivables = 0;
  let totalPayables = 0;
  let cashAndBank = 0;

  Object.entries(balanceMap).forEach(([name, acc]) => {
    const rawNet = (acc.balance_type === 'Dr' ? acc.opening : -acc.opening) + (acc.dr - acc.cr);
    const lowerName = name.toLowerCase();

    if (acc.primary_type === 'ASSETS' || lowerName.includes('debtor') || lowerName.includes('customer')) {
      if (rawNet > 0 && !lowerName.includes('cash') && !lowerName.includes('bank')) {
        totalReceivables += rawNet;
      }
    }
    if (acc.primary_type === 'LIABILITIES' || lowerName.includes('creditor') || lowerName.includes('supplier') || lowerName.includes('pump')) {
      if (rawNet < 0) {
        totalPayables += Math.abs(rawNet);
      }
    }
    if (lowerName.includes('cash') || lowerName.includes('bank') || lowerName.includes('sbi')) {
      cashAndBank += rawNet;
    }
  });

  const totalStockValuation = stockItems.reduce((acc, item) => {
    return acc + (parseFloat(item.current_stock || 0) * parseFloat(item.unit_purchase_price || 0));
  }, 0);

  const categorySpecifics = { category, cards: [], actions: [] };

  if (category.includes('BRICK') || category.includes('BHATTA')) {
    const rawBricks = stockItems.find(i => i.item_name.toLowerCase().includes('kacchi') || i.item_name.toLowerCase().includes('raw'))?.current_stock || 0;
    const pakkiBricks = stockItems.find(i => i.item_name.toLowerCase().includes('pakki') || i.item_name.toLowerCase().includes('red'))?.current_stock || 0;
    const coalStock = stockItems.find(i => i.item_name.toLowerCase().includes('coal') || i.item_name.toLowerCase().includes('fuel'))?.current_stock || 0;

    categorySpecifics.cards = [
      { label: 'Raw Bricks (कच्ची ईंटें)', value: `${parseFloat(rawBricks).toLocaleString('en-IN')} Pcs`, color: '#2563eb', icon: '🧱' },
      { label: 'Finished Bricks (पक्की ईंटें)', value: `${parseFloat(pakkiBricks).toLocaleString('en-IN')} Pcs`, color: '#d97706', icon: '🏗️' },
      { label: 'Fuel / Coal Stock', value: `${parseFloat(coalStock).toFixed(2)} MT`, color: '#475569', icon: '⚡' },
      { label: 'Total Inventory Value', value: `₹${totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📊' }
    ];

    categorySpecifics.actions = [
      { key: 'sales', label: 'Brick Dispatch / Sales', icon: '🧾', bg: '#2563eb' },
      { key: 'production', label: 'Bhatta Production Entry', icon: '🧱', bg: '#d97706' },
      { key: 'purchase', label: 'Fuel & Raw Purchases', icon: '🛍️', bg: '#059669' },
      { key: 'milan', label: 'Customer/Labour Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else if (category.includes('BIOMASS') || category.includes('BRIQUETTE')) {
    const huskStock = stockItems.find(i => i.item_name.toLowerCase().includes('husk') || i.item_name.toLowerCase().includes('तूड़ी') || i.item_name.toLowerCase().includes('raw'))?.current_stock || 0;
    const briquettesStock = stockItems.find(i => i.item_name.toLowerCase().includes('briquette') || i.item_name.toLowerCase().includes('finished'))?.current_stock || 0;

    categorySpecifics.cards = [
      { label: 'Raw Agro-Husk (तूड़ी स्टॉक)', value: `${parseFloat(huskStock).toFixed(2)} MT / Qnt`, color: '#d97706', icon: '🌾' },
      { label: 'Finished Briquettes', value: `${parseFloat(briquettesStock).toFixed(2)} MT`, color: '#059669', icon: '🪵' },
      { label: 'Diesel / Generator Fuel', value: `${(stockItems.find(i => i.item_name.toLowerCase().includes('diesel'))?.current_stock || 0)} Ltr`, color: '#0284c7', icon: '⛽' },
      { label: 'Stock Valuation', value: `₹${totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#4f46e5', icon: '💰' }
    ];

    categorySpecifics.actions = [
      { key: 'sales', label: 'Briquette Sales Invoice', icon: '🧾', bg: '#2563eb' },
      { key: 'purchase', label: 'Agro Raw Inward (+IN)', icon: '🌾', bg: '#d97706' },
      { key: 'inventory', label: 'Live Plant Inventory', icon: '📦', bg: '#059669' },
      { key: 'milan', label: 'Factory Account Milan', icon: '📑', bg: '#7c3aed' }
    ];
  } else {
    const lowStockCount = stockItems.filter(i => parseFloat(i.current_stock || 0) <= 5).length;

    categorySpecifics.cards = [
      { label: 'Total Stock Valuation', value: `₹${totalStockValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#059669', icon: '📦' },
      { label: 'Active Product SKUs', value: `${stockItems.length} Items`, color: '#2563eb', icon: '🏷️' },
      { label: 'Total Sales Turnover', value: `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: '#0891b2', icon: '📈' },
      { label: 'Low Stock Warnings', value: `${lowStockCount} Items`, color: lowStockCount > 0 ? '#dc2626' : '#64748b', icon: '⚠️' }
    ];

    categorySpecifics.actions = [
      { key: 'sales', label: 'Create Sales Invoice', icon: '🧾', bg: '#2563eb' },
      { key: 'purchase', label: 'Stock Purchase Inward', icon: '🛍️', bg: '#059669' },
      { key: 'inventory', label: 'Stock & Price Master', icon: '📦', bg: '#0891b2' },
      { key: 'milan', label: 'Party Account Milan', icon: '📑', bg: '#7c3aed' }
    ];
  }

  return {
    receivables: totalReceivables,
    payables: totalPayables,
    cashAndBank: cashAndBank,
    totalSales,
    totalPurchases,
    totalStockValuation,
    categorySpecifics
  };
};

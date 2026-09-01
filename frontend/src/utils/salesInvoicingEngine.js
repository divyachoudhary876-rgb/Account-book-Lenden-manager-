// frontend/src/utils/salesInvoicingEngine.js

import { getStockItemsByFirm } from './stockInventoryEngine.js';

// -----------------------------------------------------------------
// 1. SALES INVOICE PROCESSING (Outward Sales & Inventory Reduction)
// -----------------------------------------------------------------
export const processSalesInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const { customer_account, item_name, quantity, unit_rate, grand_total, invoice_number } = payload;

  if (!customer_account) {
    throw new Error("⚠️ Please select a Customer / Debtor account.");
  }

  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);

  if (qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Quantity and Rate must be positive numbers.");
  }

  // 1. Update Inventory (-OUT)
  const stockKey = `app_stock_items_${targetId}`;
  let stockItems = getStockItemsByFirm(targetId);

  let targetItem = stockItems.find(i => 
    i.id === item_name || 
    i.item_name.toLowerCase() === (item_name || '').toLowerCase()
  );

  if (!targetItem) {
    throw new Error("⚠️ Selected Stock Item not found in inventory.");
  }

  if (parseFloat(targetItem.current_stock || 0) < qty) {
    throw new Error(`⚠️ Insufficient stock! Available: ${targetItem.current_stock || 0} ${targetItem.unit || 'Units'}`);
  }

  targetItem.current_stock = parseFloat(targetItem.current_stock || 0) - qty;

  localStorage.setItem(stockKey, JSON.stringify(stockItems));
  localStorage.setItem('app_stock_items_global', JSON.stringify(stockItems));

  // 2. Post Sales Journal Voucher (Debit Customer, Credit Sales Income)
  const voucherKey = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(voucherKey);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }

  const calculatedTotal = grand_total ? parseFloat(grand_total) : (qty * rate);
  const salesVoucher = {
    id: `INV-${Date.now()}`,
    voucher_date: new Date().toISOString().split('T')[0],
    date: new Date().toISOString().split('T')[0],
    voucher_type: 'SALES',
    dr_account: customer_account,   // Customer Debit (Receivable)
    cr_account: 'Sales & Revenue',  // Sales Revenue Credit
    amount: calculatedTotal,
    narration: `Sales Invoice #${invoice_number || 'N/A'}: ${targetItem.item_name} (${qty} ${targetItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(salesVoucher);
  localStorage.setItem(voucherKey, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));

  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return salesVoucher;
};

// -----------------------------------------------------------------
// 2. PURCHASE INVOICE PROCESSING (Inward Stock & Vendor Addition)
// -----------------------------------------------------------------
export const processPurchaseInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const { supplier_account, item_name, quantity, unit_rate, grand_total, invoice_number } = payload;

  if (!supplier_account) {
    throw new Error("⚠️ Please select a valid Supplier / Vendor Account.");
  }

  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);

  if (qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Quantity and Purchase Rate must be greater than zero.");
  }

  // 1. Multi-Format Stock Item Lookup (ID or Name)
  const stockKey = `app_stock_items_${targetId}`;
  let stockItems = getStockItemsByFirm(targetId);

  let targetItem = stockItems.find(i => 
    i.id === item_name || 
    i.item_name.toLowerCase() === (item_name || '').toLowerCase()
  );

  // Auto-Create Stock Item if missing
  if (!targetItem) {
    const cleanItemName = (item_name && typeof item_name === 'string' && item_name.trim() !== '') ? item_name.trim() : 'Diesel';
    targetItem = {
      id: `ITEM-${Date.now()}`,
      item_name: cleanItemName,
      unit: cleanItemName.toLowerCase().includes('diesel') ? 'Liters' : 'Pcs',
      current_stock: 0,
      unit_purchase_price: rate
    };
    stockItems.push(targetItem);
  }

  // Increment Inventory (+IN)
  targetItem.current_stock = parseFloat(targetItem.current_stock || 0) + qty;
  targetItem.unit_purchase_price = rate;

  localStorage.setItem(stockKey, JSON.stringify(stockItems));
  localStorage.setItem('app_stock_items_global', JSON.stringify(stockItems));

  // 2. Post Purchase Voucher (Debit Diesel Expenses/Stock, Credit Supplier)
  const voucherKey = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const raw = localStorage.getItem(voucherKey);
    vouchers = raw ? JSON.parse(raw) : [];
  } catch (e) { vouchers = []; }

  const calculatedTotal = grand_total ? parseFloat(grand_total) : (qty * rate);
  const purchaseVoucher = {
    id: `PUR-${Date.now()}`,
    voucher_date: new Date().toISOString().split('T')[0],
    date: new Date().toISOString().split('T')[0],
    voucher_type: 'PURCHASE',
    dr_account: 'Diesel Expenses',
    cr_account: supplier_account,
    amount: calculatedTotal,
    narration: `Purchase Inward Bill #${invoice_number || 'N/A'}: ${targetItem.item_name} (${qty} ${targetItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(purchaseVoucher);
  localStorage.setItem(voucherKey, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));

  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return purchaseVoucher;
};

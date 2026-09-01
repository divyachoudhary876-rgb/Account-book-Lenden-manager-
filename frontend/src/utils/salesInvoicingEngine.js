// frontend/src/utils/salesInvoicingEngine.js

import { getAccountHeads } from './statementEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

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

  // 1. Multi-Format Stock Item Lookup (By ID, Name, or Normalized Text)
  const stockKey = `app_stock_items_${targetId}`;
  let stockItems = getStockItemsByFirm(targetId);

  let targetItem = stockItems.find(i => 
    i.id === item_name || 
    i.item_name.toLowerCase() === (item_name || '').toLowerCase()
  );

  // 2. Auto-Create Stock Item if missing (Prevents "Selected stock item not found" error)
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

  // 3. Increment Inventory (+IN)
  targetItem.current_stock = parseFloat(targetItem.current_stock || 0) + qty;
  targetItem.unit_purchase_price = rate;

  localStorage.setItem(stockKey, JSON.stringify(stockItems));
  localStorage.setItem('app_stock_items_global', JSON.stringify(stockItems));

  // 4. Double-Entry Financial Voucher Creation (Debit Purchase/Stock, Credit Supplier)
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
    dr_account: 'Diesel Expenses', // Expense / Stock Debit
    cr_account: supplier_account,  // Supplier Credit
    amount: calculatedTotal,
    narration: `Purchase Inward Bill #${invoice_number || 'N/A'}: ${targetItem.item_name} (${qty} ${targetItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(purchaseVoucher);
  localStorage.setItem(voucherKey, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));

  // Trigger UI update events
  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return purchaseVoucher;
};

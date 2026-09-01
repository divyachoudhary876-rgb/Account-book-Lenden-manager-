// frontend/src/utils/purchasePostingEngine.js

import { getStockItemsByFirm } from './stockInventoryEngine.js';
import { getAccountHeads } from './statementEngine.js';

export const recordUnifiedPurchase = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const {
    supplier_account,
    item_name,
    quantity,
    unit_rate,
    invoice_number,
    voucher_date
  } = payload;

  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const totalAmount = parseFloat((qty * rate).toFixed(2));
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const voucherId = `PUR-${Date.now()}`;

  if (!supplier_account || qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Supplier, Quantity (>0) aur Rate (>0) enter karna zaroori hai.");
  }

  // 1. STOCK INVENTORY SYNC (+IN)
  const stockKey = `app_stock_items_${targetId}`;
  let stockItems = getStockItemsByFirm(targetId);
  const normalizedItemName = (item_name || 'Diesel').trim();

  let targetItem = stockItems.find(
    i => i.id === normalizedItemName || i.item_name.toLowerCase() === normalizedItemName.toLowerCase()
  );

  if (!targetItem) {
    targetItem = {
      id: `ITEM-${Date.now()}`,
      item_name: normalizedItemName,
      unit: normalizedItemName.toLowerCase().includes('diesel') ? 'Liters' : 'Pcs',
      current_stock: qty,
      unit_purchase_price: rate,
      last_updated: new Date().toISOString()
    };
    stockItems.push(targetItem);
  } else {
    const existingStock = parseFloat(targetItem.current_stock || 0);
    const existingValuation = existingStock * parseFloat(targetItem.unit_purchase_price || 0);
    const newStock = existingStock + qty;
    const newValuation = existingValuation + totalAmount;

    targetItem.current_stock = newStock;
    targetItem.unit_purchase_price = newStock > 0 ? parseFloat((newValuation / newStock).toFixed(2)) : rate;
    targetItem.last_updated = new Date().toISOString();
  }

  localStorage.setItem(stockKey, JSON.stringify(stockItems));
  localStorage.setItem('app_stock_items_global', JSON.stringify(stockItems));

  // 2. JOURNAL VOUCHER POSTING (For Daybook & Financial Reports)
  const voucherKey = `app_vouchers_${targetId}`;
  let vouchers = [];
  try {
    const rawV = localStorage.getItem(voucherKey);
    vouchers = rawV ? JSON.parse(rawV) : [];
  } catch (e) { vouchers = []; }

  const expenseHead = normalizedItemName.toLowerCase().includes('diesel') 
    ? 'Diesel Expenses' 
    : `${normalizedItemName} Purchases`;

  const newVoucher = {
    id: voucherId,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'PURCHASE',
    dr_account: expenseHead,
    cr_account: supplier_account,
    amount: totalAmount,
    narration: `Purchase Inward Bill #${invoice_number || 'N/A'}: ${normalizedItemName} (${qty} ${targetItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(voucherKey, JSON.stringify(vouchers));
  localStorage.setItem('app_vouchers_global', JSON.stringify(vouchers));

  // 3. ACCOUNT MASTER REGISTRY SYNC (For Account Milan)
  const accKey = `app_accounts_${targetId}`;
  let accounts = [];
  try {
    const rawAcc = localStorage.getItem(accKey);
    accounts = rawAcc ? JSON.parse(rawAcc) : [];
  } catch (e) { accounts = []; }

  if (!accounts.some(a => a.account_name.toLowerCase() === supplier_account.toLowerCase())) {
    accounts.push({
      id: `ACC-${Date.now()}-1`,
      account_name: supplier_account,
      account_group: 'SUNDRY_CREDITORS',
      sub_group: 'SUNDRY_CREDITORS',
      opening_balance: 0,
      balance_type: 'Cr'
    });
  }

  if (!accounts.some(a => a.account_name.toLowerCase() === expenseHead.toLowerCase())) {
    accounts.push({
      id: `ACC-${Date.now()}-2`,
      account_name: expenseHead,
      account_group: 'DIRECT_EXPENSES',
      sub_group: 'DIRECT_EXPENSES',
      opening_balance: 0,
      balance_type: 'Dr'
    });
  }

  localStorage.setItem(accKey, JSON.stringify(accounts));
  localStorage.setItem('app_accounts_global', JSON.stringify(accounts));

  // 4. BROADCAST EVENTS
  window.dispatchEvent(new Event('accounts_master_updated'));
  window.dispatchEvent(new Event('storage'));

  return {
    voucherId,
    totalAmount,
    updatedStock: targetItem.current_stock,
    supplier: supplier_account
  };
};

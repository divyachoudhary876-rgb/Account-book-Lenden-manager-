// frontend/src/utils/purchasePostingEngine.js

import { updateStockItemQuantity } from './stockInventoryEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';
import { getAllUniversalVouchers } from './statementEngine.js';

export const recordUnifiedPurchase = (firmId = 'FIRM-001', payload) => {
  const { supplier_account, item_name, quantity, unit_rate, voucher_date, invoice_number, narration } = payload;
  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const totalAmount = parseFloat((qty * rate).toFixed(2));
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const cleanItem = (item_name || 'Diesel').trim();

  if (!supplier_account || qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Supplier, Quantity (>0) and Purchase Rate (>0) are mandatory.");
  }

  // 1. Stock +IN
  const updatedItem = updateStockItemQuantity(firmId, cleanItem, qty, rate);

  // 2. Journal Voucher
  const expenseHead = cleanItem.toLowerCase().includes('diesel') ? 'Diesel Expenses' : `${cleanItem} Purchases`;
  const vouchers = getAllUniversalVouchers(firmId);
  const newVoucher = {
    id: `PUR-${Date.now()}`,
    firm_id: firmId,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'PURCHASE',
    dr_account: expenseHead,
    cr_account: supplier_account,
    amount: totalAmount,
    quantity: qty,
    unit_rate: rate,
    item_name: cleanItem,
    reference_no: invoice_number || `PUR-${Date.now()}`,
    narration: narration || `Purchase Inward Bill #${invoice_number || 'N/A'}: ${cleanItem} (${qty} ${updatedItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(`app_vouchers_${firmId}`, JSON.stringify(vouchers));

  // 3. Register Accounts
  const accounts = getFirmMasterAccounts(firmId);
  if (!accounts.some(a => a.account_name.toLowerCase() === supplier_account.toLowerCase())) {
    saveMasterAccount(firmId, { account_name: supplier_account, primary_type: 'LIABILITIES', sub_group: 'Sundry Creditors (Supplier / लेनदार)', balance_type: 'Cr' });
  }
  if (!accounts.some(a => a.account_name.toLowerCase() === expenseHead.toLowerCase())) {
    saveMasterAccount(firmId, { account_name: expenseHead, primary_type: 'EXPENSES', sub_group: 'Direct Expenses (ईंधन व खरीद)', balance_type: 'Dr' });
  }

  window.dispatchEvent(new Event('app_state_updated'));
  return { voucherId: newVoucher.id, totalAmount, updatedStock: updatedItem.current_stock, party: supplier_account };
};

// frontend/src/utils/salesInvoicingEngine.js

import { getStockItemsByFirm, updateStockItemQuantity } from './stockInventoryEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';
import { getAllUniversalVouchers } from './statementEngine.js';

export const processSalesInvoiceSubmission = (firmId = 'FIRM-001', payload) => {
  const { customer_account, item_name, quantity, unit_rate, voucher_date, invoice_number, narration } = payload;
  const qty = parseFloat(quantity || 0);
  const rate = parseFloat(unit_rate || 0);
  const totalAmount = parseFloat((qty * rate).toFixed(2));
  const vDate = voucher_date || new Date().toISOString().split('T')[0];
  const cleanItem = (item_name || 'Item').trim();

  if (!customer_account || qty <= 0 || rate <= 0) {
    throw new Error("⚠️ Customer Account, Quantity (>0) and Selling Rate (>0) are mandatory.");
  }

  // 1. Stock Validation & Reduction
  const stockList = getStockItemsByFirm(firmId);
  const stockItem = stockList.find(s => s.item_name.toLowerCase() === cleanItem.toLowerCase());
  if (!stockItem) throw new Error(`⚠️ Item "${cleanItem}" inventory me nahi mila.`);
  if (parseFloat(stockItem.current_stock || 0) < qty) {
    throw new Error(`⚠️ Insufficient Stock! Available: ${stockItem.current_stock} ${stockItem.unit}`);
  }

  const updatedItem = updateStockItemQuantity(firmId, cleanItem, -qty, 0);

  // 2. Journal Voucher
  const vouchers = getAllUniversalVouchers(firmId);
  const newVoucher = {
    id: `INV-${Date.now()}`,
    firm_id: firmId,
    voucher_date: vDate,
    date: vDate,
    voucher_type: 'SALES',
    dr_account: customer_account,
    cr_account: 'Sales & Revenue',
    amount: totalAmount,
    quantity: qty,
    unit_rate: rate,
    item_name: cleanItem,
    reference_no: invoice_number || `INV-${Date.now()}`,
    narration: narration || `Sales Invoice #${invoice_number || 'N/A'}: ${cleanItem} (${qty} ${updatedItem.unit} @ ₹${rate})`,
    created_at: new Date().toISOString()
  };

  vouchers.unshift(newVoucher);
  localStorage.setItem(`app_vouchers_${firmId}`, JSON.stringify(vouchers));

  // 3. Register Accounts
  const accounts = getFirmMasterAccounts(firmId);
  if (!accounts.some(a => a.account_name.toLowerCase() === customer_account.toLowerCase())) {
    saveMasterAccount(firmId, { account_name: customer_account, primary_type: 'ASSETS', sub_group: 'Sundry Debtors (Customer / देनदार)', balance_type: 'Dr' });
  }

  window.dispatchEvent(new Event('app_state_updated'));
  return { voucherId: newVoucher.id, totalAmount, updatedStock: updatedItem.current_stock, party: customer_account };
};

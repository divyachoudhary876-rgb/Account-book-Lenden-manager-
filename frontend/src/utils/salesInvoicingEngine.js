// frontend/src/utils/salesInvoicingEngine.js

import { getStockItemsByFirm, updateStockMovement } from './stockInventoryEngine.js';
import { getAccountHeads } from './statementEngine.js';

export const processSalesInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  
  if (!payload.customer_account) throw new Error("⚠️ Please select or create a Customer Account.");
  if (!payload.item_id) throw new Error("⚠️ Please select a Stock Item.");
  
  const requestedQty = parseFloat(payload.quantity || 0);
  if (requestedQty <= 0) throw new Error("⚠️ Quantity must be greater than 0.");

  const masterItems = getStockItemsByFirm(targetId);
  const targetItem = masterItems.find(i => i.id === payload.item_id || i.item_name === payload.item_name);

  if (!targetItem) throw new Error("⚠️ Selected Stock Item does not exist in Inventory.");
  if (targetItem.current_stock < requestedQty) {
    throw new Error(`🚫 Insufficient Stock! Available: ${targetItem.current_stock} ${targetItem.unit}. Sale Invoice blocked.`);
  }

  const invoiceId = payload.invoice_number || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentDate = new Date().toISOString().split('T')[0];

  const invoiceData = {
    id: invoiceId,
    customer_account: payload.customer_account,
    item_id: targetItem.id,
    item_name: targetItem.item_name,
    unit: targetItem.unit,
    quantity: requestedQty,
    unit_rate: parseFloat(payload.unit_rate),
    gst_rate: parseFloat(payload.gst_rate || 0), // 0% GST Supported
    taxable_amount: parseFloat(payload.taxable_amount),
    tax_amount: parseFloat(payload.tax_amount),
    grand_total: parseFloat(payload.grand_total),
    dispatch_notes: payload.dispatch_notes || '',
    date: currentDate,
    created_at: new Date().toISOString()
  };

  updateStockMovement(targetId, targetItem.id, requestedQty, 'OUT');

  const voucherKey = `app_vouchers_${targetId}`;
  const vouchers = JSON.parse(localStorage.getItem(voucherKey) || '[]');
  vouchers.unshift({
    id: `JV-${invoiceId}`,
    date: currentDate,
    voucher_type: 'SALES',
    dr_account: payload.customer_account,
    cr_account: 'Sales Account',
    amount: invoiceData.grand_total,
    narration: `Sales Bill #${invoiceId} - ${invoiceData.item_name}`
  });
  localStorage.setItem(voucherKey, JSON.stringify(vouchers));

  const salesKey = `app_sales_invoices_${targetId}`;
  const salesList = JSON.parse(localStorage.getItem(salesKey) || '[]');
  salesList.unshift(invoiceData);
  localStorage.setItem(salesKey, JSON.stringify(salesList));

  window.dispatchEvent(new Event('storage'));
  return invoiceData;
};

export const quickCreateCustomerAccount = (firmId, accountData) => {
  const targetId = firmId || 'FIRM-001';
  if (!accountData.account_name) throw new Error("⚠️ Account Name is required.");

  const key = `app_accounts_${targetId}`;
  const accounts = getAccountHeads(targetId);

  const newAcc = {
    id: `ACC-${Date.now()}`,
    account_name: accountData.account_name.trim(),
    account_group: 'SUNDRY_DEBTOR'
  };

  accounts.push(newAcc);
  localStorage.setItem(key, JSON.stringify(accounts));
  window.dispatchEvent(new Event('storage'));
  return newAcc;
};

export const processPurchaseInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  if (!payload.supplier_account) throw new Error("⚠️ Select Supplier Account.");
  const qty = parseFloat(payload.quantity || 0);
  if (qty <= 0) throw new Error("⚠️ Enter valid quantity.");

  const purchaseId = payload.invoice_number || `PUR-${Math.floor(100000 + Math.random() * 900000)}`;
  const currentDate = new Date().toISOString().split('T')[0];

  const purchaseData = {
    id: purchaseId,
    supplier_account: payload.supplier_account,
    item_name: payload.item_name,
    quantity: qty,
    unit_rate: parseFloat(payload.unit_rate || 0),
    gst_rate: parseFloat(payload.gst_rate || 0),
    taxable_amount: parseFloat(payload.taxable_amount || 0),
    tax_amount: parseFloat(payload.tax_amount || 0),
    grand_total: parseFloat(payload.grand_total || 0),
    date: currentDate
  };

  updateStockMovement(targetId, payload.item_id || payload.item_name, qty, 'IN');

  const purKey = `app_purchase_invoices_${targetId}`;
  const purList = JSON.parse(localStorage.getItem(purKey) || '[]');
  purList.unshift(purchaseData);
  localStorage.setItem(purKey, JSON.stringify(purList));

  window.dispatchEvent(new Event('storage'));
  return purchaseData;
};

export const getPurchaseInvoicesByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  return JSON.parse(localStorage.getItem(`app_purchase_invoices_${targetId}`) || '[]');
};

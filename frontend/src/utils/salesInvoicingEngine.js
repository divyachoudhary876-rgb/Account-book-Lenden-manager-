// frontend/src/utils/salesInvoicingEngine.js

import { updateStockMovement } from './stockInventoryEngine.js';

export const getSalesInvoicesByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_sales_invoices_${targetId}`;
  let invoices = [];
  try {
    const raw = localStorage.getItem(key);
    invoices = raw ? JSON.parse(raw) : [];
  } catch (e) { invoices = []; }
  return invoices;
};

export const processSalesInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  
  if (!payload.customer_account) throw new Error("⚠️ Select Customer / Party Account.");
  if (!payload.item_name) throw new Error("⚠️ Select Stock Item to Dispatch.");
  if (parseFloat(payload.quantity || 0) <= 0) throw new Error("⚠️ Quantity must be greater than 0.");
  if (parseFloat(payload.unit_rate || 0) <= 0) throw new Error("⚠️ Unit Rate must be greater than 0.");

  const invoiceId = payload.invoice_number || `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const currentDate = new Date().toISOString().split('T')[0];

  const invoiceData = {
    id: invoiceId,
    customer_account: payload.customer_account,
    item_id: payload.item_id || payload.item_name,
    item_name: payload.item_name,
    quantity: parseFloat(payload.quantity),
    unit_rate: parseFloat(payload.unit_rate),
    gst_rate: parseFloat(payload.gst_rate || 18),
    taxable_amount: parseFloat(payload.taxable_amount),
    tax_amount: parseFloat(payload.tax_amount),
    grand_total: parseFloat(payload.grand_total),
    dispatch_notes: payload.dispatch_notes || '',
    date: currentDate,
    created_at: new Date().toISOString()
  };

  // 1. UPDATE MASTER INVENTORY (-OUT Stock Deduction)
  updateStockMovement(targetId, invoiceData.item_id, invoiceData.quantity, 'OUT');

  // 2. WRITE DOUBLE-ENTRY JOURNAL REGISTER VOUCHER
  const voucherKey = `app_vouchers_${targetId}`;
  const existingVouchers = JSON.parse(localStorage.getItem(voucherKey) || '[]');
  const journalVoucher = {
    id: `JV-${invoiceId}`,
    date: currentDate,
    voucher_type: 'SALES',
    dr_account: invoiceData.customer_account,
    cr_account: 'Sales Account',
    amount: invoiceData.grand_total,
    narration: `Sales Bill #${invoiceId} - Item: ${invoiceData.item_name} (Qty: ${invoiceData.quantity})`,
    reference_invoice: invoiceId
  };
  existingVouchers.unshift(journalVoucher);
  localStorage.setItem(voucherKey, JSON.stringify(existingVouchers));

  // 3. SAVE TO SALES INVOICES ARCHIVE
  const invoiceKey = `app_sales_invoices_${targetId}`;
  const existingInvoices = getSalesInvoicesByFirm(targetId);
  existingInvoices.unshift(invoiceData);
  localStorage.setItem(invoiceKey, JSON.stringify(existingInvoices));

  window.dispatchEvent(new Event('storage'));
  return invoiceData;
};

export const deleteSalesInvoice = (firmId, invoiceId) => {
  const targetId = firmId || 'FIRM-001';
  const invoiceKey = `app_sales_invoices_${targetId}`;
  const existingInvoices = getSalesInvoicesByFirm(targetId);
  
  const targetInvoice = existingInvoices.find(i => i.id === invoiceId);
  if (targetInvoice) {
    // Revert Stock (+IN)
    updateStockMovement(targetId, targetInvoice.item_id, targetInvoice.quantity, 'IN');

    // Remove Journal Voucher
    const voucherKey = `app_vouchers_${targetId}`;
    const vouchers = JSON.parse(localStorage.getItem(voucherKey) || '[]');
    const filteredVouchers = vouchers.filter(v => v.reference_invoice !== invoiceId && v.id !== `JV-${invoiceId}`);
    localStorage.setItem(voucherKey, JSON.stringify(filteredVouchers));
  }

  const updatedInvoices = existingInvoices.filter(i => i.id !== invoiceId);
  localStorage.setItem(invoiceKey, JSON.stringify(updatedInvoices));
  window.dispatchEvent(new Event('storage'));
  return updatedInvoices;
};

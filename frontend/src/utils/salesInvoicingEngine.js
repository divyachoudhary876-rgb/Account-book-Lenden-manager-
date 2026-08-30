// frontend/src/utils/salesInvoicingEngine.js

import { updateStockMovement } from './stockInventoryEngine.js';

export const processSalesInvoiceSubmission = (firmId, payload) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }
  
  // 1. Validate Stock Availability & Deduct Inventory (-OUT)
  updateStockMovement(
    targetId,
    payload.stock_item_id,
    payload.quantity,
    'SALES_OUT',
    payload.invoice_no,
    payload.unit_rate
  );

  // 2. Persist Sales Invoice Record
  const invoiceKey = `app_sales_invoices_${targetId}`;
  const existingInvoices = JSON.parse(localStorage.getItem(invoiceKey) || '[]');

  const newInvoice = {
    id: `INV-${Date.now()}`,
    firm_id: targetId,
    invoice_no: payload.invoice_no,
    customer_account_id: payload.customer_account_id,
    stock_item_id: payload.stock_item_id,
    quantity: parseFloat(payload.quantity),
    unit_rate: parseFloat(payload.unit_rate),
    taxable_amount: parseFloat(payload.taxable_amount),
    cgst_amount: parseFloat(payload.cgst_amount),
    sgst_amount: parseFloat(payload.sgst_amount),
    grand_total: parseFloat(payload.grand_total),
    narration: payload.narration || '',
    created_at: new Date().toISOString()
  };

  existingInvoices.unshift(newInvoice);
  localStorage.setItem(invoiceKey, JSON.stringify(existingInvoices));

  // 3. Post Double-Entry Journal Impact (Debtors Dr. / Sales Revenue Cr.)
  const journalKey = `app_journal_entries_${targetId}`;
  const existingJournals = JSON.parse(localStorage.getItem(journalKey) || '[]');
  
  existingJournals.push({
    id: `JRN-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    ref_no: payload.invoice_no,
    debit_account_id: payload.customer_account_id,
    credit_account_id: 'ACC-DEF-4-' + targetId,
    amount: parseFloat(payload.grand_total),
    narration: `Sales Bill #${payload.invoice_no}`
  });
  
  localStorage.setItem(journalKey, JSON.stringify(existingJournals));
  window.dispatchEvent(new Event('storage'));

  return newInvoice;
};

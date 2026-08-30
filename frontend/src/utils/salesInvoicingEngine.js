// frontend/src/utils/salesInvoicingEngine.js

import { updateStockMovement } from './stockInventoryEngine.js';

export const processSalesInvoiceSubmission = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_sales_invoices_${targetId}`;
  const existingInvoices = JSON.parse(localStorage.getItem(key) || '[]');

  const invoiceNumber = payload.invoice_number || `INV-${Date.now()}`;
  const invoiceEntry = {
    id: invoiceNumber,
    customer_name: payload.customer_name,
    items: payload.items || [],
    total_amount: parseFloat(payload.total_amount || 0),
    created_at: new Date().toISOString()
  };

  // Deduct stock for each line item in invoice
  if (Array.isArray(payload.items)) {
    payload.items.forEach(item => {
      if (item.id || item.item_name) {
        updateStockMovement(targetId, item.id || item.item_name, item.quantity, 'OUT');
      }
    });
  }

  existingInvoices.unshift(invoiceEntry);
  localStorage.setItem(key, JSON.stringify(existingInvoices));
  window.dispatchEvent(new Event('storage'));

  return invoiceEntry;
};

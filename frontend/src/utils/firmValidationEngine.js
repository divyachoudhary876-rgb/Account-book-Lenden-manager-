// frontend/src/utils/firmValidationEngine.js

// 1. Check if First-Time Onboarding is Required
export const isFirstTimeUser = () => {
  const profile = localStorage.getItem('active_firm_profile');
  return !profile || profile === 'null';
};

// 2. Sequential Invoice Number Generator (GST Compliant e.g. NG/26-27/0001)
export const getNextSequentialInvoiceNumber = () => {
  const firm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
  const invoices = JSON.parse(localStorage.getItem('app_invoices') || '[]');

  const prefix = firm.invoice_prefix || 'INV';
  const fy = firm.financial_year || '2026-27';
  const nextSeq = invoices.length + 1;
  const paddedNumber = String(nextSeq).padStart(4, '0');

  return `${prefix}/${fy}/${paddedNumber}`;
};

// 3. Negative Stock Guard Engine
export const validateStockAvailability = (itemId, requestedQty) => {
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const item = inventory.find(i => i.id === itemId);

  if (!item) {
    throw new Error("Item Not Found: Selected stock item does not exist.");
  }

  const availableQty = parseFloat(item.current_qty || 0);
  if (availableQty < parseFloat(requestedQty)) {
    throw new Error(`Insufficient Stock Alert! Available: ${availableQty} ${item.unit || 'Units'}, Requested: ${requestedQty} ${item.unit || 'Units'}.`);
  }

  return true;
};

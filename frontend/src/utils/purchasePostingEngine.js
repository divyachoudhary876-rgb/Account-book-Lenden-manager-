// frontend/src/utils/purchasePostingEngine.js

export const recordPurchaseInvoice = (payload) => {
  const { supplierAccId, supplierInvoiceNo, invoiceDate, itemId, qty, rate, gstRate } = payload;

  const numericQty = parseFloat(qty || 0);
  const numericRate = parseFloat(rate || 0);
  if (numericQty <= 0 || numericRate <= 0) {
    throw new Error("Quantity and Rate must be greater than zero.");
  }

  const taxableAmount = numericQty * numericRate;
  const gstAmount = (taxableAmount * parseFloat(gstRate || 0)) / 100;
  const totalAmount = taxableAmount + gstAmount;

  // 1. Automatic Stock Inventory Inward Increment (+ IN)
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  if (itemIndex !== -1) {
    inventory[itemIndex].current_qty = parseFloat(inventory[itemIndex].current_qty || 0) + numericQty;
    localStorage.setItem('app_inventory', JSON.stringify(inventory));
  }

  // 2. Automatic Double-Entry Journal Posting (Day Book)
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
  
  // Credit Supplier Account (Payable)
  journalEntries.push({
    id: `PURCH-SUPP-${Date.now()}`,
    entry_date: invoiceDate,
    voucher_type: 'PURCHASE',
    account_name: supplierAccId,
    narration: `Purchase Bill #${supplierInvoiceNo}`,
    debit: 0,
    credit: totalAmount
  });

  // Debit Purchase Account
  journalEntries.push({
    id: `PURCH-ACC-${Date.now()}`,
    entry_date: invoiceDate,
    voucher_type: 'PURCHASE',
    account_name: 'Purchase Account',
    narration: `Inward Stock Purchase Bill #${supplierInvoiceNo}`,
    debit: totalAmount,
    credit: 0
  });

  localStorage.setItem('app_journal_entries', JSON.stringify(journalEntries));
  window.dispatchEvent(new Event('storage'));

  return { success: true, totalAmount };
};

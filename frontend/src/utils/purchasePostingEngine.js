// frontend/src/utils/purchasePostingEngine.js

export const recordPurchaseInvoice = (payload) => {
  const { supplierAccId, supplierInvoiceNo, invoiceDate, itemId, qty, rate, gstRate, firmId } = payload;

  const numericQty = parseFloat(qty || 0);
  const numericRate = parseFloat(rate || 0);
  if (numericQty <= 0 || numericRate <= 0) {
    throw new Error("Quantity and Rate must be greater than zero.");
  }

  const taxableAmount = numericQty * numericRate;
  const gstAmount = (taxableAmount * parseFloat(gstRate || 0)) / 100;
  const totalAmount = taxableAmount + gstAmount;

  // 1. Update Inventory (+ IN)
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  if (itemIndex !== -1) {
    inventory[itemIndex].current_qty = parseFloat(inventory[itemIndex].current_qty || 0) + numericQty;
    localStorage.setItem('app_inventory', JSON.stringify(inventory));
  }

  // 2. Double-Entry Journal Posting (Debit Purchase A/C & GST, Credit Supplier A/C)
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
  const newVoucher = {
    id: `PURCH-${Date.now()}`,
    entry_date: invoiceDate,
    voucher_type: 'PURCHASE',
    account_name: supplierAccId,
    narration: `Purchase Bill #${supplierInvoiceNo}`,
    debit: 0,
    credit: totalAmount
  };
  journalEntries.push(newVoucher);
  localStorage.setItem('app_journal_entries', JSON.stringify(journalEntries));

  window.dispatchEvent(new Event('storage'));
  return { success: true, totalAmount };
};

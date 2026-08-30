// frontend/src/utils/inventoryPostingEngine.js

export const processPurchaseStockPosting = (purchasePayload) => {
  const { supplierId, invoiceNumber, entryDate, itemId, quantity, purchaseRate, narration } = purchasePayload;

  const numericQty = parseFloat(quantity || 0);
  const numericRate = parseFloat(purchaseRate || 0);
  const totalPurchaseValue = numericQty * numericRate;

  if (numericQty <= 0 || numericRate < 0) {
    throw new Error("Invalid Purchase Entry: Quantity and Rate must be greater than zero.");
  }

  // 1. Fetch Local Storage Buckets
  const inventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
  const accounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
  const journalEntries = JSON.parse(localStorage.getItem('app_journal_entries') || '[]');
  const vouchers = JSON.parse(localStorage.getItem('app_vouchers') || '[]');

  // 2. Find and Update Stock Item Master Quantity
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) {
    throw new Error("Inventory Item Not Found: Select a valid stock item.");
  }

  const stockItem = { ...inventory[itemIndex] };
  const currentStockQty = parseFloat(stockItem.current_qty || 0);
  
  // Update Stock Quantity (AUTOMATIC STOCK INCREMENT)
  stockItem.current_qty = currentStockQty + numericQty;
  stockItem.purchase_price = numericRate; // Update Latest Purchase Rate
  inventory[itemIndex] = stockItem;

  // 3. Find Supplier & Update Creditor Balance
  const supplierIndex = accounts.findIndex(a => a.id === supplierId);
  if (supplierIndex !== -1) {
    const suppAcc = { ...accounts[supplierIndex] };
    const curBal = parseFloat(suppAcc.current_balance || suppAcc.opening_balance || 0);
    suppAcc.current_balance = curBal + totalPurchaseValue; // Liability increases with Credit
    accounts[supplierIndex] = suppAcc;
  }

  // 4. Generate Double-Entry Accounting Journal Lines
  const voucherId = `PURCH-${Date.now()}`;
  
  // Debit Line: Purchase Account (Expense/Asset +)
  const drPurchaseLine = {
    id: `JL-${Date.now()}-DR`,
    voucher_id: voucherId,
    account_id: 'ACC-PURCHASE-MASTER',
    account_name: 'Purchase Account',
    date: entryDate,
    debit: totalPurchaseValue,
    credit: 0,
    narration: `Purchase of ${numericQty} ${stockItem.unit} ${stockItem.name} @ ₹${numericRate}`
  };

  // Credit Line: Supplier / Cash Account (Liability + / Cash -)
  const crSupplierLine = {
    id: `JL-${Date.now()}-CR`,
    voucher_id: voucherId,
    account_id: supplierId,
    account_name: supplierIndex !== -1 ? accounts[supplierIndex].name : 'Cash Supplier',
    date: entryDate,
    debit: 0,
    credit: totalPurchaseValue,
    narration: narration || `Purchase Bill #${invoiceNumber}`
  };

  // 5. Commit Atomic Changes
  localStorage.setItem('app_inventory', JSON.stringify(inventory));
  localStorage.setItem('app_account_heads', JSON.stringify(accounts));
  localStorage.setItem('app_journal_entries', JSON.stringify([drPurchaseLine, crSupplierLine, ...journalEntries]));
  localStorage.setItem('app_vouchers', JSON.stringify([{ id: voucherId, voucher_type: 'PURCHASE', date: entryDate, dr_account_name: 'Purchase Account', cr_account_name: supplierIndex !== -1 ? accounts[supplierIndex].name : 'Supplier', amount: totalPurchaseValue }, ...vouchers]));

  // Global Broadcast Event
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: { voucherId, stockItem } }));
  window.dispatchEvent(new Event('storage'));

  return { voucherId, stockItem, totalPurchaseValue };
};

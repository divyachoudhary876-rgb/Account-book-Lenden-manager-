// frontend/src/utils/inventoryPostingEngine.js
import { StorageService } from './storageSync';

export const processPurchaseStockPosting = (purchasePayload, firmId = 'FIRM-001') => {
  const activeFirmId = purchasePayload?.firmId || firmId || 'FIRM-001';
  const { supplierId, invoiceNumber, entryDate, itemId, quantity, purchaseRate, narration } = purchasePayload;

  const numericQty = parseFloat(quantity || 0);
  const numericRate = parseFloat(purchaseRate || 0);
  const totalPurchaseValue = numericQty * numericRate;

  if (numericQty <= 0 || numericRate < 0) {
    throw new Error("Invalid Purchase Entry: Quantity and Rate must be greater than zero.");
  }

  // 1. Fetch Firm-Scoped Storage Buckets with Fallbacks
  const inventoryKey = `inventory_items_${activeFirmId}`;
  const accountsKey = `app_accounts_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;

  const inventory = StorageService.getItem(inventoryKey) || StorageService.getItem('inventory_items') || [];
  const accounts = StorageService.getItem(accountsKey) || StorageService.getItem('app_account_heads') || [];
  const vouchers = StorageService.getItem(vouchersKey) || StorageService.getItem('account_book_vouchers') || [];

  // 2. Find and Update Stock Item Master Quantity & Valuation
  const itemIndex = inventory.findIndex(i => String(i.id) === String(itemId));
  if (itemIndex === -1) {
    throw new Error("Inventory Item Not Found: Select a valid stock item.");
  }

  const stockItem = { ...inventory[itemIndex] };
  const currentStockQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || 0);
  const oldRate = parseFloat(stockItem.unit_purchase_price || stockItem.purchase_price || 0);
  
  // Weighted Average Purchase Rate Calculation
  const oldTotalVal = currentStockQty * oldRate;
  const newTotalVal = oldTotalVal + totalPurchaseValue;
  const newStockQty = currentStockQty + numericQty;
  const newAvgRate = newStockQty > 0 ? Number((newTotalVal / newStockQty).toFixed(2)) : numericRate;

  stockItem.current_stock = newStockQty;
  stockItem.stock = newStockQty;
  stockItem.current_qty = newStockQty;
  stockItem.unit_purchase_price = newAvgRate;
  stockItem.purchase_price = newAvgRate;
  inventory[itemIndex] = stockItem;

  // 3. Find Supplier & Update Creditor Balance
  const supplierIndex = accounts.findIndex(a => String(a.id) === String(supplierId) || a.account_name === supplierId);
  let supplierName = 'Cash Supplier';
  if (supplierIndex !== -1) {
    const suppAcc = { ...accounts[supplierIndex] };
    supplierName = suppAcc.account_name || suppAcc.name || supplierName;
    const curBal = parseFloat(suppAcc.current_balance || suppAcc.opening_balance || 0);
    suppAcc.current_balance = curBal + totalPurchaseValue;
    accounts[supplierIndex] = suppAcc;
  } else if (typeof supplierId === 'string' && supplierId.trim() !== '') {
    supplierName = supplierId.trim();
  }

  // 4. Generate Double-Entry Accounting Voucher & Entries
  const voucherId = `PURCH-${Date.now()}`;
  
  const voucherEntries = [
    { account_name: 'Purchase A/c', type: 'DR', debit: totalPurchaseValue, credit: 0, amount: totalPurchaseValue },
    { account_name: supplierName, type: 'CR', debit: 0, credit: totalPurchaseValue, amount: totalPurchaseValue }
  ];

  const newVoucher = {
    id: voucherId,
    firm_id: activeFirmId,
    voucher_type: 'PURCHASE',
    type: 'PURCHASE',
    voucher_date: entryDate || new Date().toISOString().slice(0, 10),
    date: entryDate || new Date().toISOString().slice(0, 10),
    reference_no: invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
    dr_account: 'Purchase A/c',
    cr_account: supplierName,
    amount: totalPurchaseValue,
    total_amount: totalPurchaseValue,
    itemId: String(itemId),
    qty: numericQty,
    rate: numericRate,
    narration: narration || `Purchased ${numericQty} ${stockItem.unit || 'Units'} of ${stockItem.item_name || stockItem.name || 'Item'} @ ₹${numericRate}`,
    entries: voucherEntries,
    created_at: new Date().toISOString()
  };

  // 5. Commit Atomic Changes to Scoped Storage
  StorageService.setItem(inventoryKey, inventory);
  StorageService.setItem('inventory_items', inventory); // Global mirror for compatibility

  StorageService.setItem(accountsKey, accounts);
  
  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);
  StorageService.setItem('account_book_vouchers', updatedVouchers); // Global mirror

  // 6. Global Broadcast Events
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: { voucherId, stockItem } }));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return { voucherId, stockItem, totalPurchaseValue };
};

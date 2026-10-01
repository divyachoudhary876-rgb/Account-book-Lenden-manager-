// frontend/src/utils/inventoryPostingEngine.js
import { StorageService } from './storageSync';

export const processPurchaseStockPosting = (purchasePayload, firmId = 'FIRM-001') => {
  const activeFirmId = purchasePayload?.firmId || purchasePayload?.firm_id || firmId || 'FIRM-001';
  const { 
    supplierId, supplier_id, supplier_name, supplier,
    invoiceNumber, invoice_no, reference_no,
    entryDate, date, voucher_date,
    itemId, item_id, item,
    quantity, qty,
    purchaseRate, rate, unit_rate,
    narration 
  } = purchasePayload || {};

  const resolvedSupplier = supplierId || supplier_id || supplier_name || supplier || 'Cash Supplier';
  const resolvedDate = entryDate || date || voucher_date || new Date().toISOString().slice(0, 10);
  const resolvedInvoiceNo = invoiceNumber || invoice_no || reference_no || `PUR-${Date.now().toString().slice(-6)}`;
  const resolvedItemId = itemId || item_id || item;

  const numericQty = parseFloat(quantity || qty || 0);
  const numericRate = parseFloat(purchaseRate || rate || unit_rate || 0);
  const totalPurchaseValue = numericQty * numericRate;

  if (numericQty <= 0 || numericRate < 0) {
    throw new Error("Invalid Purchase Entry: Quantity aur Rate zero se zyada hone chahiye.");
  }

  // 1. Fetch Firm-Scoped Storage Buckets with Fallbacks
  const inventoryKey = `inventory_items_${activeFirmId}`;
  const accountsKey = `app_accounts_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;

  const inventory = StorageService.getItem(inventoryKey) || StorageService.getItem('inventory_items') || [];
  const accounts = StorageService.getItem(accountsKey) || StorageService.getItem('app_account_heads') || [];
  const vouchers = StorageService.getItem(vouchersKey) || StorageService.getItem('account_book_vouchers') || [];

  // 2. Find and Update Stock Item Master Quantity & Valuation
  let itemIndex = inventory.findIndex(i => String(i.id) === String(resolvedItemId) || String(i.item_name || i.name || '').trim().toLowerCase() === String(resolvedItemId).trim().toLowerCase());
  
  if (itemIndex === -1) {
    throw new Error("Inventory Item Not Found: Kripya valid stock item select karein.");
  }

  const stockItem = { ...inventory[itemIndex] };
  const currentStockQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
  const oldRate = parseFloat(stockItem.unit_purchase_price || stockItem.purchase_price || stockItem.rate || 0);
  
  // Weighted Average Purchase Rate Calculation
  const oldTotalVal = currentStockQty * oldRate;
  const newTotalVal = oldTotalVal + totalPurchaseValue;
  const newStockQty = currentStockQty + numericQty;
  const newAvgRate = newStockQty > 0 ? Number((newTotalVal / newStockQty).toFixed(2)) : numericRate;

  stockItem.current_stock = newStockQty;
  stockItem.stock = newStockQty;
  stockItem.current_qty = newStockQty;
  stockItem.qty = newStockQty;
  stockItem.unit_purchase_price = newAvgRate;
  stockItem.purchase_price = newAvgRate;
  stockItem.rate = newAvgRate;
  inventory[itemIndex] = stockItem;

  // 3. Find Supplier & Update Creditor Balance
  const supplierIndex = accounts.findIndex(a => String(a.id) === String(resolvedSupplier) || String(a.account_name || '').trim().toLowerCase() === String(resolvedSupplier).trim().toLowerCase());
  let supplierName = 'Cash Supplier';
  if (supplierIndex !== -1) {
    const suppAcc = { ...accounts[supplierIndex] };
    supplierName = suppAcc.account_name || suppAcc.name || supplierName;
    const curBal = parseFloat(suppAcc.current_balance || suppAcc.opening_balance || 0);
    suppAcc.current_balance = curBal + totalPurchaseValue;
    accounts[supplierIndex] = suppAcc;
  } else if (typeof resolvedSupplier === 'string' && resolvedSupplier.trim() !== '') {
    supplierName = resolvedSupplier.trim();
  }

  // 4. Generate Double-Entry Voucher
  const voucherId = `PURCH-${Date.now()}`;
  const itemNameDisplay = stockItem.item_name || stockItem.name || 'Item';
  
  const newVoucher = {
    id: voucherId,
    firm_id: activeFirmId,
    voucher_type: 'PURCHASE',
    type: 'PURCHASE',
    voucher_date: resolvedDate,
    date: resolvedDate,
    reference_no: resolvedInvoiceNo,
    dr_account: 'Purchase A/c',
    cr_account: supplierName,
    amount: totalPurchaseValue,
    total_amount: totalPurchaseValue,
    itemId: String(stockItem.id),
    qty: numericQty,
    rate: numericRate,
    narration: narration || `Purchased ${numericQty} ${stockItem.unit || 'Units'} of ${itemNameDisplay} @ ₹${numericRate}`,
    entries: [
      { account_name: 'Purchase A/c', type: 'DR', debit: totalPurchaseValue, credit: 0, amount: totalPurchaseValue },
      { account_name: supplierName, type: 'CR', debit: 0, credit: totalPurchaseValue, amount: totalPurchaseValue }
    ],
    created_at: new Date().toISOString()
  };

  // 5. Commit Atomic Changes
  StorageService.setItem(inventoryKey, inventory);
  StorageService.setItem('inventory_items', inventory);

  StorageService.setItem(accountsKey, accounts);
  StorageService.setItem('app_account_heads', accounts);
  
  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers.filter(v => v && v.id !== voucherId) : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);
  StorageService.setItem('account_book_vouchers', updatedVouchers);
  StorageService.setItem(`app_vouchers_${activeFirmId}`, updatedVouchers);

  // 6. Global Broadcast Events
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: newVoucher }));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return { voucherId, stockItem, totalPurchaseValue };
};

export const revertPurchaseStockOnDeletion = (voucherId, firmId = 'FIRM-001') => {
  try {
    if (!voucherId) return;
    const activeFirmId = firmId || 'FIRM-001';
    const vouchersKey = `account_book_vouchers_${activeFirmId}`;
    const inventoryKey = `inventory_items_${activeFirmId}`;

    const vouchers = StorageService.getItem(vouchersKey) || StorageService.getItem('account_book_vouchers') || [];
    const inventory = StorageService.getItem(inventoryKey) || StorageService.getItem('inventory_items') || [];

    const targetVoucher = vouchers.find(v => String(v.id) === String(voucherId) || String(v.reference_no) === String(voucherId));
    if (!targetVoucher) return;

    const targetItemId = targetVoucher.itemId || targetVoucher.item_id;
    const purchasedQty = parseFloat(targetVoucher.qty || targetVoucher.quantity || 0);

    if (targetItemId && purchasedQty > 0) {
      const itemIndex = inventory.findIndex(i => String(i.id) === String(targetItemId) || String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemId).trim().toLowerCase());
      if (itemIndex !== -1) {
        const stockItem = { ...inventory[itemIndex] };
        const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
        const newQty = Math.max(0, currentQty - purchasedQty);

        stockItem.current_stock = newQty;
        stockItem.stock = newQty;
        stockItem.current_qty = newQty;
        stockItem.qty = newQty;
        inventory[itemIndex] = stockItem;

        StorageService.setItem(inventoryKey, inventory);
        StorageService.setItem('inventory_items', inventory);
        window.dispatchEvent(new Event('app_storage_updated'));
        window.dispatchEvent(new Event('app_state_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    }
  } catch (e) {
    console.error("Error reverting purchase stock on deletion:", e);
  }
};

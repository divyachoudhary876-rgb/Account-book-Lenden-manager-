// frontend/src/utils/inventoryPostingEngine.js

import { StorageService } from './storageSync';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Ensures an Inventory Stock Item always has a corresponding Financial Asset Account
 * under Current Assets without manual user intervention.
 */
const ensureStockLedger = (firmId, rawItemName) => {
  if (!firmId || !rawItemName) return `${rawItemName} Stock Account`;
  const cleanItemName = String(rawItemName).trim();
  const stockAccountName = `${cleanItemName} Stock Account`;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    const exists = masterAccounts.some(
      acc => (acc.account_name || acc.name || '').trim().toLowerCase() === stockAccountName.toLowerCase()
    );

    if (!exists) {
      saveMasterAccount(firmId, {
        id: `ACC-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        firm_id: firmId,
        account_name: stockAccountName,
        name: stockAccountName,
        primary_type: 'ASSETS',
        type: 'Assets',
        sub_group: 'Inventory / Current Assets',
        group: 'Current Assets',
        balance_type: 'Dr',
        opening_balance: 0,
        is_system_generated: true,
        created_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.error("Error creating stock ledger in inventoryPostingEngine:", e);
  }

  return stockAccountName;
};

/**
 * Process purchase stock posting with strict firm-isolation and Ind AS double-entry compliance
 */
export const processPurchaseStockPosting = (purchasePayload, firmId = 'FIRM-001') => {
  const activeFirmId = String(
    purchasePayload?.firmId || 
    purchasePayload?.firm_id || 
    firmId || 
    localStorage.getItem('app_active_firm_id') || 
    'FIRM-001'
  ).trim();

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
  const resolvedInvoiceNo = String(invoiceNumber || invoice_no || reference_no || `PUR-${Date.now().toString().slice(-6)}`).replace(/^#/, '');
  const resolvedItemId = itemId || item_id || item;

  const numericQty = parseFloat(quantity || qty || 0);
  const numericRate = parseFloat(purchaseRate || rate || unit_rate || 0);
  const totalPurchaseValue = round2(numericQty * numericRate);

  if (numericQty <= 0 || numericRate < 0) {
    throw new Error("Invalid Purchase Entry: Quantity aur Rate zero se zyada hone chahiye.");
  }

  // 1. Fetch strictly firm-scoped storage buckets
  const inventoryKey = `inventory_items_${activeFirmId}`;
  const accountsKey = `app_accounts_${activeFirmId}`;
  const accountHeadsKey = `account_heads_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const primaryVouchersKey = `app_vouchers_${activeFirmId}`;
  const purchaseBillsKey = `purchase_bills_${activeFirmId}`;

  const inventory = StorageService.getItem(inventoryKey, []);
  const accounts = StorageService.getItem(accountsKey, []);
  const vouchers = StorageService.getItem(vouchersKey, []);
  const primaryVouchers = StorageService.getItem(primaryVouchersKey, []);
  const purchaseBills = StorageService.getItem(purchaseBillsKey, []);

  // 2. Find and Update Stock Item Master Quantity & Valuation
  let itemIndex = inventory.findIndex(i => i && (
    String(i.id) === String(resolvedItemId) || 
    String(i.item_name || i.name || '').trim().toLowerCase() === String(resolvedItemId).trim().toLowerCase()
  ));
  
  if (itemIndex === -1) {
    throw new Error("Inventory Item Not Found: Kripya valid stock item select karein.");
  }

  const stockItem = { ...inventory[itemIndex] };
  const currentStockQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
  const oldRate = parseFloat(stockItem.unit_purchase_price || stockItem.purchase_price || stockItem.rate || 0);
  
  const oldTotalVal = currentStockQty * oldRate;
  const newTotalVal = oldTotalVal + totalPurchaseValue;
  const newStockQty = round2(currentStockQty + numericQty);
  const newAvgRate = newStockQty > 0 ? round2(newTotalVal / newStockQty) : numericRate;

  stockItem.current_stock = newStockQty;
  stockItem.stock = newStockQty;
  stockItem.current_qty = newStockQty;
  stockItem.qty = newStockQty;
  stockItem.unit_purchase_price = newAvgRate;
  stockItem.purchase_price = newAvgRate;
  stockItem.rate = newAvgRate;
  stockItem.updated_at = new Date().toISOString();
  inventory[itemIndex] = stockItem;

  // 3. Resolve Supplier Account Name
  let supplierName = 'Cash Supplier';
  const supplierIndex = accounts.findIndex(a => a && (
    String(a.id) === String(resolvedSupplier) || 
    String(a.account_name || a.name || '').trim().toLowerCase() === String(resolvedSupplier).trim().toLowerCase()
  ));

  if (supplierIndex !== -1) {
    const suppAcc = accounts[supplierIndex];
    supplierName = (suppAcc.account_name || suppAcc.name || supplierName).trim();
  } else if (typeof resolvedSupplier === 'string' && resolvedSupplier.trim() !== '') {
    supplierName = resolvedSupplier.trim();
    try {
      saveMasterAccount(activeFirmId, {
        account_name: supplierName,
        primary_type: 'LIABILITIES',
        type: 'Liabilities',
        sub_group: 'Sundry Creditors (Suppliers / Vendors)',
        balance_type: 'Cr'
      });
    } catch (e) {}
  }

  const itemNameDisplay = (stockItem.item_name || stockItem.name || 'Item').trim();
  
  // Intelligent Ind AS Debit Account Resolver:
  // Diesel goes to Running Expense, Goods/Accessories go to their dedicated Stock Asset Account
  const drAccountHead = itemNameDisplay.toLowerCase().includes('diesel')
    ? 'Tractor Diesel & Running Expense'
    : ensureStockLedger(activeFirmId, itemNameDisplay);

  // 4. Generate Balanced Double-Entry Voucher
  const voucherId = purchasePayload.id || `#${resolvedInvoiceNo}`;
  
  const newVoucher = {
    id: voucherId,
    firm_id: activeFirmId,
    firmId: activeFirmId,
    voucher_type: 'PURCHASE',
    type: 'PURCHASE',
    voucher_number: resolvedInvoiceNo,
    reference_no: resolvedInvoiceNo,
    voucher_date: resolvedDate,
    date: resolvedDate,
    dr_account: drAccountHead,
    cr_account: supplierName,
    amount: totalPurchaseValue,
    total_amount: totalPurchaseValue,
    total_taxable: totalPurchaseValue,
    itemId: String(stockItem.id),
    item_id: String(stockItem.id),
    itemName: itemNameDisplay,
    item_name: itemNameDisplay,
    qty: numericQty,
    quantity: numericQty,
    rate: numericRate,
    unit_rate: numericRate,
    unit: stockItem.unit || 'Units',
    narration: narration || `Purchased ${numericQty} ${stockItem.unit || 'Units'} of ${itemNameDisplay} from ${supplierName} @ ₹${numericRate}`,
    is_compound: true,
    entries: [
      { account_name: drAccountHead, party: drAccountHead, type: 'DR', debit: totalPurchaseValue, credit: 0, amount: totalPurchaseValue },
      { account_name: supplierName, party: supplierName, type: 'CR', debit: 0, credit: totalPurchaseValue, amount: totalPurchaseValue }
    ],
    items: [
      {
        itemId: String(stockItem.id),
        itemName: itemNameDisplay,
        item_name: itemNameDisplay,
        qty: numericQty,
        quantity: numericQty,
        rate: numericRate,
        unit_rate: numericRate,
        unit: stockItem.unit || 'Units',
        total: totalPurchaseValue
      }
    ],
    created_at: new Date().toISOString()
  };

  // 5. Commit Atomic Changes strictly to firm-scoped buckets
  StorageService.setItem(inventoryKey, inventory);
  localStorage.setItem(`inventory_items_${activeFirmId}`, JSON.stringify(inventory));
  localStorage.setItem('inventory_items', JSON.stringify(inventory));

  const filterFn = v => v && String(v.id) !== String(voucherId) && String(v.reference_no) !== String(resolvedInvoiceNo);
  
  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers.filter(filterFn) : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);
  
  const updatedPrimaryVouchers = [newVoucher, ...(Array.isArray(primaryVouchers) ? primaryVouchers.filter(filterFn) : [])];
  StorageService.setItem(primaryVouchersKey, updatedPrimaryVouchers);

  const updatedPurchaseBills = [newVoucher, ...(Array.isArray(purchaseBills) ? purchaseBills.filter(filterFn) : [])];
  StorageService.setItem(purchaseBillsKey, updatedPurchaseBills);
  localStorage.setItem(purchaseBillsKey, JSON.stringify(updatedPurchaseBills));

  // 6. Complete Reactive Event Broadcast
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: newVoucher }));
  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return { voucherId, stockItem, totalPurchaseValue };
};

/**
 * Revert stock and reverse entry on purchase deletion strictly per firm
 */
export const revertPurchaseStockOnDeletion = (voucherId, firmId = 'FIRM-001') => {
  try {
    if (!voucherId) return;
    const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
    const cleanVoucherRef = String(voucherId).replace(/^#/, '');

    const vouchersKey = `account_book_vouchers_${activeFirmId}`;
    const primaryVouchersKey = `app_vouchers_${activeFirmId}`;
    const purchaseBillsKey = `purchase_bills_${activeFirmId}`;
    const inventoryKey = `inventory_items_${activeFirmId}`;

    const vouchers = StorageService.getItem(vouchersKey, []);
    const primaryVouchers = StorageService.getItem(primaryVouchersKey, []);
    const purchaseBills = StorageService.getItem(purchaseBillsKey, []);

    // Locate target voucher across firm-scoped lists
    const targetVoucher = 
      vouchers.find(v => v && (String(v.id) === String(voucherId) || String(v.reference_no) === String(voucherId) || String(v.reference_no) === cleanVoucherRef)) ||
      primaryVouchers.find(v => v && (String(v.id) === String(voucherId) || String(v.reference_no) === String(voucherId) || String(v.reference_no) === cleanVoucherRef)) ||
      purchaseBills.find(v => v && (String(v.id) === String(voucherId) || String(v.reference_no) === String(voucherId) || String(v.reference_no) === cleanVoucherRef));

    if (!targetVoucher) return;

    const targetItemId = targetVoucher.itemId || targetVoucher.item_id || targetVoucher.item;
    const targetItemName = targetVoucher.itemName || targetVoucher.item_name;
    const purchasedQty = parseFloat(targetVoucher.qty || targetVoucher.quantity || targetVoucher.stock || 0);

    // 1. Revert Inventory Quantity
    if (purchasedQty > 0) {
      let inventory = StorageService.getItem(inventoryKey, []);
      if (Array.isArray(inventory) && inventory.length > 0) {
        const itemIndex = inventory.findIndex(i => 
          i && (
            (targetItemId && String(i.id) === String(targetItemId)) || 
            (targetItemName && String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemName).trim().toLowerCase())
          )
        );

        if (itemIndex !== -1) {
          const stockItem = { ...inventory[itemIndex] };
          const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
          const newQty = round2(Math.max(0, currentQty - purchasedQty));

          stockItem.current_stock = newQty;
          stockItem.stock = newQty;
          stockItem.current_qty = newQty;
          stockItem.qty = newQty;
          stockItem.updated_at = new Date().toISOString();
          inventory[itemIndex] = stockItem;

          StorageService.setItem(inventoryKey, inventory);
          localStorage.setItem(inventoryKey, JSON.stringify(inventory));
          localStorage.setItem('inventory_items', JSON.stringify(inventory));
        }
      }
    }

    // 2. Remove Voucher from all firm-scoped buckets
    const filterFn = v => v && 
      String(v.id) !== String(voucherId) && 
      String(v.reference_no) !== String(voucherId) && 
      String(v.reference_no) !== cleanVoucherRef;
    
    const updatedV = vouchers.filter(filterFn);
    const updatedPV = primaryVouchers.filter(filterFn);
    const updatedPB = purchaseBills.filter(filterFn);

    StorageService.setItem(vouchersKey, updatedV);
    StorageService.setItem(primaryVouchersKey, updatedPV);
    StorageService.setItem(purchaseBillsKey, updatedPB);
    localStorage.setItem(purchaseBillsKey, JSON.stringify(updatedPB));

    // 3. Broadcast Sync
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error("Error reverting purchase stock on deletion:", e);
  }
};

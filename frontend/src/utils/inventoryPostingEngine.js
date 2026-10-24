/**
 * Frontend Utility: Unified Inventory Posting Engine
 * Handles automatic stock adjustment for Purchases, Sales, and Material Consumptions with Strict Exact-Match Inventory Reconciliation.
 */

import { StorageService } from './storageSync';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const normalizeItemName = (name) => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\b(stock account|account|stock)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Ensures an Inventory Stock Item always has a corresponding Financial Asset Account (Strict Duplicate Prevention)
 */
const ensureStockLedger = (firmId, rawItemName) => {
  if (!firmId || !rawItemName) return `${rawItemName} Stock Account`;
  const cleanItemName = String(rawItemName).trim();
  const targetAccountName = `${cleanItemName} Stock Account`;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    const existingIndex = masterAccounts.findIndex(
      acc => (acc.account_name || acc.name || '').trim().toLowerCase() === targetAccountName.toLowerCase()
    );

    if (existingIndex !== -1) {
      return (masterAccounts[existingIndex].account_name || masterAccounts[existingIndex].name || targetAccountName);
    }

    saveMasterAccount(firmId, {
      id: `ACC-STK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      firm_id: firmId,
      account_name: targetAccountName,
      name: targetAccountName,
      primary_type: 'ASSETS',
      type: 'Assets',
      sub_group: 'Raw Material Inventory (कच्चा माल)',
      group: 'Current Assets',
      balance_type: 'Dr',
      opening_balance: 0,
      is_system_generated: true,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error creating stock ledger in inventoryPostingEngine:", e);
  }

  return targetAccountName;
};

/**
 * Calculates strict exact-match item stock
 */
export const getFirmItemStock = (firmId, itemName) => {
  const cleanFirmId = firmId || StorageService.getActiveFirmId();
  const targetNorm = normalizeItemName(itemName);
  if (!targetNorm) return 0;

  try {
    const purchases = StorageService.getItem(`purchase_bills_${cleanFirmId}`, []) || StorageService.getItem('purchase_bills', []) || [];
    const salesInvoices = [
      ...(StorageService.getItem(`sales_invoices_${cleanFirmId}`, []) || []),
      ...(StorageService.getItem(`app_invoices_${cleanFirmId}`, []) || []),
      ...(StorageService.getItem('sales_invoices', []) || [])
    ];
    const adjustments = [
      ...(StorageService.getItem(`universal_material_adjustments_${cleanFirmId}`, []) || []),
      ...(StorageService.getItem('universal_material_adjustments', []) || []),
      ...(StorageService.getItem(`material_consumptions_${cleanFirmId}`, []) || [])
    ];

    let totalInward = 0;
    let totalOutward = 0;

    purchases.forEach(p => {
      if (!p) return;
      if (Array.isArray(p.items) && p.items.length > 0) {
        p.items.forEach(it => {
          if (!it) return;
          const itName = normalizeItemName(it.itemName || it.item_name || it.name || '');
          if (itName === targetNorm) {
            totalInward += parseFloat(it.qty || it.quantity || 0);
          }
        });
      } else {
        const pName = normalizeItemName(p.item_name || p.itemName || p.name || '');
        if (pName === targetNorm) {
          totalInward += parseFloat(p.quantity || p.qty || 0);
        }
      }
    });

    salesInvoices.forEach(s => {
      if (!s) return;
      if (Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(si => {
          if (!si) return;
          const sName = normalizeItemName(si.itemName || si.item_name || si.name || '');
          if (sName === targetNorm) {
            totalOutward += parseFloat(si.qty || si.quantity || 0);
          }
        });
      }
    });

    adjustments.forEach(a => {
      if (!a) return;
      const aName = normalizeItemName(a.item_name || a.itemName || '');
      const aStockId = normalizeItemName(a.stock_id || a.itemId || '');
      if (aName === targetNorm || aStockId === targetNorm) {
        totalOutward += parseFloat(a.quantity || a.qty || 0);
      }
    });

    return round2(totalInward - totalOutward);
  } catch (err) {
    console.error('[inventoryPostingEngine] Error computing item stock:', err);
    return 0;
  }
};

/**
 * 1. PURCHASE ENTRY: Automatically INCREASES Stock (+)
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

  const inventoryKey = `inventory_items_${activeFirmId}`;
  const accountsKey = `app_accounts_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const primaryVouchersKey = `app_vouchers_${activeFirmId}`;
  const purchaseBillsKey = `purchase_bills_${activeFirmId}`;

  let inventory = StorageService.getItem(inventoryKey, []);
  if (!Array.isArray(inventory) || inventory.length === 0) {
    inventory = StorageService.getItem('inventory_items', []);
  }

  const accounts = StorageService.getItem(accountsKey, []);
  const vouchers = StorageService.getItem(vouchersKey, []);
  const primaryVouchers = StorageService.getItem(primaryVouchersKey, []);
  const purchaseBills = StorageService.getItem(purchaseBillsKey, []);

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

  StorageService.setItem(inventoryKey, inventory);

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
  const drAccountHead = itemNameDisplay.toLowerCase().includes('diesel')
    ? 'Tractor Diesel & Running Expense'
    : ensureStockLedger(activeFirmId, itemNameDisplay);

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

  const filterFn = v => v && String(v.id) !== String(voucherId) && String(v.reference_no) !== String(resolvedInvoiceNo);
  
  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers.filter(filterFn) : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);
  
  const updatedPrimaryVouchers = [newVoucher, ...(Array.isArray(primaryVouchers) ? primaryVouchers.filter(filterFn) : [])];
  StorageService.setItem(primaryVouchersKey, updatedPrimaryVouchers);

  const updatedPurchaseBills = [newVoucher, ...(Array.isArray(purchaseBills) ? purchaseBills.filter(filterFn) : [])];
  StorageService.setItem(purchaseBillsKey, updatedPurchaseBills);

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: newVoucher }));
    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_inventory_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));
    window.dispatchEvent(new Event('app_state_updated'));
    window.dispatchEvent(new Event('storage'));
  }, 10);

  return { voucherId, stockItem, totalPurchaseValue };
};

/**
 * 2. SALES / CONSUMPTION ENTRY: Automatically DECREASES Stock (-)
 */
export const processSalesOrConsumptionStockDeduction = (payload, firmId = 'FIRM-001') => {
  const activeFirmId = String(
    payload?.firmId || 
    payload?.firm_id || 
    firmId || 
    localStorage.getItem('app_active_firm_id') || 
    'FIRM-001'
  ).trim();

  const { itemId, item_id, item, quantity, qty } = payload || {};
  const resolvedItemId = itemId || item_id || item;
  const numericQty = parseFloat(quantity || qty || 0);

  if (numericQty <= 0 || !resolvedItemId) return;

  const inventoryKey = `inventory_items_${activeFirmId}`;
  let inventory = StorageService.getItem(inventoryKey, []);
  if (!Array.isArray(inventory) || inventory.length === 0) {
    inventory = StorageService.getItem('inventory_items', []);
  }

  let itemIndex = inventory.findIndex(i => i && (
    String(i.id) === String(resolvedItemId) || 
    String(i.item_name || i.name || '').trim().toLowerCase() === String(resolvedItemId).trim().toLowerCase()
  ));

  if (itemIndex !== -1) {
    const stockItem = { ...inventory[itemIndex] };
    const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
    const newQty = round2(Math.max(0, currentQty - numericQty));

    stockItem.current_stock = newQty;
    stockItem.stock = newQty;
    stockItem.current_qty = newQty;
    stockItem.qty = newQty;
    stockItem.updated_at = new Date().toISOString();
    inventory[itemIndex] = stockItem;

    StorageService.setItem(inventoryKey, inventory);

    window.setTimeout(() => {
      window.dispatchEvent(new Event('app_inventory_updated'));
      window.dispatchEvent(new Event('app_storage_updated'));
    }, 10);
  }
};

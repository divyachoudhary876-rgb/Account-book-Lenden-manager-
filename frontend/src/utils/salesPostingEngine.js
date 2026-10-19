// frontend/src/utils/salesPostingEngine.js

import { StorageService } from './storageSync';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const processSalesInvoicePosting = (invoicePayload, firmId = 'FIRM-001') => {
  const activeFirmId = invoicePayload?.firmId || invoicePayload?.firm_id || firmId || 'FIRM-001';
  const { customerId, customer_id, invoiceDate, date, taxableAmount, taxable_amount, gstRate, gst_amount, narration, items, line_items, cart, item, product, itemId, item_id, product_id, quantity, qty } = invoicePayload;

  const resolvedCustomerId = customerId || customer_id;
  const resolvedDate = invoiceDate || date || new Date().toISOString().slice(0, 10);
  const numericTaxable = parseFloat(taxableAmount || taxable_amount || 0);
  const numericGstRate = parseFloat(gstRate || 0);
  const gstAmount = parseFloat(gst_amount || ((numericTaxable * numericGstRate) / 100));
  const grandTotal = numericTaxable + gstAmount;

  if (grandTotal <= 0) {
    throw new Error("Invalid Bill Amount: Bill Value zero se bada hona chahiye.");
  }

  // 1. Fetch Firm-Scoped Storage Buckets
  const accountsKey = `app_accounts_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const primaryVouchersKey = `app_vouchers_${activeFirmId}`;
  const invoicesKey = `app_invoices_${activeFirmId}`;
  const inventoryKey = `inventory_items_${activeFirmId}`;

  let accounts = StorageService.getItem(accountsKey, []) || StorageService.getItem('app_account_heads', []) || [];
  const vouchers = StorageService.getItem(vouchersKey, []) || [];
  const primaryVouchers = StorageService.getItem(primaryVouchersKey, []) || [];
  const invoices = StorageService.getItem(invoicesKey, []) || [];
  const inventory = StorageService.getItem(inventoryKey, []) || [];

  // 2. Find or Auto-Create Customer Account
  let customerIndex = accounts.findIndex(a => 
    String(a.id) === String(resolvedCustomerId) || 
    String(a.account_name || '').trim().toLowerCase() === String(resolvedCustomerId).trim().toLowerCase() ||
    String(a.name || '').trim().toLowerCase() === String(resolvedCustomerId).trim().toLowerCase()
  );

  if (customerIndex === -1 && resolvedCustomerId) {
    const newAccountObj = {
      id: `ACC-${Date.now()}`,
      firm_id: activeFirmId,
      account_name: String(resolvedCustomerId).trim(),
      name: String(resolvedCustomerId).trim(),
      primary_type: 'ASSETS',
      sub_group: 'Sundry Debtors (Customer / देनदार)',
      opening_balance: 0,
      current_balance: 0,
      balance_type: 'Dr'
    };
    accounts.push(newAccountObj);
    customerIndex = accounts.length - 1;
  }

  if (customerIndex === -1) {
    throw new Error("Party Not Found: Kripya valid Customer / Supplier Party select karein.");
  }

  const customerAcc = { ...accounts[customerIndex] };
  const customerName = (customerAcc.account_name || customerAcc.name || 'Customer').trim();

  // 3. Process Inventory Stock Deduction & Stock Ledger Valuation
  const rawItemsList = items || line_items || cart || (item ? [item] : []) || (product ? [product] : []) || ((itemId || item_id || product_id) ? [{ itemId: itemId || item_id || product_id, quantity: quantity || qty || 1 }] : []);
  const processedItems = [];
  let totalStockCostValue = 0;

  rawItemsList.forEach(soldItem => {
    if (!soldItem) return;
    const targetItemId = soldItem.itemId || soldItem.item_id || soldItem.product_id || soldItem.id;
    const soldQty = parseFloat(soldItem.quantity || soldItem.qty || soldItem.stock || soldItem.count || 1);
    if (!targetItemId || soldQty <= 0) return;

    const itemIndex = inventory.findIndex(i => 
      String(i.id) === String(targetItemId) || 
      String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemId).trim().toLowerCase()
    );

    let itemCostRate = 0;
    let itemName = 'Item';

    if (itemIndex !== -1) {
      const stockItem = { ...inventory[itemIndex] };
      itemName = (stockItem.item_name || stockItem.name || 'Item').trim();
      itemCostRate = parseFloat(stockItem.unit_purchase_price || stockItem.purchase_price || stockItem.rate || 0);
      
      const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || 0);
      const newQty = round2(currentQty - soldQty); // Allows negative if stock is short

      stockItem.current_stock = newQty;
      stockItem.stock = newQty;
      stockItem.current_qty = newQty;
      stockItem.qty = newQty;
      stockItem.updated_at = new Date().toISOString();
      inventory[itemIndex] = stockItem;
    }

    const itemCostTotal = round2(soldQty * itemCostRate);
    totalStockCostValue += itemCostTotal;

    processedItems.push({ 
      itemId: targetItemId, 
      itemName: itemName,
      unit: soldItem.unit || 'Pcs',
      quantity: soldQty,
      rate: soldItem.rate || 0,
      total: soldItem.total || (soldQty * Number(soldItem.rate || 0))
    });
  });

  // 4. Generate Compound Double-Entry Voucher (Posting Sales + Stock Ledger Credit)
  const invoiceId = invoicePayload.id || `INV-${Date.now()}`;
  const refNo = invoicePayload.reference_no || invoicePayload.invoice_number || `INV-${Date.now().toString().slice(-6)}`;

  const voucherEntries = [
    { account_name: customerName, party: customerName, type: 'DR', debit: grandTotal, credit: 0, amount: grandTotal },
    { account_name: 'Sales & Revenue', party: 'Sales & Revenue', type: 'CR', debit: 0, credit: numericTaxable, amount: numericTaxable },
    ...(gstAmount > 0 ? [{ account_name: 'GST Output', party: 'GST Output', type: 'CR', debit: 0, credit: gstAmount, amount: gstAmount }] : [])
  ];

  // Automatically credit respective stock accounts for sold items so statements match
  processedItems.forEach(si => {
    const stockLedgerName = `${si.itemName} Stock Account`;
    const itemCostVal = round2(si.quantity * (si.rate > 0 ? si.rate * 0.8 : 0)); // Or cost valuation
    if (itemCostVal > 0) {
      voucherEntries.push({
        account_name: stockLedgerName,
        party: stockLedgerName,
        type: 'CR',
        debit: 0,
        credit: itemCostVal,
        amount: itemCostVal
      });
    }
  });

  const newVoucher = {
    id: invoiceId,
    firm_id: activeFirmId,
    firmId: activeFirmId,
    voucher_type: 'SALES',
    type: 'SALES',
    voucher_number: refNo,
    reference_no: refNo,
    voucher_date: resolvedDate,
    date: resolvedDate,
    dr_account: customerName,
    cr_account: 'Sales & Revenue',
    amount: grandTotal,
    total_amount: grandTotal,
    total_taxable: numericTaxable,
    items: processedItems,
    vehicle_no: invoicePayload.vehicle_no || '',
    narration: narration || `Sales Invoice #${refNo} to ${customerName}`,
    is_compound: true,
    entries: voucherEntries,
    created_at: new Date().toISOString()
  };

  // 5. Commit Changes
  StorageService.setItem(inventoryKey, inventory);
  localStorage.setItem(inventoryKey, JSON.stringify(inventory));
  localStorage.setItem('inventory_items', JSON.stringify(inventory));

  const filterFn = v => v && String(v.id) !== String(invoiceId) && String(v.reference_no) !== String(refNo);

  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers.filter(filterFn) : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);

  const updatedPrimaryVouchers = [newVoucher, ...(Array.isArray(primaryVouchers) ? primaryVouchers.filter(filterFn) : [])];
  StorageService.setItem(primaryVouchersKey, updatedPrimaryVouchers);

  const updatedInvoices = [newVoucher, ...(Array.isArray(invoices) ? invoices.filter(i => i && i.id !== invoiceId) : [])];
  StorageService.setItem(invoicesKey, updatedInvoices);

  // 6. Global Broadcast
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: newVoucher }));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('storage'));

  return newVoucher;
};

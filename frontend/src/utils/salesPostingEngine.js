// frontend/src/utils/salesPostingEngine.js
import { StorageService } from './storageSync';

export const processSalesInvoicePosting = (invoicePayload, firmId = 'FIRM-001') => {
  const activeFirmId = invoicePayload?.firmId || invoicePayload?.firm_id || firmId || 'FIRM-001';
  const { customerId, customer_id, invoiceDate, date, taxableAmount, taxable_amount, gstRate, gst_amount, narration, items, line_items, cart, itemId, quantity } = invoicePayload;

  const resolvedCustomerId = customerId || customer_id;
  const resolvedDate = invoiceDate || date || new Date().toISOString().slice(0, 10);
  const numericTaxable = parseFloat(taxableAmount || taxable_amount || 0);
  const numericGstRate = parseFloat(gstRate || 0);
  const gstAmount = parseFloat(gst_amount || ((numericTaxable * numericGstRate) / 100));
  const grandTotal = numericTaxable + gstAmount;

  if (grandTotal <= 0) {
    throw new Error("Invalid Bill Amount: Bill Value zero se bada hona chahiye.");
  }

  // 1. Fetch Firm-Scoped Storage Buckets with Fallbacks
  const accountsKey = `app_accounts_${activeFirmId}`;
  const journalKey = `app_journal_entries_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const invoicesKey = `app_invoices_${activeFirmId}`;
  const inventoryKey = `inventory_items_${activeFirmId}`;

  const accounts = StorageService.getItem(accountsKey) || StorageService.getItem('app_account_heads') || [];
  const journalEntries = StorageService.getItem(journalKey) || StorageService.getItem('app_journal_entries') || [];
  const vouchers = StorageService.getItem(vouchersKey) || StorageService.getItem('account_book_vouchers') || [];
  const invoices = StorageService.getItem(invoicesKey) || StorageService.getItem('app_invoices') || [];
  const inventory = StorageService.getItem(inventoryKey) || StorageService.getItem('inventory_items') || [];

  // 2. Find Customer Account
  const customerIndex = accounts.findIndex(a => String(a.id) === String(resolvedCustomerId) || String(a.account_name || '').trim().toLowerCase() === String(resolvedCustomerId).trim().toLowerCase());
  if (customerIndex === -1) {
    throw new Error("Party Not Found: Kripya valid Customer Party select karein.");
  }

  const customerAcc = { ...accounts[customerIndex] };
  const currentBal = parseFloat(customerAcc.current_balance || customerAcc.opening_balance || 0);
  customerAcc.current_balance = currentBal + grandTotal;
  accounts[customerIndex] = customerAcc;

  // 3. Robust Inventory Stock Deduction for Sold Items
  const rawItemsList = items || line_items || cart || (itemId ? [{ itemId, quantity: quantity || 1 }] : []);
  const processedItems = [];

  rawItemsList.forEach(soldItem => {
    const targetItemId = soldItem.itemId || soldItem.id || soldItem.item_id;
    const soldQty = parseFloat(soldItem.quantity || soldItem.qty || soldItem.stock || 1);
    if (!targetItemId || soldQty <= 0) return;

    processedItems.push({ itemId: targetItemId, quantity: soldQty });

    const itemIndex = inventory.findIndex(i => String(i.id) === String(targetItemId) || String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemId).trim().toLowerCase());
    if (itemIndex !== -1) {
      const stockItem = { ...inventory[itemIndex] };
      const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
      const newQty = Math.max(0, currentQty - soldQty);

      stockItem.current_stock = newQty;
      stockItem.stock = newQty;
      stockItem.current_qty = newQty;
      stockItem.qty = newQty;
      inventory[itemIndex] = stockItem;
    }
  });

  // 4. Generate Double-Entry Journal Lines
  const invoiceId = invoicePayload.id || `INV-${Date.now()}`;
  
  const drCustomerLine = {
    id: `JL-${Date.now()}-DR`,
    voucher_id: invoiceId,
    account_id: customerAcc.id || resolvedCustomerId,
    account_name: customerAcc.account_name || customerAcc.name,
    date: resolvedDate,
    debit: grandTotal,
    credit: 0,
    narration: narration || `Sales Bill #${invoiceId}`
  };

  const crSalesLine = {
    id: `JL-${Date.now()}-CR1`,
    voucher_id: invoiceId,
    account_id: 'ACC-SALES-MASTER',
    account_name: 'Sales Revenue Account',
    date: resolvedDate,
    debit: 0,
    credit: numericTaxable,
    narration: `Sales Revenue for Bill #${invoiceId}`
  };

  const newJournalLines = [drCustomerLine, crSalesLine];

  if (gstAmount > 0) {
    newJournalLines.push({
      id: `JL-${Date.now()}-CR2`,
      voucher_id: invoiceId,
      account_id: 'ACC-GST-OUTPUT',
      account_name: 'GST Output Payable Account',
      date: resolvedDate,
      debit: 0,
      credit: gstAmount,
      narration: `GST Output @ ${numericGstRate}% for Bill #${invoiceId}`
    });
  }

  const invoiceRecord = {
    id: invoiceId,
    firm_id: activeFirmId,
    invoice_number: invoiceId,
    customer_id: customerAcc.id || resolvedCustomerId,
    customer_name: customerAcc.account_name || customerAcc.name,
    date: resolvedDate,
    taxable_amount: numericTaxable,
    gst_amount: gstAmount,
    total_amount: grandTotal,
    items: processedItems,
    created_at: new Date().toISOString()
  };

  const newVoucher = {
    id: invoiceId,
    firm_id: activeFirmId,
    voucher_type: 'SALES',
    type: 'SALES',
    voucher_date: resolvedDate,
    date: resolvedDate,
    reference_no: invoiceId,
    dr_account: customerAcc.account_name || customerAcc.name,
    cr_account: 'Sales Revenue Account',
    amount: grandTotal,
    total_amount: grandTotal,
    items: processedItems,
    narration: narration || `Sales Invoice #${invoiceId}`,
    entries: [
      { account_name: customerAcc.account_name || customerAcc.name, type: 'DR', debit: grandTotal, credit: 0, amount: grandTotal },
      { account_name: 'Sales Revenue Account', type: 'CR', debit: 0, credit: numericTaxable, amount: numericTaxable },
      ...(gstAmount > 0 ? [{ account_name: 'GST Output Payable Account', type: 'CR', debit: 0, credit: gstAmount, amount: gstAmount }] : [])
    ],
    created_at: new Date().toISOString()
  };

  // 5. Atomic Scoped Local Storage Commit
  StorageService.setItem(accountsKey, accounts);
  StorageService.setItem('app_account_heads', accounts);

  StorageService.setItem(inventoryKey, inventory);
  StorageService.setItem('inventory_items', inventory);

  const updatedJournal = [...newJournalLines, ...journalEntries];
  StorageService.setItem(journalKey, updatedJournal);
  StorageService.setItem('app_journal_entries', updatedJournal);

  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);
  StorageService.setItem('account_book_vouchers', updatedVouchers);

  const updatedInvoices = [invoiceRecord, ...(Array.isArray(invoices) ? invoices : [])];
  StorageService.setItem(invoicesKey, updatedInvoices);
  StorageService.setItem('app_invoices', updatedInvoices);

  // 6. Global Reactive Broadcast
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: invoiceRecord }));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return invoiceRecord;
};

/**
 * Revert inventory stock when a sales entry is deleted
 */
export const revertSalesStockOnDeletion = (voucherOrInvoiceId, firmId = 'FIRM-001') => {
  try {
    let targetId = voucherOrInvoiceId;
    if (typeof voucherOrInvoiceId === 'object') {
      targetId = voucherOrInvoiceId.id || voucherOrInvoiceId.invoice_number;
    }
    if (!targetId) return;

    const activeFirmId = firmId || 'FIRM-001';
    const vouchersKey = `account_book_vouchers_${activeFirmId}`;
    const invoicesKey = `app_invoices_${activeFirmId}`;
    const inventoryKey = `inventory_items_${activeFirmId}`;

    const vouchers = StorageService.getItem(vouchersKey) || StorageService.getItem('account_book_vouchers') || [];
    const invoices = StorageService.getItem(invoicesKey) || StorageService.getItem('app_invoices') || [];
    const inventory = StorageService.getItem(inventoryKey) || StorageService.getItem('inventory_items') || [];

    const targetVoucher = vouchers.find(v => String(v.id) === String(targetId) || String(v.reference_no) === String(targetId));
    const targetInvoice = invoices.find(i => String(i.id) === String(targetId) || String(i.invoice_number) === String(targetId));

    const itemsToRestore = targetVoucher?.items || targetInvoice?.items || [];

    if (Array.isArray(itemsToRestore) && itemsToRestore.length > 0) {
      itemsToRestore.forEach(soldItem => {
        const targetItemId = soldItem.itemId || soldItem.id || soldItem.item_id;
        const soldQty = parseFloat(soldItem.quantity || soldItem.qty || 0);
        if (!targetItemId || soldQty <= 0) return;

        const itemIndex = inventory.findIndex(i => String(i.id) === String(targetItemId) || String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemId).trim().toLowerCase());
        if (itemIndex !== -1) {
          const stockItem = { ...inventory[itemIndex] };
          const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || stockItem.current_qty || stockItem.qty || 0);
          const restoredQty = currentQty + soldQty;

          stockItem.current_stock = restoredQty;
          stockItem.stock = restoredQty;
          stockItem.current_qty = restoredQty;
          stockItem.qty = restoredQty;
          inventory[itemIndex] = stockItem;
        }
      });

      StorageService.setItem(inventoryKey, inventory);
      StorageService.setItem('inventory_items', inventory);
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
    }
  } catch (e) {
    console.error("Error reverting sales stock on deletion:", e);
  }
};

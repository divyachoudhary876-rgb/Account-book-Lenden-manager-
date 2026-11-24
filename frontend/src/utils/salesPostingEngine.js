import { StorageService } from './storageSync';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const processSalesInvoicePosting = (invoicePayload, firmId = 'FIRM-001') => {
  const activeFirmId = String(invoicePayload?.firmId || invoicePayload?.firm_id || firmId || 'FIRM-001').trim();
  const {
    customerId,
    customer_id,
    invoiceDate,
    date,
    taxableAmount,
    taxable_amount,
    gstRate,
    gst_amount,
    narration,
    items,
    line_items,
    cart,
    item,
    product,
    itemId,
    item_id,
    product_id,
    quantity,
    qty
  } = invoicePayload || {};

  const resolvedCustomerId = customerId || customer_id;
  const resolvedDate = invoiceDate || date || new Date().toISOString().slice(0, 10);
  const numericTaxable = round2(parseFloat(taxableAmount || taxable_amount || 0));
  const numericGstRate = parseFloat(gstRate || 0);
  const gstAmount = round2(parseFloat(gst_amount !== undefined && gst_amount !== null ? gst_amount : ((numericTaxable * numericGstRate) / 100)));
  const grandTotal = round2(numericTaxable + gstAmount);

  if (grandTotal <= 0) {
    throw new Error("Invalid Bill Amount: Bill Value zero se bada hona chahiye.");
  }

  // 1. Fetch Firm-Scoped Storage Buckets
  const accountsKey = `app_accounts_${activeFirmId}`;
  const vouchersKey = `account_book_vouchers_${activeFirmId}`;
  const primaryVouchersKey = `app_vouchers_${activeFirmId}`;
  const invoicesKey = `app_invoices_${activeFirmId}`;
  const salesInvoicesKey = `sales_invoices_${activeFirmId}`;
  const inventoryKey = `inventory_items_${activeFirmId}`;

  let accounts = StorageService.getItem(accountsKey, []) || StorageService.getItem('app_account_heads', []) || [];
  const vouchers = StorageService.getItem(vouchersKey, []) || [];
  const primaryVouchers = StorageService.getItem(primaryVouchersKey, []) || [];
  const invoices = StorageService.getItem(invoicesKey, []) || [];
  const salesInvoices = StorageService.getItem(salesInvoicesKey, []) || [];
  const inventory = StorageService.getItem(inventoryKey, []) || [];

  // 2. Find or Auto-Create Customer Account
  let customerIndex = accounts.findIndex(a =>
    String(a.id) === String(resolvedCustomerId) ||
    String(a.account_name || '').trim().toLowerCase() === String(resolvedCustomerId || '').trim().toLowerCase() ||
    String(a.name || '').trim().toLowerCase() === String(resolvedCustomerId || '').trim().toLowerCase()
  );

  if (customerIndex === -1 && resolvedCustomerId) {
    const cleanCustName = String(resolvedCustomerId).trim();
    const newAccountObj = {
      id: `ACC-${Date.now()}`,
      firm_id: activeFirmId,
      account_name: cleanCustName,
      name: cleanCustName,
      primary_type: 'ASSETS',
      type: 'Assets',
      sub_group: 'Sundry Debtors (Customer / देनदार)',
      group: 'Sundry Debtors',
      opening_balance: 0,
      current_balance: 0,
      balance_type: 'Dr',
      balanceType: 'Dr'
    };
    accounts.push(newAccountObj);
    customerIndex = accounts.length - 1;
    StorageService.setItem(accountsKey, accounts);
  }

  if (customerIndex === -1) {
    throw new Error("Party Not Found: Kripya valid Customer / Supplier Party select karein.");
  }

  const customerAcc = { ...accounts[customerIndex] };
  const customerName = (customerAcc.account_name || customerAcc.name || 'Customer').trim();

  // 3. Process Inventory Stock Deduction
  const rawItemsList = items || line_items || cart || (item ? [item] : []) || (product ? [product] : []) || ((itemId || item_id || product_id) ? [{ itemId: itemId || item_id || product_id, quantity: quantity || qty || 1 }] : []);
  const processedItems = [];

  rawItemsList.forEach(soldItem => {
    if (!soldItem) return;
    const targetItemId = soldItem.itemId || soldItem.item_id || soldItem.product_id || soldItem.id;
    const soldQty = parseFloat(soldItem.quantity || soldItem.qty || soldItem.stock || soldItem.count || 0);
    if (!targetItemId || soldQty <= 0) return;

    const itemIndex = inventory.findIndex(i =>
      String(i.id) === String(targetItemId) ||
      String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemId).trim().toLowerCase()
    );

    let itemName = soldItem.itemName || soldItem.item_name || soldItem.name || 'Item';
    let itemUnit = soldItem.unit || 'Pcs';

    if (itemIndex !== -1) {
      const stockItem = { ...inventory[itemIndex] };
      itemName = (stockItem.item_name || stockItem.name || itemName).trim();
      itemUnit = stockItem.unit || itemUnit;

      if (!stockItem.is_service && stockItem.item_type !== 'SERVICE') {
        const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || 0);
        const newQty = round2(Math.max(0, currentQty - soldQty));

        stockItem.current_stock = newQty;
        stockItem.stock = newQty;
        stockItem.current_qty = newQty;
        stockItem.qty = newQty;
        stockItem.updated_at = new Date().toISOString();
        inventory[itemIndex] = stockItem;
      }
    }

    const itemRate = parseFloat(soldItem.rate || 0);
    const itemTaxable = soldItem.taxableAmount !== undefined ? round2(soldItem.taxableAmount) : round2(soldQty * itemRate);
    const itemGstRate = parseFloat(soldItem.gstRate || numericGstRate || 0);
    const itemTaxAmt = soldItem.cgst !== undefined || soldItem.sgst !== undefined
      ? round2((Number(soldItem.cgst || 0)) + (Number(soldItem.sgst || 0)))
      : round2((itemTaxable * itemTaxRate) / 100);
    const itemTotal = soldItem.total !== undefined ? round2(soldItem.total) : round2(itemTaxable + itemTaxAmt);

    processedItems.push({
      itemId: targetItemId,
      itemName,
      name: itemName,
      item_name: itemName,
      unit: itemUnit,
      quantity: soldQty,
      qty: soldQty,
      rate: itemRate,
      gstRate: itemTaxRate,
      taxableAmount: itemTaxable,
      cgst: round2(itemTaxAmt / 2),
      sgst: round2(itemTaxAmt / 2),
      total: itemTotal
    });
  });

  // 4. Generate Strictly Balanced Double-Entry Voucher (Total Dr === Total Cr)
  const invoiceId = invoicePayload.id || `INV-${Date.now()}`;
  const refNo = String(invoicePayload.reference_no || invoicePayload.invoice_number || `INV-${Date.now().toString().slice(-6)}`).trim();

  const voucherEntries = [
    {
      account_name: customerName,
      party: customerName,
      type: 'DR',
      debit: grandTotal,
      credit: 0,
      amount: grandTotal
    },
    {
      account_name: 'Sales & Revenue',
      party: 'Sales & Revenue',
      type: 'CR',
      debit: 0,
      credit: numericTaxable,
      amount: numericTaxable
    }
  ];

  if (gstAmount > 0) {
    voucherEntries.push({
      account_name: 'Duties & Taxes (GST Output)',
      party: 'Duties & Taxes (GST Output)',
      type: 'CR',
      debit: 0,
      credit: gstAmount,
      amount: gstAmount
    });
  }

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
    gst_amount: gstAmount,
    items: processedItems,
    vehicle_no: invoicePayload.vehicle_no || '',
    narration: narration || `Sales Invoice #${refNo} to ${customerName}`,
    is_compound: voucherEntries.length > 2,
    entries: voucherEntries,
    created_at: new Date().toISOString()
  };

  // 5. Commit Changes Atomically
  StorageService.setItem(inventoryKey, inventory);
  localStorage.setItem(inventoryKey, JSON.stringify(inventory));
  localStorage.setItem('inventory_items', JSON.stringify(inventory));

  const filterFn = v => v && String(v.id) !== String(invoiceId) && String(v.reference_no) !== String(refNo);

  const updatedVouchers = [newVoucher, ...(Array.isArray(vouchers) ? vouchers.filter(filterFn) : [])];
  StorageService.setItem(vouchersKey, updatedVouchers);

  const updatedPrimaryVouchers = [newVoucher, ...(Array.isArray(primaryVouchers) ? primaryVouchers.filter(filterFn) : [])];
  StorageService.setItem(primaryVouchersKey, updatedPrimaryVouchers);

  const updatedInvoices = [newVoucher, ...(Array.isArray(invoices) ? invoices.filter(i => i && String(i.id) !== String(invoiceId)) : [])];
  StorageService.setItem(invoicesKey, updatedInvoices);

  const updatedSalesInvoices = [newVoucher, ...(Array.isArray(salesInvoices) ? salesInvoices.filter(i => i && String(i.id) !== String(invoiceId)) : [])];
  StorageService.setItem(salesInvoicesKey, updatedSalesInvoices);

  // 6. Global Broadcast
  window.dispatchEvent(new CustomEvent('ACCOUNT_BOOK_VOUCHER_POSTED', { detail: newVoucher }));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('storage'));

  return newVoucher;
};

/**
 * Reverts stock inventory when a sales invoice is deleted or edited.
 */
export const revertSalesStockOnDeletion = (voucherOrInvoiceId, firmId = 'FIRM-001') => {
  try {
    let targetId = voucherOrInvoiceId;
    if (typeof voucherOrInvoiceId === 'object' && voucherOrInvoiceId !== null) {
      targetId = voucherOrInvoiceId.id || voucherOrInvoiceId.invoice_number || voucherOrInvoiceId.reference_no;
    }
    if (!targetId) return;

    const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
    const vouchersKey = `account_book_vouchers_${activeFirmId}`;
    const inventoryKey = `inventory_items_${activeFirmId}`;

    const vouchers = StorageService.getItem(vouchersKey, []) || StorageService.getItem('account_book_vouchers', []) || [];
    const inventory = StorageService.getItem(inventoryKey, []) || StorageService.getItem('inventory_items', []) || [];

    const targetVoucher = vouchers.find(
      v => v &&
        (String(v.id) === String(targetId) || String(v.reference_no) === String(targetId)) &&
        (String(v.voucher_type || v.type || '').toUpperCase() === 'SALES')
    );

    if (!targetVoucher) return;

    const itemsToRestore = Array.isArray(targetVoucher.items) ? targetVoucher.items : [];

    if (itemsToRestore.length > 0) {
      itemsToRestore.forEach(soldItem => {
        if (!soldItem) return;
        const targetItemId = soldItem.itemId || soldItem.item_id || soldItem.product_id || soldItem.id;
        const targetItemName = String(soldItem.itemName || soldItem.item_name || soldItem.name || '').trim().toLowerCase();
        const soldQty = parseFloat(soldItem.quantity || soldItem.qty || 0);
        if (soldQty <= 0) return;

        const itemIndex = inventory.findIndex(i =>
          (targetItemId && String(i.id) === String(targetItemId)) ||
          (targetItemName && String(i.item_name || i.name || '').trim().toLowerCase() === targetItemName) ||
          (targetItemId && String(i.item_name || i.name || '').trim().toLowerCase() === String(targetItemId).trim().toLowerCase())
        );

        if (itemIndex !== -1) {
          const stockItem = { ...inventory[itemIndex] };
          if (!stockItem.is_service && stockItem.item_type !== 'SERVICE') {
            const currentQty = parseFloat(stockItem.current_stock || stockItem.stock || 0);
            const restoredQty = round2(currentQty + soldQty);

            stockItem.current_stock = restoredQty;
            stockItem.stock = restoredQty;
            stockItem.current_qty = restoredQty;
            stockItem.qty = restoredQty;
            inventory[itemIndex] = stockItem;
          }
        }
      });

      StorageService.setItem(inventoryKey, inventory);
      localStorage.setItem(inventoryKey, JSON.stringify(inventory));
      localStorage.setItem('inventory_items', JSON.stringify(inventory));
      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      window.dispatchEvent(new Event('app_inventory_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.error("Error reverting sales stock on deletion:", e);
  }
};

// frontend/src/utils/stockInventoryEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';

/**
 * Retrieves firm stock inventory items with standard default catalog
 */
export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  const stockKey = `app_stock_${firmId}`;
  try {
    const raw = localStorage.getItem(stockKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading stock items from local storage:', e);
  }

  const defaultStock = [
    { id: 'STK-001', item_name: 'Pakki Eent (1st Class Bricks)', current_stock: 50000, unit: 'Pcs', selling_price: 6.50, unit_purchase_price: 4.50, hsn: '69010010', is_service: false },
    { id: 'STK-002', item_name: 'Kachhi Eent (Raw Bricks)', current_stock: 45000, unit: 'Pcs', selling_price: 3.20, unit_purchase_price: 2.10, hsn: '69010010', is_service: false },
    { id: 'STK-003', item_name: 'Biomass Briquettes (White Coal)', current_stock: 120, unit: 'MT', selling_price: 5200, unit_purchase_price: 4100, hsn: '44013900', is_service: false },
    { id: 'STK-004', item_name: 'Diesel (Fuel Stock)', current_stock: 500, unit: 'Ltr', selling_price: 92, unit_purchase_price: 88, hsn: '27101944', is_service: false },
    { id: 'STK-005', item_name: 'Tractor / Transport Freight Charge', current_stock: 999999, unit: 'Trip', selling_price: 1500, unit_purchase_price: 1500, hsn: '996511', is_service: true }
  ];
  localStorage.setItem(stockKey, JSON.stringify(defaultStock));
  return defaultStock;
};

/**
 * 1. RAW MATERIAL & FUEL CONSUMPTION ENGINE
 * Deducts fuel/material stock and posts double-entry expense journal
 */
export const recordStockConsumption = (firmId = 'FIRM-001', payload = {}) => {
  const {
    item_name,
    quantity = 0,
    consumption_date = new Date().toISOString().split('T')[0],
    expense_account = 'Manufacturing & Fuel Expense',
    batch_ref = '',
    remarks = ''
  } = payload;

  const cleanQty = parseFloat(quantity || 0);
  if (cleanQty <= 0) {
    throw new Error('Consumption quantity must be greater than zero.');
  }

  if (!item_name || !item_name.trim()) {
    throw new Error('Please select a material or fuel item.');
  }

  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);
  const itemIndex = stockList.findIndex(s => s.item_name === item_name.trim());

  if (itemIndex === -1) {
    throw new Error(`Item "${item_name}" not found in stock master.`);
  }

  const targetItem = stockList[itemIndex];

  // Hard Negative Stock Verification (excluding service heads)
  if (!targetItem.is_service) {
    const currentQty = parseFloat(targetItem.current_stock || 0);
    if (currentQty < cleanQty) {
      throw new Error(
        `⛔ Insufficient Stock! Cannot consume ${cleanQty} ${targetItem.unit}.\n` +
        `Current available stock is only ${currentQty} ${targetItem.unit}.`
      );
    }
    // Deduct stock balance atomically
    stockList[itemIndex].current_stock = parseFloat((currentQty - cleanQty).toFixed(3));
  }

  // Value consumed at current weighted unit purchase price
  const unitCost = parseFloat(targetItem.unit_purchase_price || targetItem.selling_price || 0);
  const totalCost = parseFloat((cleanQty * unitCost).toFixed(2));
  const vchNumber = batch_ref.trim() || `CON-${Date.now().toString().slice(-6)}`;

  // Update persistent stock store
  localStorage.setItem(stockKey, JSON.stringify(stockList));

  // Double-Entry Posting: Dr Manufacturing Expense : Cr Raw Material Asset
  saveUniversalVoucher(firmId, {
    voucher_type: 'JOURNAL',
    voucher_date: consumption_date,
    dr_account: expense_account.trim(),
    cr_account: `${item_name.trim()} (Inventory A/c)`,
    amount: totalCost > 0 ? totalCost : 1.00,
    reference_no: vchNumber,
    narration: `Material Consumed: ${cleanQty} ${targetItem.unit} of ${item_name} ${remarks ? `(${remarks})` : ''}`
  });

  // Save Consumption Record to Audit Log
  const consumptionKey = `app_material_consumption_${firmId}`;
  const existingLogs = JSON.parse(localStorage.getItem(consumptionKey) || '[]');
  const logRecord = {
    id: `CON-LOG-${Date.now()}`,
    voucher_ref: vchNumber,
    date: consumption_date,
    item_name: item_name.trim(),
    quantity: cleanQty,
    unit: targetItem.unit,
    unit_cost: unitCost,
    total_cost: totalCost,
    expense_account: expense_account.trim(),
    remarks: remarks.trim()
  };

  existingLogs.push(logRecord);
  localStorage.setItem(consumptionKey, JSON.stringify(existingLogs));

  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return logRecord;
};

/**
 * 2. MULTI-ITEM SALES INVOICING ENGINE
 */
export const recordMultiItemSale = (firmId = 'FIRM-001', payload = {}) => {
  const {
    invoice_no,
    invoice_date = new Date().toISOString().split('T')[0],
    customer_name,
    customer_phone = '',
    vehicle_no = '',
    items = []
  } = payload;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item must be added to the invoice.');
  }

  if (!customer_name || !customer_name.trim()) {
    throw new Error('Customer account selection is mandatory.');
  }

  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);

  // Negative stock verification
  for (let i = 0; i < items.length; i++) {
    const line = items[i];
    const qty = parseFloat(line.quantity || 0);
    const rate = parseFloat(line.rate || 0);

    if (qty <= 0) throw new Error(`Row #${i + 1} (${line.item_name}): Quantity must be greater than zero.`);
    if (rate < 0) throw new Error(`Row #${i + 1} (${line.item_name}): Rate cannot be negative.`);

    const stockItem = stockList.find(s => s.item_name === line.item_name);
    if (stockItem && !stockItem.is_service) {
      const avail = parseFloat(stockItem.current_stock || 0);
      if (avail < qty) {
        throw new Error(
          `⛔ Negative Stock Blocked!\nItem: "${stockItem.item_name}"\n` +
          `Available: ${avail} ${stockItem.unit}\n` +
          `Requested: ${qty} ${stockItem.unit}`
        );
      }
    }
  }

  // Stock deduction & tax calculation
  let totalTaxable = 0;
  items.forEach(line => {
    const qty = parseFloat(line.quantity);
    const rate = parseFloat(line.rate);
    totalTaxable += (qty * rate);

    const stockIdx = stockList.findIndex(s => s.item_name === line.item_name);
    if (stockIdx !== -1 && !stockList[stockIdx].is_service) {
      const current = parseFloat(stockList[stockIdx].current_stock || 0);
      stockList[stockIdx].current_stock = parseFloat((current - qty).toFixed(3));
    }
  });

  const cgst = parseFloat((totalTaxable * 0.025).toFixed(2));
  const sgst = parseFloat((totalTaxable * 0.025).toFixed(2));
  const grandTotal = parseFloat((totalTaxable + cgst + sgst).toFixed(2));

  localStorage.setItem(stockKey, JSON.stringify(stockList));

  // Post Double-Entry Journal Voucher
  const compoundEntries = [
    { type: 'Dr', account_name: customer_name.trim(), amount: grandTotal },
    { type: 'Cr', account_name: 'Sales Account (बिक्री खाता)', amount: totalTaxable }
  ];

  if (cgst > 0) compoundEntries.push({ type: 'Cr', account_name: 'Output CGST Account (2.5%)', amount: cgst });
  if (sgst > 0) compoundEntries.push({ type: 'Cr', account_name: 'Output SGST Account (2.5%)', amount: sgst });

  saveUniversalVoucher(firmId, {
    voucher_type: 'JOURNAL',
    voucher_date: invoice_date,
    reference_no: invoice_no,
    narration: `Tax Invoice #${invoice_no} | Dispatched to ${customer_name} ${vehicle_no ? `[${vehicle_no}]` : ''}`,
    is_compound: true,
    entries: compoundEntries
  });

  // Save to sales registry
  const invRegistryKey = `app_sales_invoices_${firmId}`;
  const existingInvoices = JSON.parse(localStorage.getItem(invRegistryKey) || '[]');
  const savedInvoice = {
    id: `INV-${Date.now()}`,
    invoice_no,
    date: invoice_date,
    party: customer_name.trim(),
    customer_phone: customer_phone.trim(),
    vehicle_no: vehicle_no.trim(),
    items,
    taxable_amount: totalTaxable,
    cgst,
    sgst,
    grand_total: grandTotal,
    total: grandTotal,
    type: 'SALE'
  };

  existingInvoices.push(savedInvoice);
  localStorage.setItem(invRegistryKey, JSON.stringify(existingInvoices));

  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return savedInvoice;
};

/**
 * 3. SINGLE-ITEM SALES ENGINE (Legacy Compatibility)
 */
export const recordStockSale = (firmId = 'FIRM-001', payload = {}) => {
  const {
    invoice_no = `INV-${Date.now().toString().slice(-6)}`,
    invoice_date = new Date().toISOString().split('T')[0],
    customer_name,
    item_name,
    quantity,
    selling_rate,
    vehicle_no = ''
  } = payload;

  return recordMultiItemSale(firmId, {
    invoice_no,
    invoice_date,
    customer_name,
    vehicle_no,
    items: [
      {
        item_name,
        quantity: parseFloat(quantity || 0),
        rate: parseFloat(selling_rate || 0),
        hsn: '69010010'
      }
    ]
  });
};

/**
 * 4. PURCHASE INWARD ENGINE
 */
export const recordStockPurchase = (firmId = 'FIRM-001', payload = {}) => {
  const {
    bill_ref = `PUR-${Date.now().toString().slice(-6)}`,
    purchase_date = new Date().toISOString().split('T')[0],
    supplier_name,
    item_name,
    quantity = 0,
    purchase_rate = 0,
    vehicle_no = ''
  } = payload;

  const cleanQty = parseFloat(quantity || 0);
  const cleanRate = parseFloat(purchase_rate || 0);

  if (cleanQty <= 0) throw new Error('Purchase quantity must be greater than zero.');
  if (cleanRate <= 0) throw new Error('Purchase rate must be greater than zero.');
  if (!supplier_name || !supplier_name.trim()) throw new Error('Supplier name is mandatory.');
  if (!item_name || !item_name.trim()) throw new Error('Stock item is mandatory.');

  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);

  const itemIdx = stockList.findIndex(s => s.item_name === item_name.trim());
  if (itemIdx !== -1) {
    if (!stockList[itemIdx].is_service) {
      const current = parseFloat(stockList[itemIdx].current_stock || 0);
      stockList[itemIdx].current_stock = parseFloat((current + cleanQty).toFixed(3));
    }
    stockList[itemIdx].unit_purchase_price = cleanRate;
  } else {
    stockList.push({
      id: `STK-${Date.now()}`,
      item_name: item_name.trim(),
      current_stock: cleanQty,
      unit: 'Units',
      selling_price: parseFloat((cleanRate * 1.25).toFixed(2)),
      unit_purchase_price: cleanRate,
      hsn: '69010010',
      is_service: false
    });
  }

  const grossTotal = parseFloat((cleanQty * cleanRate).toFixed(2));
  localStorage.setItem(stockKey, JSON.stringify(stockList));

  saveUniversalVoucher(firmId, {
    voucher_type: 'JOURNAL',
    voucher_date: purchase_date,
    dr_account: 'Purchase Account (खरीद खाता)',
    cr_account: supplier_name.trim(),
    amount: grossTotal,
    reference_no: bill_ref,
    narration: `Inward Goods Received #${bill_ref} | ${item_name} (${cleanQty} units @ ₹${cleanRate})`
  });

  const purRegistryKey = `app_purchase_bills_${firmId}`;
  const existingBills = JSON.parse(localStorage.getItem(purRegistryKey) || '[]');
  const savedPurchase = {
    id: `PUR-${Date.now()}`,
    bill_ref,
    date: purchase_date,
    party: supplier_name.trim(),
    item_name: item_name.trim(),
    quantity: cleanQty,
    rate: cleanRate,
    total: grossTotal,
    vehicle_no: vehicle_no.trim(),
    type: 'PURCHASE'
  };

  existingBills.push(savedPurchase);
  localStorage.setItem(purRegistryKey, JSON.stringify(existingBills));

  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return savedPurchase;
};

// frontend/src/utils/stockInventoryEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';

/**
 * Standard Statutory Measurement Units (GST & Indian Business Aligned)
 */
export const STANDARD_MEASUREMENT_UNITS = [
  'Pcs (Pieces / नग)',
  'Ltr (Liters / लीटर)',
  'MT (Metric Ton / मीट्रिक टन)',
  'Bags (बोरी / कट्टा)',
  'Brass (ब्रास / ट्रॉली)',
  'Kgs (Kilograms / किलोग्राम)',
  'Quintal (क्विंटल)',
  'CFT (Cubic Feet / घन फुट)',
  'Sq.Ft (Square Feet / वर्ग फुट)',
  'Numbers (संख्या)'
];

/**
 * Retrieve inventory stock items for the active firm
 */
export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_stock_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Default statutory baseline items
    const defaultStock = [
      { id: 'STK-001', item_name: 'Diesel', unit: 'Ltr', current_stock: 500, unit_purchase_price: 90.00, selling_price: 0 },
      { id: 'STK-002', item_name: 'Coal / Steam Coal', unit: 'MT', current_stock: 25, unit_purchase_price: 8500.00, selling_price: 0 },
      { id: 'STK-003', item_name: 'Pakki Eent (Red Bricks - 1st Class)', unit: 'Pcs', current_stock: 50000, unit_purchase_price: 5.50, selling_price: 7.50 },
      { id: 'STK-004', item_name: 'Biomass Briquette / Mustard Husk', unit: 'MT', current_stock: 40, unit_purchase_price: 4200.00, selling_price: 0 }
    ];
    localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(defaultStock));
    return defaultStock;
  } catch {
    return [];
  }
};

/**
 * Save or Update an item in Stock Master
 */
export const saveStockItemMaster = (firmId = 'FIRM-001', itemData = {}) => {
  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);

  const cleanName = (itemData.item_name || '').trim();
  if (!cleanName) {
    throw new Error('⚠️ Stock item name cannot be empty.');
  }

  const payload = {
    id: itemData.id || `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    item_name: cleanName,
    unit: itemData.unit || 'Pcs',
    current_stock: parseFloat(itemData.current_stock || 0),
    unit_purchase_price: parseFloat(itemData.unit_purchase_price || itemData.purchase_rate || 0),
    selling_price: parseFloat(itemData.selling_price || itemData.sale_rate || 0),
    updated_at: new Date().toISOString()
  };

  const existingIdx = stockList.findIndex(
    i => i.id === payload.id || (i.item_name || '').trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (existingIdx !== -1) {
    stockList[existingIdx] = { ...stockList[existingIdx], ...payload };
  } else {
    stockList.push(payload);
  }

  localStorage.setItem(stockKey, JSON.stringify(stockList));
  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return payload;
};

/**
 * Delete an item from Stock Master
 */
export const deleteStockItemMaster = (firmId = 'FIRM-001', itemId = '') => {
  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);
  const updatedList = stockList.filter(i => i.id !== itemId);

  localStorage.setItem(stockKey, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return true;
};

/**
 * Update stock quantity for Sales Invoicing, Purchase, and Stock Adjustments
 */
export const updateStockItemQuantity = (firmId = 'FIRM-001', itemName = '', qtyDelta = 0, unitRate = null) => {
  if (!itemName) return false;

  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);
  const normalizedTarget = itemName.trim().toLowerCase();

  const itemIndex = stockList.findIndex(
    i => (i.item_name || '').trim().toLowerCase() === normalizedTarget
  );

  const delta = parseFloat(qtyDelta || 0);

  if (itemIndex !== -1) {
    const currentStock = parseFloat(stockList[itemIndex].current_stock || 0);
    stockList[itemIndex].current_stock = currentStock + delta;
    if (unitRate !== null && !isNaN(parseFloat(unitRate)) && parseFloat(unitRate) > 0) {
      stockList[itemIndex].unit_purchase_price = parseFloat(unitRate);
    }
    stockList[itemIndex].updated_at = new Date().toISOString();
  } else {
    stockList.push({
      id: `STK-${Date.now()}`,
      item_name: itemName.trim(),
      unit: 'Pcs',
      current_stock: delta > 0 ? delta : 0,
      unit_purchase_price: unitRate ? parseFloat(unitRate) : 0,
      selling_price: unitRate ? parseFloat(unitRate) : 0,
      updated_at: new Date().toISOString()
    });
  }

  localStorage.setItem(stockKey, JSON.stringify(stockList));
  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return true;
};

/**
 * Record Internal Material / Fuel Consumption (e.g. Diesel in Tractor)
 * Deducts physical quantity and automatically posts a Double-Entry Journal Voucher (JV).
 */
export const recordStockConsumption = (firmId = 'FIRM-001', consumptionData = {}) => {
  const {
    item_name = 'Diesel',
    quantity = 0,
    consumption_date = new Date().toISOString().split('T')[0],
    expense_head = 'Tractor Fuel & Running Expense',
    machinery_ref = 'Tractor',
    remarks = ''
  } = consumptionData;

  const qty = parseFloat(quantity || 0);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('⚠️ Consumption quantity zero se adhik honi chahiye.');
  }

  const stockKey = `app_stock_${firmId}`;
  const currentStockList = getStockItemsByFirm(firmId);

  const itemIndex = currentStockList.findIndex(
    i => (i.item_name || '').trim().toLowerCase() === item_name.trim().toLowerCase()
  );

  if (itemIndex === -1) {
    throw new Error(`⚠️ Item "${item_name}" stock register me nahi mila.`);
  }

  const targetItem = currentStockList[itemIndex];
  const availableQty = parseFloat(targetItem.current_stock || 0);
  const unitRate = parseFloat(targetItem.unit_purchase_price || targetItem.purchase_rate || 0);

  // STRICT NEGATIVE STOCK GUARD
  if (availableQty - qty < 0) {
    throw new Error(
      `⛔ Insufficient Stock Balance!\n\n` +
      `• Available ${item_name}: ${availableQty.toFixed(2)} ${targetItem.unit || 'Units'}\n` +
      `• Requested Consumption: ${qty.toFixed(2)} ${targetItem.unit || 'Units'}\n` +
      `• Shortfall: ${(qty - availableQty).toFixed(2)} ${targetItem.unit || 'Units'}\n\n` +
      `Pehle Purchase Entry karke stock add karein.`
    );
  }

  const totalExpenseAmount = qty * unitRate;

  // 1. Deduct Stock Quantity
  currentStockList[itemIndex].current_stock = availableQty - qty;
  currentStockList[itemIndex].updated_at = new Date().toISOString();
  localStorage.setItem(stockKey, JSON.stringify(currentStockList));

  // 2. Automated Double-Entry Journal Voucher (JV) Posting
  const narrationText = `Consumed ${qty} ${targetItem.unit || 'Ltr'} ${item_name} in ${machinery_ref} @ ₹${unitRate.toFixed(2)}/${targetItem.unit || 'Unit'}. ${remarks ? '(' + remarks + ')' : ''}`;

  saveUniversalVoucher(firmId, {
    voucher_type: 'JOURNAL',
    voucher_date: consumption_date,
    dr_account: expense_head.trim(),
    cr_account: `${item_name.trim()} Stock Account`,
    amount: totalExpenseAmount,
    reference_no: `CNS-${Date.now().toString().slice(-4)}`,
    narration: narrationText
  });

  // 3. Trigger Reactive Global Events
  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return {
    success: true,
    item_name,
    unit: targetItem.unit || 'Ltr',
    quantity_consumed: qty,
    remaining_stock: currentStockList[itemIndex].current_stock,
    unit_cost: unitRate,
    total_expense: totalExpenseAmount
  };
};

// Aliases for backwards compatibility
export const saveStockItem = saveStockItemMaster;
export const deleteStockItem = deleteStockItemMaster;

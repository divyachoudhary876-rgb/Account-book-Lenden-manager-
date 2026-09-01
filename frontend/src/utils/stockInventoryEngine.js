// frontend/src/utils/stockInventoryEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';

/**
 * Retrieve inventory stock items for active firm
 */
export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_stock_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    
    // Seed default baseline items if empty
    const defaultStock = [
      { id: 'STK-001', item_name: 'Diesel', unit: 'Ltr', current_stock: 500, unit_purchase_price: 90.00, selling_price: 0 },
      { id: 'STK-002', item_name: 'Coal / Steam Coal', unit: 'MT', current_stock: 25, unit_purchase_price: 8500.00, selling_price: 0 },
      { id: 'STK-003', item_name: 'Biomass Briquette / Husk', unit: 'MT', current_stock: 40, unit_purchase_price: 4200.00, selling_price: 0 }
    ];
    localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(defaultStock));
    return defaultStock;
  } catch {
    return [];
  }
};

/**
 * Record Internal Fuel / Material Consumption
 * 1. Validates and deducts physical quantity from stock
 * 2. Posts an automated Double-Entry Journal Voucher
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

  // NEGATIVE STOCK GUARD
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

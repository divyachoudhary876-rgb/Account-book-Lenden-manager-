// frontend/src/utils/manufacturingEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';

/**
 * Execute Manufacturing Batch Process:
 * 1. Checks and validates raw material stock availability.
 * 2. Deducts raw material quantities from stock register.
 * 3. Adds finished goods quantity and computes per-unit production cost.
 * 4. Posts Double-Entry Journal Voucher (JV) to keep P&L and Balance Sheet synchronized.
 */
export const executeProductionBatch = (firmId = 'FIRM-001', batchPayload = {}) => {
  const {
    production_date = new Date().toISOString().split('T')[0],
    batch_ref = `BATCH-${Date.now().toString().slice(-4)}`,
    finished_item_name = 'Pakki Eent (Red Bricks - 1st Class)',
    finished_quantity = 0,
    raw_materials = [], // [{ item_name: 'Coal', quantity: 2 }, { item_name: 'Diesel', quantity: 50 }]
    labor_cost = 0,
    other_overhead = 0
  } = batchPayload;

  const producedQty = parseFloat(finished_quantity || 0);
  if (producedQty <= 0) {
    throw new Error('Produced finished goods quantity must be greater than zero.');
  }

  const stockKey = `app_stock_${firmId}`;
  const stockList = getStockItemsByFirm(firmId);

  let totalRawMaterialCost = 0;
  const validationErrors = [];

  // Step 1: Pre-validation & Stock Availability Check
  raw_materials.forEach(mat => {
    const item = stockList.find(i => i.item_name.trim().toLowerCase() === mat.item_name.trim().toLowerCase());
    const reqQty = parseFloat(mat.quantity || 0);

    if (!item) {
      validationErrors.push(`Item "${mat.item_name}" stock register me nahi mila.`);
      return;
    }

    const availQty = parseFloat(item.current_stock || 0);
    if (availQty < reqQty) {
      validationErrors.push(`Insufficient ${mat.item_name}: Available ${availQty} ${item.unit}, required ${reqQty} ${item.unit}.`);
    }
  });

  if (validationErrors.length > 0) {
    throw new Error(`Production Blocked:\n${validationErrors.join('\n')}`);
  }

  // Step 2: Deduct Raw Materials from Stock
  raw_materials.forEach(mat => {
    const idx = stockList.findIndex(i => i.item_name.trim().toLowerCase() === mat.item_name.trim().toLowerCase());
    const reqQty = parseFloat(mat.quantity || 0);
    const unitRate = parseFloat(stockList[idx].unit_purchase_price || 0);
    const itemCost = reqQty * unitRate;

    totalRawMaterialCost += itemCost;
    stockList[idx].current_stock = parseFloat(stockList[idx].current_stock || 0) - reqQty;
    stockList[idx].updated_at = new Date().toISOString();
  });

  const totalBatchCost = totalRawMaterialCost + parseFloat(labor_cost || 0) + parseFloat(other_overhead || 0);
  const perUnitProductionCost = totalBatchCost / producedQty;

  // Step 3: Add / Update Finished Goods Stock
  const fgIdx = stockList.findIndex(i => i.item_name.trim().toLowerCase() === finished_item_name.trim().toLowerCase());
  if (fgIdx !== -1) {
    const oldQty = parseFloat(stockList[fgIdx].current_stock || 0);
    const newQty = oldQty + producedQty;
    stockList[fgIdx].current_stock = newQty;
    stockList[fgIdx].unit_purchase_price = perUnitProductionCost;
    stockList[fgIdx].updated_at = new Date().toISOString();
  } else {
    stockList.push({
      id: `STK-${Date.now()}`,
      item_name: finished_item_name.trim(),
      unit: 'Pcs',
      current_stock: producedQty,
      unit_purchase_price: perUnitProductionCost,
      selling_price: perUnitProductionCost * 1.3,
      updated_at: new Date().toISOString()
    });
  }

  localStorage.setItem(stockKey, JSON.stringify(stockList));

  // Step 4: Post Accounting Journal Voucher (JV)
  saveUniversalVoucher(firmId, {
    voucher_type: 'JOURNAL',
    voucher_date: production_date,
    dr_account: `${finished_item_name} Inventory Account`,
    cr_account: 'Manufacturing / Work-in-Progress (WIP)',
    amount: totalBatchCost,
    reference_no: batch_ref,
    narration: `Manufactured ${producedQty} units of ${finished_item_name}. Raw material cost: ₹${totalRawMaterialCost.toFixed(2)}, Labor: ₹${labor_cost}, Overheads: ₹${other_overhead}. Cost/Unit: ₹${perUnitProductionCost.toFixed(2)}`
  });

  // Step 5: Trigger Global Reactivity
  window.dispatchEvent(new Event('stock_updated'));
  window.dispatchEvent(new Event('app_state_updated'));

  return {
    success: true,
    produced_item: finished_item_name,
    produced_quantity: producedQty,
    total_cost: totalBatchCost,
    per_unit_cost: perUnitProductionCost
  };
};

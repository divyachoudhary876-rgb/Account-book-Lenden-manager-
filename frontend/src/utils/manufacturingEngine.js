// frontend/src/utils/manufacturingEngine.js

import { saveUniversalVoucher } from './voucherPostingEngine.js';
import { getStockItemsByFirm } from './stockInventoryEngine.js';
import { StorageService } from './storageSync.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Execute Manufacturing Batch Process:
 * 1. Checks and validates raw material stock availability.
 * 2. Deducts raw material quantities strictly from inventory_items_${firmId}.
 * 3. Adds finished goods quantity and computes accurate per-unit production cost.
 * 4. Posts Double-Entry Journal Voucher (JV) & auto-registers WIP ledgers to keep P&L and Balance Sheet balanced.
 */
export const executeProductionBatch = (firmId = 'FIRM-001', batchPayload = {}) => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  
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

  // 1. Fetch live stock strictly from correct inventory bucket
  const stockList = getStockItemsByFirm(activeFirmId);

  let totalRawMaterialCost = 0;
  const validationErrors = [];

  // Step 1: Pre-validation & Stock Availability Check
  raw_materials.forEach(mat => {
    const matName = (mat.item_name || mat.name || '').trim();
    const item = stockList.find(i => (i.item_name || i.name || '').trim().toLowerCase() === matName.toLowerCase());
    const reqQty = parseFloat(mat.quantity || mat.qty || 0);

    if (!item) {
      validationErrors.push(`Item "${matName}" stock register me nahi mila.`);
      return;
    }

    const availQty = parseFloat(item.current_stock || item.stock || 0);
    if (availQty < reqQty && !item.is_service && item.item_type !== 'SERVICE') {
      validationErrors.push(`Insufficient ${matName}: Available ${availQty} ${item.unit || 'Units'}, required ${reqQty} ${item.unit || 'Units'}.`);
    }
  });

  if (validationErrors.length > 0) {
    throw new Error(`Production Blocked:\n${validationErrors.join('\n')}`);
  }

  // Step 2: Deduct Raw Materials from Stock
  raw_materials.forEach(mat => {
    const matName = (mat.item_name || mat.name || '').trim();
    const idx = stockList.findIndex(i => (i.item_name || i.name || '').trim().toLowerCase() === matName.toLowerCase());
    const reqQty = parseFloat(mat.quantity || mat.qty || 0);
    const unitRate = parseFloat(stockList[idx].unit_purchase_price || stockList[idx].purchase_price || stockList[idx].rate || 0);
    const itemCost = round2(reqQty * unitRate);

    totalRawMaterialCost = round2(totalRawMaterialCost + itemCost);
    const currentQty = parseFloat(stockList[idx].current_stock || stockList[idx].stock || 0);
    const newQty = round2(Math.max(0, currentQty - reqQty));
    
    stockList[idx].current_stock = newQty;
    stockList[idx].stock = newQty;
    stockList[idx].current_qty = newQty;
    stockList[idx].qty = newQty;
    stockList[idx].updated_at = new Date().toISOString();
  });

  const numericLabor = parseFloat(labor_cost || 0);
  const numericOverhead = parseFloat(other_overhead || 0);
  const totalBatchCost = round2(totalRawMaterialCost + numericLabor + numericOverhead);
  const perUnitProductionCost = round2(totalBatchCost / producedQty);

  // Step 3: Add / Update Finished Goods in Inventory
  const cleanFinishedName = finished_item_name.trim();
  const fgIdx = stockList.findIndex(i => (i.item_name || i.name || '').trim().toLowerCase() === cleanFinishedName.toLowerCase());
  
  if (fgIdx !== -1) {
    const oldQty = parseFloat(stockList[fgIdx].current_stock || stockList[fgIdx].stock || 0);
    const newQty = round2(oldQty + producedQty);
    stockList[fgIdx].current_stock = newQty;
    stockList[fgIdx].stock = newQty;
    stockList[fgIdx].current_qty = newQty;
    stockList[fgIdx].qty = newQty;
    stockList[fgIdx].unit_purchase_price = perUnitProductionCost;
    stockList[fgIdx].purchase_price = perUnitProductionCost;
    stockList[fgIdx].rate = perUnitProductionCost;
    stockList[fgIdx].updated_at = new Date().toISOString();
  } else {
    stockList.push({
      id: `ITEM-${Date.now()}`,
      firm_id: activeFirmId,
      item_name: cleanFinishedName,
      name: cleanFinishedName,
      item_type: 'PHYSICAL',
      unit: cleanFinishedName.toLowerCase().includes('briquette') ? 'MT' : 'Pcs',
      opening_stock: 0,
      current_stock: producedQty,
      stock: producedQty,
      current_qty: producedQty,
      qty: producedQty,
      unit_purchase_price: perUnitProductionCost,
      purchase_price: perUnitProductionCost,
      rate: perUnitProductionCost,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  // Save strictly to the standard inventory key used across all views
  StorageService.saveInventoryItems(stockList, activeFirmId);

  // Step 4: Ensure Statutory Manufacturing Ledgers Exist in Account Master
  const accounts = getFirmMasterAccounts(activeFirmId);
  const finishedInventoryLedger = `${cleanFinishedName} Stock Account`;
  const wipLedger = 'Manufacturing / Work-in-Progress (WIP)';

  if (!accounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === finishedInventoryLedger.toLowerCase())) {
    saveMasterAccount(activeFirmId, {
      account_name: finishedInventoryLedger,
      primary_type: 'ASSETS',
      type: 'Assets',
      sub_group: 'Finished Goods Inventory (तैयार माल)',
      balance_type: 'Dr'
    });
  }
  if (!accounts.some(a => (a.account_name || a.name || '').trim().toLowerCase() === wipLedger.toLowerCase())) {
    saveMasterAccount(activeFirmId, {
      account_name: wipLedger,
      primary_type: 'EXPENSES',
      type: 'Expenses',
      sub_group: 'Direct Production & Factory Expenses',
      balance_type: 'Cr'
    });
  }

  // Step 5: Post Accounting Double-Entry Journal Voucher (JV)
  saveUniversalVoucher(activeFirmId, {
    voucher_type: 'JOURNAL',
    voucher_date: production_date,
    date: production_date,
    dr_account: finishedInventoryLedger,
    cr_account: wipLedger,
    amount: totalBatchCost,
    total_amount: totalBatchCost,
    reference_no: batch_ref,
    narration: `Manufactured ${producedQty} units of ${cleanFinishedName}. Raw materials: ₹${totalRawMaterialCost}, Labor: ₹${numericLabor}, Overhead: ₹${numericOverhead}. Cost/Unit: ₹${perUnitProductionCost}`,
    is_compound: true,
    entries: [
      { account_name: finishedInventoryLedger, party: finishedInventoryLedger, type: 'DR', debit: totalBatchCost, credit: 0, amount: totalBatchCost },
      { account_name: wipLedger, party: wipLedger, type: 'CR', debit: 0, credit: totalBatchCost, amount: totalBatchCost }
    ]
  });

  // Step 6: Save Production Batch Record for Dashboard Stats
  const effectiveFY = localStorage.getItem(`app_active_fy_${activeFirmId}`) || 'FY 2026-27';
  const prodStorageKey = `bhatta_production_${activeFirmId}_${effectiveFY}`;
  const existingBatches = JSON.parse(localStorage.getItem(prodStorageKey) || '[]');
  existingBatches.unshift({
    id: `BATCH-REC-${Date.now()}`,
    batch_ref,
    date: production_date,
    item_name: cleanFinishedName,
    produced_qty: producedQty,
    quantity: producedQty,
    unit_cost: perUnitProductionCost,
    total_cost: totalBatchCost
  });
  localStorage.setItem(prodStorageKey, JSON.stringify(existingBatches));

  // Step 7: Trigger Global Reactivity
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    produced_item: cleanFinishedName,
    produced_quantity: producedQty,
    total_cost: totalBatchCost,
    per_unit_cost: perUnitProductionCost
  };
};

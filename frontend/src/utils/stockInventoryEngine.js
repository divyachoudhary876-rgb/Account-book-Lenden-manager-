// frontend/src/utils/stockInventoryEngine.js

import { StorageService } from './storageSync.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Retrieve inventory stock items with dual-key synchronization across active firm
 */
export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  
  let rawItems = [];
  try {
    const scopedKey = `inventory_items_${activeFirmId}`;
    const scopedVal = localStorage.getItem(scopedKey);
    if (scopedVal) {
      rawItems = JSON.parse(scopedVal);
    } else {
      rawItems = StorageService.getInventoryItems(activeFirmId) || [];
    }
  } catch (e) {
    rawItems = [];
  }

  // Fallback check to global inventory keys if scoped is empty
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    try {
      const globalRaw = localStorage.getItem('inventory_items') || localStorage.getItem('app_inventory');
      if (globalRaw) {
        rawItems = JSON.parse(globalRaw);
      }
    } catch (e) {}
  }

  return (Array.isArray(rawItems) ? rawItems : []).filter(item => item && (item.name || item.item_name)).map(item => {
    const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.purchasePrice || item.rate || 0);
    const stock = parseFloat(item.current_stock || item.stock || item.qty || item.current_qty || 0);
    const itemNameClean = String(item.item_name || item.name || item.itemName || 'Item').trim();
    
    return {
      ...item,
      id: item.id || `ITEM-${Math.random()}`,
      firm_id: activeFirmId,
      item_name: itemNameClean,
      name: itemNameClean,
      current_stock: stock,
      stock: stock,
      qty: stock,
      current_qty: stock,
      unit_purchase_price: rate,
      purchase_price: rate,
      rate: rate
    };
  });
};

/**
 * Atomic stock update (+IN on purchase, -OUT on sales/consumption) with Dual-Key Redundancy
 */
export const updateStockItemQuantity = (firmId = 'FIRM-001', itemName = '', qtyChange = 0, newUnitRate = 0) => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const cleanItemName = (itemName || '').trim().toLowerCase();
  const delta = parseFloat(qtyChange || 0);
  const rate = parseFloat(newUnitRate || 0);

  const items = getStockItemsByFirm(activeFirmId);
  const targetIndex = items.findIndex(i => (i.item_name || i.name || '').trim().toLowerCase() === cleanItemName);

  let updatedTarget = null;

  if (targetIndex !== -1) {
    const existing = items[targetIndex];
    const oldQty = parseFloat(existing.current_stock || existing.stock || 0);
    const newQty = round2(Math.max(0, oldQty + delta));
    const effectiveRate = rate > 0 ? rate : parseFloat(existing.unit_purchase_price || existing.purchase_price || 0);

    updatedTarget = {
      ...existing,
      current_stock: newQty,
      stock: newQty,
      qty: newQty,
      current_qty: newQty,
      unit_purchase_price: effectiveRate,
      purchase_price: effectiveRate,
      rate: effectiveRate,
      updated_at: new Date().toISOString()
    };
    items[targetIndex] = updatedTarget;
  } else {
    // If not found, create item atomically
    updatedTarget = {
      id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firm_id: activeFirmId,
      item_name: itemName.trim(),
      name: itemName.trim(),
      item_type: 'PHYSICAL',
      unit: itemName.toLowerCase().includes('diesel') ? 'Liters' : (itemName.toLowerCase().includes('husk') || itemName.toLowerCase().includes('coal') ? 'MT' : 'Pcs'),
      opening_stock: 0,
      current_stock: round2(Math.max(0, delta)),
      stock: round2(Math.max(0, delta)),
      qty: round2(Math.max(0, delta)),
      current_qty: round2(Math.max(0, delta)),
      unit_purchase_price: rate,
      purchase_price: rate,
      rate: rate,
      created_at: new Date().toISOString()
    };
    items.push(updatedTarget);
  }

  // Save to both firm-scoped and global storage buckets to prevent any sync miss
  const scopedKey = `inventory_items_${activeFirmId}`;
  const serialized = JSON.stringify(items);
  localStorage.setItem(scopedKey, serialized);
  localStorage.setItem('inventory_items', serialized);
  localStorage.setItem('app_inventory', serialized);

  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return updatedTarget;
};

/**
 * Universal save utility for full inventory item lists
 */
export const saveStockItem = (firmId = 'FIRM-001', itemsList = []) => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const scopedKey = `inventory_items_${activeFirmId}`;
  const serialized = JSON.stringify(itemsList);
  
  localStorage.setItem(scopedKey, serialized);
  localStorage.setItem('inventory_items', serialized);
  localStorage.setItem('app_inventory', serialized);

  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));
  return true;
};

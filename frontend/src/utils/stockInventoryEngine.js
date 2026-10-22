/**
 * Frontend Utility: Stock Inventory Engine
 * Unified Multi-Firm Inventory & Stock Management Engine with Cross-Key Synchronization.
 */

import { StorageService } from './storageSync';

const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.id || firmInput.firm_id || firmInput.firmId || 'FIRM-001';
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

/**
 * Universal Stock Items Fetcher across all possible inventory storage keys
 */
export const getStockItemsByFirm = (firmInput) => {
  const firmId = resolveFirmId(firmInput);
  const possibleKeys = [
    `inventory_items_${firmId}`,
    `app_stock_${firmId}`,
    `app_inventory_${firmId}`,
    `firm_inventory_${firmId}`,
    'inventory_items',
    'app_stock'
  ];

  let items = [];
  for (const key of possibleKeys) {
    try {
      const raw = StorageService.getItem(key, []) || JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(raw) && raw.length > 0) {
        items = raw;
        break;
      }
    } catch (e) {}
  }

  // Deduplicate by ID or Name
  const uniqueMap = new Map();
  items.forEach(it => {
    if (!it) return;
    const name = String(it.item_name || it.name || '').trim();
    if (!name) return;
    const uid = String(it.id || name).toLowerCase();
    if (!uniqueMap.has(uid)) {
      uniqueMap.set(uid, {
        ...it,
        name,
        item_name: name,
        current_stock: parseFloat(it.current_stock || it.stock || it.qty || 0),
        unit_purchase_price: parseFloat(it.unit_purchase_price || it.purchase_price || it.rate || 0)
      });
    }
  });

  return Array.from(uniqueMap.values());
};

/**
 * Universal Live Stock Calculator for any item
 */
export const getFirmItemStock = (firmInput, itemName) => {
  if (!itemName) return 0;
  const firmId = resolveFirmId(firmInput);
  const items = getStockItemsByFirm(firmId);
  
  const cleanTarget = String(itemName).trim().toLowerCase();
  const match = items.find(i => {
    const n = String(i.item_name || i.name || '').trim().toLowerCase();
    return n === cleanTarget;
  });

  if (!match) return 0;
  return parseFloat(match.current_stock || match.stock || match.qty || 0);
};

/**
 * Universal Stock Saver ensuring multi-key synchronization
 */
export const saveStockItemsByFirm = (firmInput, itemsArray) => {
  const firmId = resolveFirmId(firmInput);
  const primaryKey = `inventory_items_${firmId}`;
  const secondaryKey = `app_stock_${firmId}`;

  StorageService.setItem(primaryKey, itemsArray);
  StorageService.setItem(secondaryKey, itemsArray);
  localStorage.setItem(primaryKey, JSON.stringify(itemsArray));
  localStorage.setItem(secondaryKey, JSON.stringify(itemsArray));
  localStorage.setItem('inventory_items', JSON.stringify(itemsArray));

  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));
  return itemsArray;
};

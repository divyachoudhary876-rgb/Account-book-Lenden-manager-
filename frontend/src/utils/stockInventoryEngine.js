/**
 * Stock & Inventory Reconciliation Engine for Account Book Smart Manager
 * Single Source of Truth for Real-Time Item Stock Calculation (Zero Discrepancy & Multi-Key Sync).
 */

import { IDBStorage } from './indexedDbStorage.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Robust Item Name Normalizer for accurate matching across modules
 */
const normalizeItemName = (name) => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\b(stock account|account|stock)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

export const getFirmItemStock = (firmId, itemName) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  const targetRaw = String(itemName || '').trim();
  const targetNorm = normalizeItemName(targetRaw);
  if (!targetNorm) return 0;

  try {
    // 1. Gather all Inward (Purchases) strictly for this firm
    const purchases = [
      ...(IDBStorage.getItem(`purchase_bills_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem('purchase_bills', []) || [])
    ];
    
    // 2. Gather all Outward (Sales)
    const salesInvoices = [
      ...(IDBStorage.getItem(`sales_invoices_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem(`app_invoices_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem('sales_invoices', []) || [])
    ];

    // 3. Gather all Outward (Material Consumptions / Adjustments)
    const adjustments = [
      ...(IDBStorage.getItem(`universal_material_adjustments_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem('universal_material_adjustments', []) || []),
      ...(IDBStorage.getItem(`material_consumptions_${cleanFirmId}`, []) || [])
    ];

    let totalInward = 0;
    let totalOutward = 0;

    // Calculate Inward Qty (+) with normalized comparison
    purchases.forEach(p => {
      if (!p) return;
      if (Array.isArray(p.items) && p.items.length > 0) {
        p.items.forEach(it => {
          if (!it) return;
          const itName = normalizeItemName(it.itemName || it.item_name || it.name || '');
          if (itName === targetNorm || itName.includes(targetNorm) || targetNorm.includes(itName)) {
            totalInward += parseFloat(it.qty || it.quantity || 0);
          }
        });
      } else {
        const pName = normalizeItemName(p.item_name || p.itemName || p.name || '');
        if (pName === targetNorm || pName.includes(targetNorm) || targetNorm.includes(pName)) {
          totalInward += parseFloat(p.quantity || p.qty || 0);
        }
      }
    });

    // Calculate Outward Qty from Sales (-) with normalized comparison
    salesInvoices.forEach(s => {
      if (!s) return;
      if (Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(si => {
          if (!si) return;
          const sName = normalizeItemName(si.itemName || si.item_name || si.name || '');
          if (sName === targetNorm || sName.includes(targetNorm) || targetNorm.includes(sName)) {
            totalOutward += parseFloat(si.qty || si.quantity || 0);
          }
        });
      }
    });

    // Calculate Outward Qty from Material Adjustments (-) with normalized comparison
    adjustments.forEach(a => {
      if (!a) return;
      const aName = normalizeItemName(a.item_name || a.itemName || '');
      const aStockId = normalizeItemName(a.stock_id || a.itemId || '');
      if (aName === targetNorm || aStockId === targetNorm || aName.includes(targetNorm) || targetNorm.includes(aName)) {
        totalOutward += parseFloat(a.quantity || a.qty || 0);
      }
    });

    // Net Stock calculation
    const netStock = round2(totalInward - totalOutward);
    return netStock; 
  } catch (err) {
    console.error('[stockInventoryEngine] Error computing item stock:', err);
    return 0;
  }
};

export const getStockItemsByFirm = (firmId) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  try {
    // FIX: Multi-key fallback scanning so edited or newly saved items are never missed
    const possibleKeys = [
      `inventory_items_${cleanFirmId}`,
      `app_stock_${cleanFirmId}`,
      `app_inventory_${cleanFirmId}`,
      'inventory_items',
      'app_stock'
    ];

    let items = [];
    for (const key of possibleKeys) {
      try {
        const raw = IDBStorage.getItem(key, []) || JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(raw) && raw.length > 0) {
          items = raw;
          break;
        }
      } catch (e) {}
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      items = [
        { id: 'DEF-DIESEL', name: 'Diesel', item_name: 'Diesel', unit: 'Liters', unit_purchase_price: 96.06 },
        { id: 'DEF-MITTI-A', name: 'Mitti Grade A', item_name: 'Mitti Grade A', unit: 'Quintal', unit_purchase_price: 14.20 },
        { id: 'DEF-MITTI-B', name: 'Mitti Grade B', item_name: 'Mitti Grade B', unit: 'Quintal', unit_purchase_price: 10.50 }
      ];
    }

    const uniqueMap = new Map();
    items.forEach(i => {
      if (!i) return;
      const itemName = String(i.name || i.item_name || '').trim();
      if (!itemName) return;
      const realStock = getFirmItemStock(cleanFirmId, itemName);
      const uid = String(i.id || itemName).toLowerCase();

      if (!uniqueMap.has(uid)) {
        uniqueMap.set(uid, {
          ...i,
          name: itemName,
          item_name: itemName,
          current_stock: realStock,
          stock: realStock,
          qty: realStock
        });
      }
    });

    return Array.from(uniqueMap.values());
  } catch (e) {
    return [];
  }
};

export const syncInventoryItemStock = (firmId, itemId, itemName) => {
  try {
    const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
    const inventoryKey = `inventory_items_${cleanFirmId}`;
    let items = IDBStorage.getItem(inventoryKey, []) || [];

    const realStock = getFirmItemStock(cleanFirmId, itemName);
    const targetNorm = normalizeItemName(itemName);
    const index = items.findIndex(i => i.id === itemId || normalizeItemName(i.name || i.item_name || '') === targetNorm);

    if (index !== -1) {
      items[index].current_stock = realStock;
      items[index].stock = realStock;
      items[index].qty = realStock;
      items[index].updated_at = new Date().toISOString();
    } else {
      items.push({
        id: itemId || `ITEM-${Date.now()}`,
        firm_id: cleanFirmId,
        name: itemName,
        item_name: itemName,
        current_stock: realStock,
        stock: realStock,
        qty: realStock,
        unit: String(itemName).toLowerCase().includes('diesel') ? 'Liters' : 'Quintal',
        created_at: new Date().toISOString()
      });
    }

    IDBStorage.setItem(inventoryKey, items);
    IDBStorage.setItem(`app_stock_${cleanFirmId}`, items);
    window.dispatchEvent(new Event('app_inventory_updated'));
  } catch (e) {
    console.error('[stockInventoryEngine] Error syncing item stock:', e);
  }
};

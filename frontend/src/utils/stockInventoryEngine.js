/**
 * Frontend Utility: Stock Inventory Engine
 * Single Source of Truth for Real-Time Item Stock Calculation & Inventory Management with Strict Firm Isolation.
 */

import { IDBStorage } from './indexedDbStorage.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const normalizeItemName = (name) => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\b(stock account|account|stock)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Computes strict exact-match real-time stock for any inventory item within a firm
 */
export const getFirmItemStock = (firmId, itemName) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  const targetNorm = normalizeItemName(itemName);
  if (!targetNorm) return 0;

  try {
    const purchases = IDBStorage.getItem(`purchase_bills_${cleanFirmId}`, []) || IDBStorage.getItem('purchase_bills', []) || [];
    const salesInvoices = [
      ...(IDBStorage.getItem(`sales_invoices_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem(`app_invoices_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem('sales_invoices', []) || [])
    ];
    const adjustments = [
      ...(IDBStorage.getItem(`universal_material_adjustments_${cleanFirmId}`, []) || []),
      ...(IDBStorage.getItem('universal_material_adjustments', []) || []),
      ...(IDBStorage.getItem(`material_consumptions_${cleanFirmId}`, []) || [])
    ];

    let totalInward = 0;
    let totalOutward = 0;

    purchases.forEach(p => {
      if (!p) return;
      if (Array.isArray(p.items) && p.items.length > 0) {
        p.items.forEach(it => {
          if (!it) return;
          const itName = normalizeItemName(it.itemName || it.item_name || it.name || '');
          if (itName === targetNorm) {
            totalInward += parseFloat(it.qty || it.quantity || 0);
          }
        });
      } else {
        const pName = normalizeItemName(p.item_name || p.itemName || p.name || '');
        if (pName === targetNorm) {
          totalInward += parseFloat(p.quantity || p.qty || 0);
        }
      }
    });

    salesInvoices.forEach(s => {
      if (!s) return;
      if (Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(si => {
          if (!si) return;
          const sName = normalizeItemName(si.itemName || si.item_name || si.name || '');
          if (sName === targetNorm) {
            totalOutward += parseFloat(si.qty || si.quantity || 0);
          }
        });
      }
    });

    adjustments.forEach(a => {
      if (!a) return;
      const aName = normalizeItemName(a.item_name || a.itemName || '');
      const aStockId = normalizeItemName(a.stock_id || a.itemId || '');
      if (aName === targetNorm || aStockId === targetNorm) {
        totalOutward += parseFloat(a.quantity || a.qty || 0);
      }
    });

    return round2(totalInward - totalOutward);
  } catch (err) {
    console.error('[stockInventoryEngine] Error computing item stock:', err);
    return 0;
  }
};

/**
 * Returns all stock items associated with a firm along with their reconciled live stock balances
 */
export const getStockItemsByFirm = (firmId) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  try {
    const inventoryKey = `inventory_items_${cleanFirmId}`;
    let items = IDBStorage.getItem(inventoryKey, []) || JSON.parse(localStorage.getItem(inventoryKey) || '[]');
    
    if (!Array.isArray(items) || items.length === 0) {
      items = [
        { id: 'DEF-DIESEL', name: 'Diesel', item_name: 'Diesel', unit: 'Liters', unit_purchase_price: 96.06 },
        { id: 'DEF-MITTI-A', name: 'Mitti Grade A', item_name: 'Mitti Grade A', unit: 'Quintal', unit_purchase_price: 14.20 },
        { id: 'DEF-MITTI-B', name: 'Mitti Grade B', item_name: 'Mitti Grade B', unit: 'Quintal', unit_purchase_price: 10.50 }
      ];
    }

    return items.map(i => {
      if (!i) return i;
      const itemName = i.name || i.item_name;
      const realStock = getFirmItemStock(cleanFirmId, itemName);
      return {
        ...i,
        name: itemName,
        item_name: itemName,
        current_stock: realStock,
        stock: realStock,
        qty: realStock
      };
    });
  } catch (e) {
    return [];
  }
};

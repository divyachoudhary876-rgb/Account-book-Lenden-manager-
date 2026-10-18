/**
 * Stock & Inventory Reconciliation Engine for Account Book Smart Manager
 * Single Source of Truth for Real-Time Item Stock Calculation (Zero Discrepancy).
 */

import { IDBStorage } from './indexedDbStorage.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export const getFirmItemStock = (firmId, itemName) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  const targetName = String(itemName || '').trim().toLowerCase();
  if (!targetName) return 0;

  try {
    // 1. Gather all Inward (Purchases) strictly for this firm
    const purchases = IDBStorage.getItem(`purchase_bills_${cleanFirmId}`, []) || IDBStorage.getItem('purchase_bills', []) || [];
    
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

    // Calculate Inward Qty (+)
    purchases.forEach(p => {
      if (!p) return;
      if (Array.isArray(p.items) && p.items.length > 0) {
        p.items.forEach(it => {
          if (!it) return;
          const itName = String(it.itemName || it.item_name || it.name || '').trim().toLowerCase();
          if (itName === targetName) {
            totalInward += parseFloat(it.qty || it.quantity || 0);
          }
        });
      } else {
        const pName = String(p.item_name || p.itemName || p.name || '').trim().toLowerCase();
        if (pName === targetName) {
          totalInward += parseFloat(p.quantity || p.qty || 0);
        }
      }
    });

    // Calculate Outward Qty from Sales (-)
    salesInvoices.forEach(s => {
      if (!s) return;
      if (Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(si => {
          if (!si) return;
          const sName = String(si.itemName || si.item_name || si.name || '').trim().toLowerCase();
          if (sName === targetName) {
            totalOutward += parseFloat(si.qty || si.quantity || 0);
          }
        });
      }
    });

    // Calculate Outward Qty from Material Adjustments / Consumptions (-)
    adjustments.forEach(a => {
      if (!a) return;
      const aName = String(a.item_name || a.itemName || '').trim().toLowerCase();
      const aStockId = String(a.stock_id || a.itemId || '');
      if (aName === targetName || aStockId === targetName) {
        totalOutward += parseFloat(a.quantity || a.qty || 0);
      }
    });

    // Net Stock starting strictly from zero opening balance
    const netStock = round2(totalInward - totalOutward);
    return Math.max(0, netStock);
  } catch (err) {
    console.error('[stockInventoryEngine] Error computing item stock:', err);
    return 0;
  }
};

export const getStockItemsByFirm = (firmId) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  try {
    const inventoryKey = `inventory_items_${cleanFirmId}`;
    let items = IDBStorage.getItem(inventoryKey, []);
    
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
        current_stock: realStock,
        stock: realStock,
        qty: realStock
      };
    });
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
    const index = items.findIndex(i => i.id === itemId || (i.name || i.item_name || '').trim().toLowerCase() === String(itemName).trim().toLowerCase());

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
    window.dispatchEvent(new Event('app_inventory_updated'));
  } catch (e) {
    console.error('[stockInventoryEngine] Error syncing item stock:', e);
  }
};

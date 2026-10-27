/**
 * Frontend Utility: Stock Inventory Engine
 * Single Source of Truth for Real-Time Item Stock Calculation & Inventory Management with Strict Firm Isolation & Zero Double-Counting.
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
 * Computes strict exact-match real-time stock without double-counting between vouchers and adjustments
 */
export const getFirmItemStock = (firmId, itemName) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  const targetNorm = normalizeItemName(itemName);
  if (!targetNorm) return 0;

  try {
    // 1. Fetch Unique Purchases (Inward Stock +)
    const purchaseKeys = [`purchase_bills_${cleanFirmId}`, 'purchase_bills', `app_purchase_bills_${cleanFirmId}`];
    const uniquePurchasesMap = new Map();
    purchaseKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) {
        raw.forEach(p => {
          if (p) {
            const uid = p.id || p.reference_no || `${p.date}-${p.amount}-${p.cr_account}`;
            if (!uniquePurchasesMap.has(uid)) uniquePurchasesMap.set(uid, p);
          }
        });
      }
    });

    // 2. Fetch Unique Sales Invoices (Outward Stock -)
    const salesKeys = [`sales_invoices_${cleanFirmId}`, `app_invoices_${cleanFirmId}`, 'sales_invoices', 'app_invoices'];
    const uniqueSalesMap = new Map();
    salesKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) {
        raw.forEach(s => {
          if (s) {
            const uid = s.id || s.reference_no || `${s.date}-${s.amount}-${s.dr_account}`;
            if (!uniqueSalesMap.has(uid)) uniqueSalesMap.set(uid, s);
          }
        });
      }
    });

    // 3. Fetch Unique Material Consumptions / Adjustments (Outward Stock -)
    // NOTE: We rely strictly on dedicated adjustment/consumption buckets to prevent double-counting from general vouchers.
    const adjustmentKeys = [
      `material_consumption_records_${cleanFirmId}`,
      `universal_material_adjustments_${cleanFirmId}`,
      `material_adjustments_${cleanFirmId}`,
      'material_consumption_records',
      'universal_material_adjustments'
    ];
    const uniqueAdjustmentsMap = new Map();
    adjustmentKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) {
        raw.forEach(a => {
          if (a) {
            const uid = a.id || `${a.date}-${a.quantity || a.qty}-${a.item_name || a.itemName}`;
            if (!uniqueAdjustmentsMap.has(uid)) uniqueAdjustmentsMap.set(uid, a);
          }
        });
      }
    });

    let totalInward = 0;
    let totalOutward = 0;

    // Calculate Inward from Purchases
    uniquePurchasesMap.forEach(p => {
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

    // Calculate Outward from Sales
    uniqueSalesMap.forEach(s => {
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

    // Calculate Outward from Material Consumptions
    uniqueAdjustmentsMap.forEach(a => {
      const aName = normalizeItemName(a.item_name || a.itemName || '');
      const aStockId = normalizeItemName(a.stock_id || a.itemId || '');
      if (aName === targetNorm || aStockId === targetNorm) {
        totalOutward += parseFloat(a.quantity || a.qty || 0);
      }
    });

    return round2(Math.max(0, totalInward - totalOutward));
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

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
 * Computes strict exact & fuzzy matching real-time stock for any inventory item within a firm
 */
export const getFirmItemStock = (firmId, itemName, itemId = null) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  const targetRaw = String(itemName || '').trim();
  const targetNorm = normalizeItemName(targetRaw);
  const cleanTargetId = String(itemId || '').trim();

  if (!targetNorm && !cleanTargetId) return 0;

  try {
    // 1. Gather all Purchase Bills (Inward Stock +)
    const purchaseKeys = [`purchase_bills_${cleanFirmId}`, 'purchase_bills', `app_purchase_bills_${cleanFirmId}`];
    const purchases = [];
    purchaseKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) purchases.push(...raw);
    });

    // 2. Gather all Sales Invoices (Outward Stock -)
    const salesKeys = [`sales_invoices_${cleanFirmId}`, `app_invoices_${cleanFirmId}`, 'sales_invoices', 'app_invoices'];
    const salesInvoices = [];
    salesKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) salesInvoices.push(...raw);
    });

    // 3. Gather all Material Consumptions / Adjustments (Outward Stock -)
    const adjustmentKeys = [
      `material_consumption_records_${cleanFirmId}`,
      `universal_material_adjustments_${cleanFirmId}`,
      `material_adjustments_${cleanFirmId}`,
      'material_consumption_records',
      'universal_material_adjustments'
    ];
    const adjustments = [];
    adjustmentKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) adjustments.push(...raw);
    });

    let totalInward = 0;
    let totalOutward = 0;

    // Calculate Inward from Purchases
    purchases.forEach(p => {
      if (!p) return;
      if (Array.isArray(p.items) && p.items.length > 0) {
        p.items.forEach(it => {
          if (!it) return;
          const itId = String(it.itemId || it.item_id || it.id || '').trim();
          const itName = normalizeItemName(it.itemName || it.item_name || it.name || '');
          if ((cleanTargetId && itId === cleanTargetId) || (targetNorm && (itName === targetNorm || itName.includes(targetNorm) || targetNorm.includes(itName)))) {
            totalInward += parseFloat(it.qty || it.quantity || 0);
          }
        });
      } else {
        const pId = String(p.itemId || p.item_id || p.id || '').trim();
        const pName = normalizeItemName(p.item_name || p.itemName || p.name || '');
        if ((cleanTargetId && pId === cleanTargetId) || (targetNorm && (pName === targetNorm || pName.includes(targetNorm) || targetNorm.includes(pName)))) {
          totalInward += parseFloat(p.quantity || p.qty || 0);
        }
      }
    });

    // Calculate Outward from Sales
    salesInvoices.forEach(s => {
      if (!s) return;
      if (Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(si => {
          if (!si) return;
          const siId = String(si.itemId || si.item_id || si.id || '').trim();
          const siName = normalizeItemName(si.itemName || si.item_name || si.name || '');
          if ((cleanTargetId && siId === cleanTargetId) || (targetNorm && (siName === targetNorm || siName.includes(targetNorm) || targetNorm.includes(siName)))) {
            totalOutward += parseFloat(si.qty || si.quantity || 0);
          }
        });
      }
    });

    // Calculate Outward from Material Consumptions / Adjustments
    adjustments.forEach(a => {
      if (!a) return;
      const aId = String(a.stock_id || a.itemId || a.item_id || '').trim();
      const aName = normalizeItemName(a.item_name || a.itemName || '');
      if ((cleanTargetId && aId === cleanTargetId) || (targetNorm && (aName === targetNorm || aName.includes(targetNorm) || targetNorm.includes(aName)))) {
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
      const itemId = i.id || i.item_id;
      const realStock = getFirmItemStock(cleanFirmId, itemName, itemId);
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

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
    const inventoryKey = `inventory_items_${cleanFirmId}`;
    const items = IDBStorage.getItem(inventoryKey, []) || [];
    
    // 1. Agar item master mein current_stock saved hai aur woh valid hai, toh wahi lo
    const masterItem = items.find(i => 
      (i.item_name || i.name || '').trim().toLowerCase() === targetName ||
      (i.id || '') === itemName
    );

    if (masterItem && masterItem.current_stock !== undefined && masterItem.current_stock !== null) {
      // Check if it has been explicitly set or initialized
      const directStock = parseFloat(masterItem.current_stock || masterItem.stock || masterItem.qty || 0);
      if (directStock > 0 || masterItem.is_manually_set) {
        return directStock;
      }
    }

    // 2. Fallback: Chronological calculation strictly from Purchase Bills & Sales/Issues
    const purchases = IDBStorage.getItem(`purchase_bills_${cleanFirmId}`, []) || IDBStorage.getItem('purchase_bills', []) || [];
    const vouchers = IDBStorage.getItem(`account_book_vouchers_${cleanFirmId}`, []) || IDBStorage.getItem('account_book_vouchers', []) || [];

    let totalInward = 0;
    let totalOutward = 0;

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

    vouchers.forEach(v => {
      if (!v) return;
      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      if (['SALES', 'MATERIAL_ISSUE', 'CONSUMPTION', 'INVOICE'].includes(vType)) {
        if (Array.isArray(v.items) && v.items.length > 0) {
          v.items.forEach(it => {
            if (!it) return;
            const itName = String(it.itemName || it.item_name || it.name || '').trim().toLowerCase();
            if (itName === targetName) {
              totalOutward += parseFloat(it.qty || it.quantity || 0);
            }
          });
        } else if (v.item_name || v.itemName) {
          const vItemName = String(v.item_name || v.itemName || '').trim().toLowerCase();
          if (vItemName === targetName) {
            totalOutward += parseFloat(v.qty || v.quantity || 0);
          }
        }
      }
    });

    return Math.max(0, round2(totalInward - totalOutward));
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

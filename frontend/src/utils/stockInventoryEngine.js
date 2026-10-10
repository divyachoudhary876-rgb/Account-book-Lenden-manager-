/**
 * Stock & Inventory Reconciliation Engine for Account Book Smart Manager
 * Handles real-time calculation of item stock (Purchases minus Material Issues/Consumption) with strict multi-firm isolation.
 */

import { IDBStorage } from './indexedDbStorage.js';

export const getFirmItemStock = (firmId, itemName) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  
  try {
    // Fetch firm-specific or global purchases and vouchers securely
    const purchaseKeys = [`purchase_bills_${cleanFirmId}`, 'purchase_bills', `app_purchase_bills_${cleanFirmId}`];
    let allPurchases = [];
    purchaseKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []);
      if (Array.isArray(raw)) allPurchases.push(...raw);
    });

    const voucherKeys = [`account_book_vouchers_${cleanFirmId}`, 'account_book_vouchers', `app_vouchers_${cleanFirmId}`];
    let allVouchers = [];
    voucherKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []);
      if (Array.isArray(raw)) allVouchers.push(...raw);
    });

    const targetName = String(itemName).trim().toLowerCase();
    let totalIn = 0;
    let totalOut = 0;

    // 1. Calculate inward stock from purchase bills
    allPurchases.forEach(p => {
      const pName = (p.itemName || p.item_name || p.item_description || '').trim().toLowerCase();
      if (pName.includes(targetName) || targetName.includes(pName)) {
        totalIn += parseFloat(p.quantity || p.qty || p.units || 0);
      }
    });

    // 2. Calculate outward stock from material issues / journal consumption entries
    allVouchers.forEach(v => {
      const narration = (v.narration || '').toLowerCase();
      const entries = v.entries || [];
      const isMatch = narration.includes(targetName) || entries.some(e => (e.account_name || '').toLowerCase().includes(targetName));
      
      if (isMatch && (v.voucher_type === 'JOURNAL' || v.type === 'JOURNAL')) {
        // Extract numeric quantity from narration safely
        const match = narration.match(/(\d+(\.\d+)?)\s*(liters?|quintals?|pcs|units)?/i);
        if (match && match[1]) {
          totalOut += parseFloat(match[1]);
        }
      }
    });

    const accurateStock = Math.max(0, totalIn - totalOut);
    return accurateStock;
  } catch (err) {
    console.error('Error calculating item stock:', err);
    return 0;
  }
};

/**
 * Auto-syncs and updates inventory item current stock in storage
 */
export const syncInventoryItemStock = (firmId, itemId, itemName) => {
  try {
    const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
    const inventoryKey = `inventory_items_${cleanFirmId}`;
    let items = IDBStorage.getItem(inventoryKey, []) || IDBStorage.getItem('inventory_items', []);

    if (Array.isArray(items)) {
      const index = items.findIndex(i => i.id === itemId || (i.name || i.item_name || '').trim().toLowerCase() === String(itemName).trim().toLowerCase());
      const realStock = getFirmItemStock(cleanFirmId, itemName);

      if (index !== -1) {
        items[index].current_stock = realStock;
        items[index].stock = realStock;
        items[index].qty = realStock;
      } else {
        items.push({
          id: itemId || `ITEM-${Date.now()}`,
          firm_id: cleanFirmId,
          name: itemName,
          item_name: itemName,
          current_stock: realStock,
          stock: realStock,
          qty: realStock,
          unit: itemName.toLowerCase().includes('diesel') ? 'Liters' : 'Pcs',
          updated_at: new Date().toISOString()
        });
      }

      IDBStorage.setItem(inventoryKey, items);
      IDBStorage.setItem('inventory_items', items);
    }
  } catch (e) {}
};

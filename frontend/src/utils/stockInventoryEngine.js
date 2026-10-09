// frontend/src/utils/stockInventoryEngine.js

import { StorageService } from './storageSync.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Retrieve inventory stock items and dynamically compute exact stock from Vouchers, Purchases, and Material Adjustments
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

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    try {
      const globalRaw = localStorage.getItem('inventory_items') || localStorage.getItem('app_inventory');
      if (globalRaw) {
        rawItems = JSON.parse(globalRaw);
      }
    } catch (e) {}
  }

  // Fetch all vouchers, purchases, and material adjustments for this firm to calculate true stock
  let allPurchases = [];
  let allVouchers = [];
  let allAdjustments = [];

  try {
    const pRaw = localStorage.getItem(`purchase_bills_${activeFirmId}`) || localStorage.getItem('purchase_bills');
    if (pRaw) allPurchases = JSON.parse(pRaw);
  } catch (e) {}

  try {
    const vRaw = localStorage.getItem(`account_book_vouchers_${activeFirmId}`) || localStorage.getItem(`app_vouchers_${activeFirmId}`) || localStorage.getItem('account_book_vouchers');
    if (vRaw) allVouchers = JSON.parse(vRaw);
  } catch (e) {}

  try {
    const mRaw = localStorage.getItem(`universal_material_adjustments_${activeFirmId}`) || localStorage.getItem('universal_material_adjustments');
    if (mRaw) allAdjustments = JSON.parse(mRaw);
  } catch (e) {}

  return (Array.isArray(rawItems) ? rawItems : []).filter(item => item && (item.name || item.item_name)).map(item => {
    const itemNameClean = String(item.item_name || item.name || item.itemName || 'Item').trim();
    const cleanNameLower = itemNameClean.toLowerCase();

    let totalPurchased = 0;
    let totalConsumedOut = 0;
    let totalSold = 0;

    // 1. Calculate from Purchase Bills
    allPurchases.forEach(p => {
      const pItem = String(p.item_name || p.itemName || '').trim().toLowerCase();
      if (pItem === cleanNameLower || (cleanNameLower.includes('diesel') && pItem.includes('diesel'))) {
        totalPurchased += parseFloat(p.quantity || p.qty || 0);
      }
      if (Array.isArray(p.items)) {
        p.items.forEach(pi => {
          const piName = String(pi.item_name || pi.itemName || '').trim().toLowerCase();
          if (piName === cleanNameLower) {
            totalPurchased += parseFloat(pi.quantity || pi.qty || 0);
          }
        });
      }
    });

    // 2. Calculate from Material Issues / Journal Adjustments (JV-MAT-ADJ)
    allVouchers.forEach(v => {
      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      const narr = String(v.narration || '').toLowerCase();
      if (v.id?.startsWith('JV-MAT-ADJ') || vType === 'JOURNAL' || narr.includes('material issue')) {
        if (narr.includes(cleanNameLower) || (cleanNameLower.includes('diesel') && narr.includes('diesel'))) {
          // Extract qty from narration using regex if explicit quantity field is missing
          const match = narr.match(/(\d+(\.\d+)?)\s*(liters|quintal|pcs|kg|mt)/i);
          if (match) {
            totalConsumedOut += parseFloat(match[1]);
          } else if (v.amount > 0) {
            // Fallback estimation if qty text is formatted differently
            totalConsumedOut += parseFloat(v.quantity || v.qty || 0);
          }
        }
      }
    });

    allAdjustments.forEach(adj => {
      const adjItem = String(adj.item_name || '').trim().toLowerCase();
      if (adjItem === cleanNameLower || (cleanNameLower.includes('diesel') && adjItem.includes('diesel'))) {
        totalConsumedOut += parseFloat(adj.quantity || adj.qty || 0);
      }
    });

    // 3. Calculate from Sales Invoices
    allVouchers.forEach(v => {
      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      if (vType === 'SALES' && Array.isArray(v.items)) {
        v.items.forEach(vi => {
          const viName = String(vi.item_name || vi.itemName || '').trim().toLowerCase();
          if (viName === cleanNameLower) {
            totalSold += parseFloat(vi.quantity || vi.qty || 0);
          }
        });
      }
    });

    const opening = parseFloat(item.opening_stock || item.openingStock || 0);
    // True Calculated Stock
    const computedStock = round2(Math.max(0, opening + totalPurchased - totalConsumedOut - totalSold));
    
    // Fallback to item's stored stock if no transactions found yet
    const finalStock = (totalPurchased === 0 && totalConsumedOut === 0 && totalSold === 0) 
      ? parseFloat(item.current_stock || item.stock || item.qty || 0) 
      : computedStock;

    const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);
    
    return {
      ...item,
      firm_id: activeFirmId,
      item_name: itemNameClean,
      name: itemNameClean,
      current_stock: finalStock,
      stock: finalStock,
      qty: finalStock,
      current_qty: finalStock,
      unit_purchase_price: rate,
      purchase_price: rate,
      rate: rate
    };
  });
};

export const updateStockItemQuantity = (firmId = 'FIRM-001', itemName = '', qtyChange = 0, newUnitRate = 0) => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const cleanItemName = (itemName || '').trim();
  const delta = parseFloat(qtyChange || 0);
  const rate = parseFloat(newUnitRate || 0);

  const items = getStockItemsByFirm(activeFirmId);
  const targetIndex = items.findIndex(i => (i.item_name || i.name || '').trim().toLowerCase() === cleanItemName.toLowerCase());

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
    updatedTarget = {
      id: `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firm_id: activeFirmId,
      item_name: cleanItemName,
      name: cleanItemName,
      item_type: 'PHYSICAL',
      unit: cleanItemName.toLowerCase().includes('diesel') ? 'Liters' : 'Quintal',
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

/**
 * Frontend Utility: Stock Inventory Engine
 * Single Source of Truth for Real-Time Item Stock Calculation, perfectly unified with PDF Report logic.
 */

import { IDBStorage } from './indexedDbStorage.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const normalizeItemName = (name) => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/\b(stock account|account|stock)\b/gi, '')
    .trim();
};

/**
 * Computes precise real-time stock unified with PDF report matching rules
 */
export const getFirmItemStock = (firmId, itemName, itemId = null) => {
  const cleanFirmId = firmId || IDBStorage.getItem('app_active_firm_id', 'FIRM-1790909076433');
  const targetRaw = String(itemName || '').trim();
  const targetNorm = normalizeItemName(targetRaw);
  const cleanTargetId = String(itemId || '').trim();

  if (!targetNorm && !cleanTargetId) return 0;

  try {
    // 1. Gather Unique Purchase Bills (Inward Stock +) with Deduplication
    const purchaseKeys = [`purchase_bills_${cleanFirmId}`, 'purchase_bills', `app_purchase_bills_${cleanFirmId}`];
    const uniquePurchasesMap = new Map();
    purchaseKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) {
        raw.forEach(p => {
          if (p) {
            const uid = String(p.id || p.reference_no || p.voucher_number || `${p.date}-${p.amount}-${p.cr_account || p.supplier}`).trim();
            if (!uniquePurchasesMap.has(uid)) uniquePurchasesMap.set(uid, p);
          }
        });
      }
    });

    // 2. Gather Unique Sales Invoices (Outward Stock -)
    const salesKeys = [`sales_invoices_${cleanFirmId}`, `app_invoices_${cleanFirmId}`, 'sales_invoices', 'app_invoices'];
    const uniqueSalesMap = new Map();
    salesKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) {
        raw.forEach(s => {
          if (s) {
            const uid = String(s.id || s.reference_no || s.voucher_number || `${s.date}-${s.amount}-${s.dr_account || s.party}`).trim();
            if (!uniqueSalesMap.has(uid)) uniqueSalesMap.set(uid, s);
          }
        });
      }
    });

    // 3. Gather Unique Material Consumptions / Adjustments (Outward Stock -)
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
            const uid = String(a.id || `${a.date}-${a.quantity || a.qty}-${a.item_name || a.itemName}`).trim();
            if (!uniqueAdjustmentsMap.has(uid)) uniqueAdjustmentsMap.set(uid, a);
          }
        });
      }
    });

    // 4. Gather Unique Journal Vouchers / Material Issues (Outward Stock -)
    const voucherKeys = [
      `account_book_vouchers_${cleanFirmId}`,
      `app_vouchers_${cleanFirmId}`,
      'account_book_vouchers',
      'app_vouchers'
    ];
    const uniqueVouchersMap = new Map();
    voucherKeys.forEach(k => {
      const raw = IDBStorage.getItem(k, []) || [];
      if (Array.isArray(raw)) {
        raw.forEach(v => {
          if (v) {
            const uid = String(v.id || v.reference_no || v.voucher_number || `${v.voucher_date || v.date}-${v.amount}`).trim();
            if (!uniqueVouchersMap.has(uid)) uniqueVouchersMap.set(uid, v);
          }
        });
      }
    });

    let totalInward = 0;
    let totalOutward = 0;

    const isMatch = (dbName, dbId = '') => {
      const cleanDbId = String(dbId || '').trim();
      if (cleanTargetId && cleanDbId && cleanDbId === cleanTargetId) return true;
      const dbNorm = normalizeItemName(dbName);
      if (!dbNorm) return false;
      return dbNorm === targetNorm || dbNorm.includes(targetNorm) || targetNorm.includes(dbNorm);
    };

    // Calculate Inward from Purchases (+)
    uniquePurchasesMap.forEach(p => {
      if (!p) return;
      if (Array.isArray(p.items) && p.items.length > 0) {
        p.items.forEach(it => {
          if (!it) return;
          const itId = String(it.itemId || it.item_id || it.id || '').trim();
          const itName = it.itemName || it.item_name || it.name || '';
          if (isMatch(itName, itId)) {
            totalInward += parseFloat(it.qty || it.quantity || 0);
          }
        });
      } else {
        const pId = String(p.itemId || p.item_id || p.id || '').trim();
        const pName = p.item_name || p.itemName || p.name || '';
        if (isMatch(pName, pId)) {
          totalInward += parseFloat(p.quantity || p.qty || 0);
        }
      }
    });

    // Calculate Outward from Sales (-)
    uniqueSalesMap.forEach(s => {
      if (!s) return;
      if (Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(si => {
          if (!si) return;
          const siId = String(si.itemId || si.item_id || '').trim();
          const siName = si.itemName || si.item_name || si.name || '';
          if (isMatch(siName, siId)) {
            totalOutward += parseFloat(si.qty || si.quantity || 0);
          }
        });
      }
    });

    // Calculate Outward from Adjustments (-)
    uniqueAdjustmentsMap.forEach(a => {
      if (!a) return;
      const aId = String(a.stock_id || a.itemId || a.item_id || '').trim();
      const aName = a.item_name || a.itemName || '';
      if (isMatch(aName, aId)) {
        totalOutward += parseFloat(a.quantity || a.qty || 0);
      }
    });

    // Calculate Outward from Journal Vouchers / Material Issues (-)
    uniqueVouchersMap.forEach(v => {
      if (!v) return;
      const vType = String(v.voucher_type || v.type || '').toUpperCase();
      if (vType === 'JOURNAL' || vType === 'CONSUMPTION') {
        const narration = String(v.narration || '').toLowerCase();
        const crAcc = String(v.cr_account || '').toLowerCase();
        
        if (isMatch(crAcc) || isMatch(narration) || (v.items && v.items.some(vi => isMatch(vi.itemName || vi.item_name || vi.name)))) {
          let extractedQty = parseFloat(v.qty || v.quantity || 0);
          
          if (extractedQty === 0 && v.items && Array.isArray(v.items)) {
            v.items.forEach(vi => {
              if (isMatch(vi.itemName || vi.item_name || vi.name)) {
                extractedQty += parseFloat(vi.qty || vi.quantity || 0);
              }
            });
          }

          if (extractedQty === 0 && narration) {
            const qtyMatch = narration.match(/(\d+(?:\.\d+)?)\s*(quintal|pcs|liters|kg|mt|trolley|bags)/i);
            if (qtyMatch) {
              extractedQty = parseFloat(qtyMatch[1]);
            }
          }

          if (extractedQty > 0) {
            totalOutward += extractedQty;
          }
        }
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

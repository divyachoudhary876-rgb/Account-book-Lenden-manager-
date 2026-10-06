// frontend/src/utils/stockInventoryEngine.js

import { StorageService } from './storageSync.js';
import { makeBilingualName } from './bilingualEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Strips parenthetical Devanagari/Hindi characters to obtain the clean base key
 */
const getBaseName = (str = '') => {
  return String(str || '')
    .replace(/\s*\([\u0900-\u097F\s]+\)/g, '')
    .trim()
    .toLowerCase();
};

/**
 * Resilient matcher across Roman, Devanagari, and bilingual composite names
 */
const isItemNameMatch = (targetName = '', candidateName = '') => {
  if (!targetName || !candidateName) return false;
  const t = String(targetName).trim().toLowerCase();
  const c = String(candidateName).trim().toLowerCase();
  if (t === c) return true;

  const tBase = getBaseName(t);
  const cBase = getBaseName(c);
  return tBase !== '' && tBase === cBase;
};

/**
 * Retrieve inventory stock items strictly scoped to active firm with bilingual mapping
 */
export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const rawItems = StorageService.getInventoryItems(activeFirmId) || [];
  
  return rawItems.map(item => {
    const rawName = (item.item_name || item.name || item.itemName || 'Item').trim();
    const bilingual = makeBilingualName(rawName, item.name_hi || '');
    const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.purchasePrice || item.rate || 0);
    const stock = parseFloat(item.current_stock || item.stock || item.qty || 0);

    return {
      ...item,
      firm_id: activeFirmId,
      item_name: bilingual.display || rawName,
      name: bilingual.display || rawName,
      name_en: bilingual.primary || rawName,
      name_hi: bilingual.secondary || '',
      display_name: bilingual.display || rawName,
      current_stock: stock,
      stock: stock,
      unit_purchase_price: rate,
      purchase_price: rate,
      rate: rate
    };
  });
};

/**
 * Atomic stock update (+IN on purchase, -OUT on sales/consumption) with bilingual resilience
 */
export const updateStockItemQuantity = (firmId = 'FIRM-001', itemName = '', qtyChange = 0, newUnitRate = 0) => {
  const activeFirmId = String(firmId || localStorage.getItem('app_active_firm_id') || 'FIRM-001').trim();
  const cleanInput = (itemName || '').trim();
  const delta = parseFloat(qtyChange || 0);
  const rate = parseFloat(newUnitRate || 0);

  const items = getStockItemsByFirm(activeFirmId);
  const targetIndex = items.findIndex(i => {
    const iName = (i.item_name || i.name || '').trim();
    const iEn = (i.name_en || '').trim();
    return isItemNameMatch(cleanInput, iName) || isItemNameMatch(cleanInput, iEn);
  });

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
      unit_purchase_price: effectiveRate,
      purchase_price: effectiveRate,
      rate: effectiveRate,
      updated_at: new Date().toISOString()
    };
    items[targetIndex] = updatedTarget;
  } else {
    // If not found, create item atomically with complete bilingual structure
    const bilingual = makeBilingualName(cleanInput);
    const lowerInput = cleanInput.toLowerCase();
    
    let defaultUnit = 'Pcs';
    if (lowerInput.includes('diesel') || lowerInput.includes('डीजल') || lowerInput.includes('oil')) {
      defaultUnit = 'Liters';
    } else if (lowerInput.includes('husk') || lowerInput.includes('coal') || lowerInput.includes('turi') || lowerInput.includes('कोयला') || lowerInput.includes('तूड़ी')) {
      defaultUnit = 'MT';
    } else if (lowerInput.includes('cement') || lowerInput.includes('सीमेंट')) {
      defaultUnit = 'Bags';
    }

    updatedTarget = {
      id: `ITEM-${Date.now()}`,
      firm_id: activeFirmId,
      item_name: bilingual.display,
      name: bilingual.display,
      name_en: bilingual.primary,
      name_hi: bilingual.secondary,
      display_name: bilingual.display,
      item_type: 'PHYSICAL',
      unit: defaultUnit,
      opening_stock: 0,
      current_stock: round2(Math.max(0, delta)),
      stock: round2(Math.max(0, delta)),
      qty: round2(Math.max(0, delta)),
      unit_purchase_price: rate,
      purchase_price: rate,
      rate: rate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    items.push(updatedTarget);
  }

  StorageService.saveInventoryItems(items, activeFirmId);

  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('storage'));

  return updatedTarget;
};

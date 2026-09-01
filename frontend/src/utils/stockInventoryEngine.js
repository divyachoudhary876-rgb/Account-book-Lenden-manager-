// frontend/src/utils/stockInventoryEngine.js

export const DEFAULT_STOCK_STARTER = [
  { id: 'STK-01', item_name: 'Diesel', unit: 'Liters', current_stock: 500, unit_purchase_price: 90, selling_price: 95 },
  { id: 'STK-02', item_name: 'Red Bricks 9 Inch', unit: 'Pcs', current_stock: 10000, unit_purchase_price: 5.5, selling_price: 7.5 },
  { id: 'STK-03', item_name: 'Biomass Briquettes', unit: 'Tons', current_stock: 25, unit_purchase_price: 4200, selling_price: 5500 }
];

/**
 * Get all stock items for a given firm
 */
export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_stock_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Initialize default starter if key is absent
    localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(DEFAULT_STOCK_STARTER));
    return DEFAULT_STOCK_STARTER;
  } catch (err) {
    console.error("Failed to read stock items:", err);
    return [];
  }
};

/**
 * Add or Update Stock Item Master
 */
export const saveStockItemMaster = (firmId = 'FIRM-001', payload) => {
  const stockList = getStockItemsByFirm(firmId);
  const cleanName = (payload.item_name || '').trim();

  if (!cleanName) throw new Error("⚠️ Item Name is required.");

  const itemPayload = {
    id: payload.id || `STK-${Date.now()}`,
    item_name: cleanName,
    unit: payload.unit || 'Units',
    current_stock: parseFloat(payload.current_stock || 0),
    unit_purchase_price: parseFloat(payload.unit_purchase_price || 0),
    selling_price: parseFloat(payload.selling_price || 0),
    updated_at: new Date().toISOString()
  };

  let updatedList;
  const existingIdx = stockList.findIndex(s => s.id === itemPayload.id || s.item_name.toLowerCase() === cleanName.toLowerCase());

  if (existingIdx >= 0) {
    updatedList = [...stockList];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...itemPayload };
  } else {
    updatedList = [itemPayload, ...stockList];
  }

  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('stock_updated'));
  return itemPayload;
};

/**
 * Delete Stock Item
 */
export const deleteStockItemMaster = (firmId = 'FIRM-001', itemId) => {
  const stockList = getStockItemsByFirm(firmId);
  const updatedList = stockList.filter(item => item.id !== itemId);
  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('stock_updated'));
  return true;
};

/**
 * Inward/Outward Quantity Update (Used by Purchase & Sale engines)
 */
export const updateStockItemQuantity = (firmId = 'FIRM-001', itemName, qtyDelta, unitRate = 0) => {
  const stock = getStockItemsByFirm(firmId);
  let item = stock.find(s => s.item_name.toLowerCase() === itemName.trim().toLowerCase());

  if (!item) {
    item = {
      id: `STK-${Date.now()}`,
      item_name: itemName.trim(),
      unit: itemName.toLowerCase().includes('diesel') ? 'Liters' : 'Units',
      current_stock: Math.max(0, qtyDelta),
      unit_purchase_price: unitRate,
      selling_price: unitRate * 1.2,
      updated_at: new Date().toISOString()
    };
    stock.push(item);
  } else {
    const curStock = parseFloat(item.current_stock || 0);
    const newStock = curStock + qtyDelta;

    if (qtyDelta > 0 && unitRate > 0) {
      const curVal = curStock * parseFloat(item.unit_purchase_price || 0);
      const inwardVal = qtyDelta * unitRate;
      item.unit_purchase_price = newStock > 0 ? parseFloat(((curVal + inwardVal) / newStock).toFixed(2)) : unitRate;
    }
    item.current_stock = newStock;
    item.updated_at = new Date().toISOString();
  }

  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(stock));
  return item;
};

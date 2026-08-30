// frontend/src/utils/stockInventoryEngine.js

export const getStockItemsByFirm = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_inventory_${targetId}`;
  let items = [];

  try {
    const raw = localStorage.getItem(key);
    items = raw ? JSON.parse(raw) : [];
  } catch (e) {
    items = [];
  }

  return items;
};

export const saveStockItem = (firmId, itemData) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);

  const newItem = {
    id: itemData.id || `ITEM-${Date.now()}`,
    item_name: itemData.item_name,
    unit: itemData.unit || 'Pcs',
    opening_stock: parseFloat(itemData.opening_stock || itemData.current_stock || 0),
    current_stock: parseFloat(itemData.current_stock || 0),
    sale_rate: parseFloat(itemData.sale_rate || 0),
    purchase_rate: parseFloat(itemData.purchase_rate || 0),
    updated_at: new Date().toISOString()
  };

  const existingIndex = existingItems.findIndex(i => i.id === newItem.id);
  if (existingIndex !== -1) {
    existingItems[existingIndex] = newItem;
  } else {
    existingItems.push(newItem);
  }

  localStorage.setItem(key, JSON.stringify(existingItems));
  window.dispatchEvent(new Event('storage'));
  return existingItems;
};

// Named export required by salesInvoicingEngine.js
export const updateStockMovement = (firmId, itemId, qtyChange, movementType = 'OUT') => {
  const targetId = firmId || 'FIRM-001';
  const items = getStockItemsByFirm(targetId);
  const index = items.findIndex(i => i.id === itemId || i.item_name === itemId);

  if (index !== -1) {
    const qty = parseFloat(qtyChange || 0);
    if (movementType === 'OUT') {
      items[index].current_stock = parseFloat((items[index].current_stock - qty).toFixed(3));
    } else if (movementType === 'IN') {
      items[index].current_stock = parseFloat((items[index].current_stock + qty).toFixed(3));
    }
    const key = `app_inventory_${targetId}`;
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new Event('storage'));
  }
  return items;
};

// Named exports required by InventoryStockView.jsx
export const addNewStockItem = (firmId, itemData) => {
  if (!itemData.item_name || itemData.item_name.trim() === '') {
    throw new Error('⚠️ Stock Item Name is required.');
  }
  return saveStockItem(firmId, itemData);
};

export const deleteStockItem = (firmId, itemId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);
  const filtered = existingItems.filter(item => item.id !== itemId);
  
  localStorage.setItem(key, JSON.stringify(filtered));
  window.dispatchEvent(new Event('storage'));
  return filtered;
};

export const purgeAndClearInventoryData = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_inventory_${targetId}`;
  localStorage.setItem(key, JSON.stringify([]));
  window.dispatchEvent(new Event('storage'));
  return true;
};

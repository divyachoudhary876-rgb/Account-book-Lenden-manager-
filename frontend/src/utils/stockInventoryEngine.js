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

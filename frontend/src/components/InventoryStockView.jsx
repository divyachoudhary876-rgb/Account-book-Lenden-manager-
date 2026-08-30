// frontend/src/utils/stockInventoryEngine.js

export const getStockItemsByFirm = (firmId) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }

  const key = `app_inventory_${targetId}`;
  let items = [];

  try {
    items = JSON.parse(localStorage.getItem(key) || '[]');
  } catch (e) {
    items = [];
  }

  if (!items || items.length === 0) {
    items = [
      { id: `ITEM-1-${targetId}`, item_name: 'Red Brick (A-Class)', unit: 'Pcs', current_stock: 10000 },
      { id: `ITEM-2-${targetId}`, item_name: 'Raw Coal (Koyla)', unit: 'Tons', current_stock: 50 },
      { id: `ITEM-3-${targetId}`, item_name: 'Biomass Briquette', unit: 'MT', current_stock: 120 }
    ];
    localStorage.setItem(key, JSON.stringify(items));
  }

  return items;
};

export const addNewStockItem = (firmId, itemPayload) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }

  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);

  const exists = existingItems.some(i => i.item_name.trim().toLowerCase() === itemPayload.item_name.trim().toLowerCase());
  if (exists) {
    throw new Error(`Stock Item "${itemPayload.item_name}" already exists.`);
  }

  const newItem = {
    id: `ITEM-${Date.now()}`,
    item_name: itemPayload.item_name.trim(),
    unit: itemPayload.unit || 'Pcs',
    current_stock: parseFloat(itemPayload.opening_stock || 0),
    created_at: new Date().toISOString()
  };

  const updatedList = [newItem, ...existingItems];
  localStorage.setItem(key, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('storage'));
  return newItem;
};

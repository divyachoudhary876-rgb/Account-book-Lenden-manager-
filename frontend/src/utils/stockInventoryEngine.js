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

  // Pre-populate default inventory stock items if completely empty
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

export const updateStockMovement = (firmId, itemId, qty, movementType, refNo, rate = 0) => {
  let targetId = firmId;
  if (!targetId) {
    const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
    targetId = activeFirm.id || 'FIRM-001';
  }

  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);

  const quantity = parseFloat(qty || 0);
  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");

  const itemIndex = existingItems.findIndex(i => i.id === itemId);
  if (itemIndex === -1) throw new Error("Selected stock item not found.");

  const item = existingItems[itemIndex];

  // Prevent negative stock on sales dispatch
  if (movementType === 'SALES_OUT' && item.current_stock < quantity) {
    throw new Error(`Insufficient Stock! Available: ${item.current_stock} ${item.unit}, Attempted: ${quantity}`);
  }

  // Calculate new stock quantity
  const newStock = movementType === 'PURCHASE_IN' 
    ? item.current_stock + quantity 
    : item.current_stock - quantity;

  existingItems[itemIndex] = {
    ...item,
    current_stock: newStock,
    updated_at: new Date().toISOString()
  };

  localStorage.setItem(key, JSON.stringify(existingItems));
  window.dispatchEvent(new Event('storage'));
  return existingItems[itemIndex];
};

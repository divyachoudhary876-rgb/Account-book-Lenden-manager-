// frontend/src/utils/stockInventoryEngine.js

export const UNITS_OF_MEASUREMENT = [
  { code: 'Pcs', name: 'Pcs (Pieces)' },
  { code: 'Qtl', name: 'Quintal (100 kg)' },
  { code: 'MT', name: 'MT (Metric Ton - 1000 kg)' },
  { code: 'Tons', name: 'Tons' },
  { code: 'Kg', name: 'Kg (Kilograms)' },
  { code: 'Ltr', name: 'Ltr (Liters)' },
  { code: 'Bags', name: 'Bags / Sacks' },
  { code: 'Brass', name: 'Brass (100 Cft)' },
  { code: 'Cft', name: 'Cft (Cubic Feet)' },
  { code: 'SqFt', name: 'Sq. Ft. (Square Feet)' },
  { code: 'SqMtr', name: 'Sq. Meter' },
  { code: 'Box', name: 'Box / Carton' },
  { code: 'Bndl', name: 'Bundles / Bales' },
  { code: 'Thousand', name: 'Thousand Pcs (1000 Nos)' }
];

export const getStockItemsByFirm = (firmId) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_inventory_${targetId}`;
  let items = [];

  try {
    const rawData = localStorage.getItem(key);
    items = rawData ? JSON.parse(rawData) : [];
  } catch (e) {
    items = [];
  }

  return Array.isArray(items) ? items : [];
};

export const addNewStockItem = (firmId, itemPayload) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);

  const exists = existingItems.some(
    i => i && i.item_name && i.item_name.trim().toLowerCase() === itemPayload.item_name.trim().toLowerCase() && i.id !== itemPayload.id
  );

  if (exists) {
    throw new Error(`Stock Item "${itemPayload.item_name}" already exists.`);
  }

  // Handle Edit vs New Creation
  if (itemPayload.id) {
    const updatedList = existingItems.map(item => {
      if (item.id === itemPayload.id) {
        return {
          ...item,
          item_name: itemPayload.item_name.trim(),
          unit: itemPayload.unit || 'Pcs',
          current_stock: parseFloat(itemPayload.opening_stock || 0),
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });
    localStorage.setItem(key, JSON.stringify(updatedList));
    window.dispatchEvent(new Event('storage'));
    return { id: itemPayload.id };
  } else {
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
  }
};

// Item Deletion Logic
export const deleteStockItem = (firmId, itemId) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);

  const filteredItems = existingItems.filter(i => i.id !== itemId);
  localStorage.setItem(key, JSON.stringify(filteredItems));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const purgeAndClearInventoryData = (firmId) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_inventory_${targetId}`;
  localStorage.setItem(key, JSON.stringify([]));
  window.dispatchEvent(new Event('storage'));
  return true;
};

export const updateStockMovement = (firmId, itemId, qty, movementType, refNo, rate = 0) => {
  let targetId = firmId;
  if (!targetId) {
    try {
      const activeFirm = JSON.parse(localStorage.getItem('active_firm_profile') || '{}');
      targetId = activeFirm.id || 'FIRM-001';
    } catch (e) {
      targetId = 'FIRM-001';
    }
  }

  const key = `app_inventory_${targetId}`;
  const existingItems = getStockItemsByFirm(targetId);

  const quantity = parseFloat(qty || 0);
  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");

  const itemIndex = existingItems.findIndex(i => i && i.id === itemId);
  if (itemIndex === -1) throw new Error("Selected stock item not found.");

  const item = existingItems[itemIndex];

  if (movementType === 'SALES_OUT' && item.current_stock < quantity) {
    throw new Error(`Insufficient Stock! Available: ${item.current_stock} ${item.unit}, Attempted: ${quantity}`);
  }

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

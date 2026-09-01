// frontend/src/utils/stockInventoryEngine.js

export const DEFAULT_STOCK = [
  { id: 'STK-01', item_name: 'Diesel', unit: 'Liters', current_stock: 500, unit_purchase_price: 90, selling_price: 95 },
  { id: 'STK-02', item_name: 'Red Bricks 9 Inch', unit: 'Pcs', current_stock: 10000, unit_purchase_price: 5.5, selling_price: 7.5 },
  { id: 'STK-03', item_name: 'Biomass Briquettes', unit: 'Tons', current_stock: 25, unit_purchase_price: 4200, selling_price: 5500 }
];

export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  try {
    let stock = JSON.parse(localStorage.getItem(`app_stock_${firmId}`) || '[]');
    if (!Array.isArray(stock) || stock.length === 0) {
      stock = [...DEFAULT_STOCK];
      localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(stock));
    }
    return stock;
  } catch {
    return DEFAULT_STOCK;
  }
};

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
      selling_price: unitRate * 1.2
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
  }

  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(stock));
  return item;
};

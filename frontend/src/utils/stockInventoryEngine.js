// frontend/src/utils/stockInventoryEngine.js

export const STANDARD_MEASUREMENT_UNITS = [
  // 1. Quantity & Count (संख्या / गिनती)
  { code: 'Pcs', label: 'Pcs (Pieces / नग)', category: 'COUNT', uqc: 'PCS' },
  { code: 'Thousand', label: 'Thousand (हजार / K)', category: 'COUNT', uqc: 'THD' },
  { code: 'Dozens', label: 'Dozens (दर्जन)', category: 'COUNT', uqc: 'DOZ' },
  { code: 'Units', label: 'Units (इकाई)', category: 'COUNT', uqc: 'UNT' },
  
  // 2. Weight & Mass (भार / वजन)
  { code: 'MT', label: 'MT (Metric Ton / मीट्रिक टन)', category: 'WEIGHT', uqc: 'MTR' },
  { code: 'Quintal', label: 'Quintal (क्विंटल)', category: 'WEIGHT', uqc: 'QTL' },
  { code: 'Kg', label: 'Kg (Kilogram / किलोग्राम)', category: 'WEIGHT', uqc: 'KGS' },
  { code: 'Grams', label: 'Grams (ग्राम)', category: 'WEIGHT', uqc: 'GRM' },

  // 3. Volume & Liquid (आयतन / तरल)
  { code: 'Liters', label: 'Liters (लीटर)', category: 'VOLUME', uqc: 'LTR' },
  { code: 'KL', label: 'KL (Kiloliter / किलोलीटर)', category: 'VOLUME', uqc: 'KLR' },
  { code: 'ML', label: 'ML (Milliliter / मिलीलीटर)', category: 'VOLUME', uqc: 'MLT' },

  // 4. Logistics & Bulk Volume (ढुलाई / घन आयतन)
  { code: 'Trips', label: 'Trips (ट्रिप / चक्कर)', category: 'LOGISTICS', uqc: 'TRP' },
  { code: 'Trolley', label: 'Trolley (ट्रॉली)', category: 'LOGISTICS', uqc: 'TRL' },
  { code: 'Dumper', label: 'Dumper (डंपर)', category: 'LOGISTICS', uqc: 'DMP' },
  { code: 'Gadi', label: 'Gadi (गाड़ी / ट्रक लोड)', category: 'LOGISTICS', uqc: 'GAD' },
  { code: 'Brass', label: 'Brass (ब्रास)', category: 'LOGISTICS', uqc: 'BRS' },
  { code: 'CFT', label: 'CFT (Cubic Feet / घन फीट)', category: 'LOGISTICS', uqc: 'CFT' },
  { code: 'CBM', label: 'CBM (Cubic Meter / घन मीटर)', category: 'LOGISTICS', uqc: 'CUM' },

  // 5. Packaging (पैकिंग)
  { code: 'Bags', label: 'Bags (थैली / कट्टा / बोरी)', category: 'PACKAGING', uqc: 'BAG' },
  { code: 'Boxes', label: 'Boxes (पेटी / कार्टन)', category: 'PACKAGING', uqc: 'BOX' },
  { code: 'Bundles', label: 'Bundles (बंडल / गट्ठा)', category: 'PACKAGING', uqc: 'BDL' },
  { code: 'Rolls', label: 'Rolls (रोल)', category: 'PACKAGING', uqc: 'ROL' },

  // 6. Length & Area (लम्बाई / क्षेत्रफल)
  { code: 'Meters', label: 'Meters (मीटर)', category: 'AREA_LENGTH', uqc: 'MTR' },
  { code: 'Feet', label: 'Feet (फीट)', category: 'AREA_LENGTH', uqc: 'FOT' },
  { code: 'SqFt', label: 'Sq. Ft. (वर्ग फीट)', category: 'AREA_LENGTH', uqc: 'SQF' },
  { code: 'SqYards', label: 'Sq. Yards (वर्ग गज)', category: 'AREA_LENGTH', uqc: 'SQY' }
];

export const DEFAULT_STOCK_STARTER = [
  { id: 'STK-01', item_name: 'Fuel / Diesel', unit: 'Liters', current_stock: 500, unit_purchase_price: 90, selling_price: 95 },
  { id: 'STK-02', item_name: 'Finished Goods Batch-A', unit: 'Thousand', current_stock: 50, unit_purchase_price: 5500, selling_price: 7500 },
  { id: 'STK-03', item_name: 'Raw Material Type-1', unit: 'MT', current_stock: 25, unit_purchase_price: 4200, selling_price: 5500 }
];

export const getStockItemsByFirm = (firmId = 'FIRM-001') => {
  try {
    const raw = localStorage.getItem(`app_stock_${firmId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(DEFAULT_STOCK_STARTER));
    return DEFAULT_STOCK_STARTER;
  } catch {
    return DEFAULT_STOCK_STARTER;
  }
};

export const saveStockItemMaster = (firmId = 'FIRM-001', payload) => {
  const stockList = getStockItemsByFirm(firmId);
  const cleanName = (payload.item_name || '').trim();

  if (!cleanName) throw new Error("Item Name is required.");

  const itemPayload = {
    id: payload.id || `STK-${Date.now()}`,
    item_name: cleanName,
    unit: payload.unit || 'Pcs',
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

export const deleteStockItemMaster = (firmId = 'FIRM-001', itemId) => {
  const stockList = getStockItemsByFirm(firmId);
  const updatedList = stockList.filter(item => item.id !== itemId);
  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(updatedList));
  window.dispatchEvent(new Event('app_state_updated'));
  window.dispatchEvent(new Event('stock_updated'));
  return true;
};

export const updateStockItemQuantity = (firmId = 'FIRM-001', itemName, qtyDelta, unitRate = 0) => {
  const stock = getStockItemsByFirm(firmId);
  let item = stock.find(s => s.item_name.toLowerCase() === itemName.trim().toLowerCase());

  if (!item) {
    item = {
      id: `STK-${Date.now()}`,
      item_name: itemName.trim(),
      unit: 'Units',
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

// frontend/src/utils/productionEngine.js

import { getStockItemsByFirm, saveStockItem } from './stockInventoryEngine.js';

export const getBrickKilnStock = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_brick_stock_${targetId}`;
  let stockData = null;
  try {
    const raw = localStorage.getItem(key);
    stockData = raw ? JSON.parse(raw) : null;
  } catch (e) { stockData = null; }

  if (!stockData) {
    stockData = { RAW_KACHI: 0, PAKKI_AVVAL: 0, PAKKI_DOYAM: 0, PAKKI_RODA: 0, RAW_SOIL_TONS: 0 };
    localStorage.setItem(key, JSON.stringify(stockData));
  }
  return stockData;
};

export const processNikasiTransformation = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const rawConsumed = parseInt(payload.raw_consumed || 0, 10);
  const avval = parseInt(payload.avval || 0, 10);
  const doyam = parseInt(payload.doyam || 0, 10);
  const roda = parseInt(payload.roda || 0, 10);

  if (rawConsumed <= 0) throw new Error("⚠️ Enter valid raw bricks consumed (> 0).");
  
  const stock = getBrickKilnStock(targetId);
  if (stock.RAW_KACHI < rawConsumed) {
    throw new Error(`⚠️ Insufficient Raw Bricks! Available: ${stock.RAW_KACHI} NOS.`);
  }

  stock.RAW_KACHI -= rawConsumed;
  stock.PAKKI_AVVAL += avval;
  stock.PAKKI_DOYAM += doyam;
  stock.PAKKI_RODA += roda;

  localStorage.setItem(`app_brick_stock_${targetId}`, JSON.stringify(stock));

  const masterKey = `app_inventory_${targetId}`;
  const masterItems = getStockItemsByFirm(targetId);

  const updateOrInsert = (itemName, qty, unit = 'Pcs') => {
    let index = masterItems.findIndex(i => i.item_name && i.item_name.includes(itemName));
    if (index !== -1) {
      masterItems[index].current_stock = qty;
    } else {
      masterItems.unshift({ id: `ITEM-${Date.now()}-${Math.random()}`, item_name: itemName, unit, current_stock: qty });
    }
  };

  updateOrInsert('🧱 कच्ची ईंट (Raw Brick)', stock.RAW_KACHI);
  updateOrInsert('🧱 पक्की ईंट (Avval Grade A)', stock.PAKKI_AVVAL);
  updateOrInsert('🧱 पक्की ईंट (Doyam Grade B)', stock.PAKKI_DOYAM);
  updateOrInsert('🧱 रोड़ा ईंट (Roda Grade C)', stock.PAKKI_RODA);

  localStorage.setItem(masterKey, JSON.stringify(masterItems));
  window.dispatchEvent(new Event('storage'));
  return { stock };
};

export const clearAllDummyKilnData = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  localStorage.setItem(`app_brick_stock_${targetId}`, JSON.stringify({ RAW_KACHI: 0, PAKKI_AVVAL: 0, PAKKI_DOYAM: 0, PAKKI_RODA: 0, RAW_SOIL_TONS: 0 }));
  window.dispatchEvent(new Event('storage'));
  return true;
};

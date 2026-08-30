// frontend/src/utils/brickKilnEngine.js

import { getStockItemsByFirm } from './stockInventoryEngine.js';

export const getKilnSettings = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  const key = `app_kiln_settings_${targetId}`;
  let settings = null;
  try {
    const raw = localStorage.getItem(key);
    settings = raw ? JSON.parse(raw) : null;
  } catch (e) { settings = null; }

  if (!settings) {
    settings = { default_brick_weight_kg: 3.2, soil_waste_percentage: 2.0 };
    localStorage.setItem(key, JSON.stringify(settings));
  }
  return settings;
};

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

export const calculateSoilTons = (brickCountNos, weightPerBrickKg, wastePercentage = 2.0) => {
  const qty = parseInt(brickCountNos || 0, 10);
  const wt = parseFloat(weightPerBrickKg || 0);
  if (qty <= 0 || wt <= 0) return 0;
  const grossKg = qty * wt;
  const totalWithWastage = grossKg * (1 + parseFloat(wastePercentage) / 100);
  return parseFloat((totalWithWastage / 1000).toFixed(3));
};

export const updateDefaultBrickWeight = (firmId, newWeightKg, applyRetrospective = false) => {
  const targetId = firmId || 'FIRM-001';
  const settings = getKilnSettings(targetId);
  settings.default_brick_weight_kg = parseFloat(newWeightKg);
  localStorage.setItem(`app_kiln_settings_${targetId}`, JSON.stringify(settings));

  if (applyRetrospective) {
    const pathaiKey = `app_brick_pathai_logs_${targetId}`;
    const logs = JSON.parse(localStorage.getItem(pathaiKey) || '[]');
    let totalAdjustedSoilTons = 0;

    const updatedLogs = logs.map(log => {
      const newSoilTons = calculateSoilTons(log.raw_bricks_count, newWeightKg, settings.soil_waste_percentage);
      totalAdjustedSoilTons += newSoilTons;
      return { ...log, unit_weight_kg: parseFloat(newWeightKg), soil_consumed_tons: newSoilTons };
    });

    localStorage.setItem(pathaiKey, JSON.stringify(updatedLogs));
    const stock = getBrickKilnStock(targetId);
    stock.RAW_SOIL_TONS = parseFloat((Math.max(0, stock.RAW_SOIL_TONS) - totalAdjustedSoilTons).toFixed(3));
    localStorage.setItem(`app_brick_stock_${targetId}`, JSON.stringify(stock));
  }
  window.dispatchEvent(new Event('storage'));
  return settings;
};

export const processPathaiProductionEntry = (firmId, payload) => {
  const targetId = firmId || 'FIRM-001';
  const qty = parseInt(payload.raw_bricks_count || 0, 10);
  const ratePer1000 = parseFloat(payload.rate_per_1000 || 400);
  const unitWeight = parseFloat(payload.unit_weight_kg || 3.2);

  if (qty <= 0) throw new Error("⚠️ Please enter a valid raw brick quantity (> 0).");
  if (unitWeight <= 0) throw new Error("⚠️ Please enter a valid brick unit weight (> 0 kg).");

  const settings = getKilnSettings(targetId);
  const soilConsumedTons = calculateSoilTons(qty, unitWeight, settings.soil_waste_percentage);
  const stock = getBrickKilnStock(targetId);

  // 1. Update Kiln Stock Balance
  stock.RAW_SOIL_TONS = parseFloat((stock.RAW_SOIL_TONS - soilConsumedTons).toFixed(3));
  stock.RAW_KACHI += qty;
  localStorage.setItem(`app_brick_stock_${targetId}`, JSON.stringify(stock));

  // 2. Direct Sync to Master Inventory Stock View (`📦 Inventory Master`)
  const masterKey = `app_inventory_${targetId}`;
  const masterItems = getStockItemsByFirm(targetId);
  
  let mudItemIndex = masterItems.findIndex(i => i.item_name && (i.item_name.includes('मिट्टी') || i.item_name.includes('Clay')));
  if (mudItemIndex !== -1) {
    masterItems[mudItemIndex].current_stock = stock.RAW_SOIL_TONS;
  } else {
    masterItems.unshift({ 
      id: `ITEM-MUD-${Date.now()}`, 
      item_name: '🌱 कच्ची मिट्टी (Raw Clay / Mud)', 
      unit: 'Tons', 
      current_stock: stock.RAW_SOIL_TONS 
    });
  }

  let rawBrickIndex = masterItems.findIndex(i => i.item_name && (i.item_name.includes('कच्ची ईंट') || i.item_name.includes('Raw Brick')));
  if (rawBrickIndex !== -1) {
    masterItems[rawBrickIndex].current_stock = stock.RAW_KACHI;
  } else {
    masterItems.unshift({ 
      id: `ITEM-RAW-${Date.now()}`, 
      item_name: '🧱 कच्ची ईंट (Raw Unbaked Brick)', 
      unit: 'Pcs', 
      current_stock: stock.RAW_KACHI 
    });
  }

  localStorage.setItem(masterKey, JSON.stringify(masterItems));

  // 3. Log Transaction
  const logKey = `app_brick_pathai_logs_${targetId}`;
  const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
  const wagesPayable = (qty / 1000) * ratePer1000;

  const logEntry = {
    id: `PATHAI-${Date.now()}`,
    laborer_name: payload.laborer_name || 'General Labor Group',
    raw_bricks_count: qty,
    unit_weight_kg: unitWeight,
    soil_consumed_tons: soilConsumedTons,
    rate_per_1000: ratePer1000,
    total_wages: wagesPayable,
    date: new Date().toISOString().split('T')[0]
  };

  existingLogs.unshift(logEntry);
  localStorage.setItem(logKey, JSON.stringify(existingLogs));

  window.dispatchEvent(new Event('storage'));
  return { stock, logEntry };
};

export const clearBrickKilnData = (firmId) => {
  const targetId = firmId || 'FIRM-001';
  localStorage.setItem(`app_brick_stock_${targetId}`, JSON.stringify({ RAW_KACHI: 0, PAKKI_AVVAL: 0, PAKKI_DOYAM: 0, PAKKI_RODA: 0, RAW_SOIL_TONS: 0 }));
  localStorage.setItem(`app_brick_pathai_logs_${targetId}`, JSON.stringify([]));
  window.dispatchEvent(new Event('storage'));
  return true;
};

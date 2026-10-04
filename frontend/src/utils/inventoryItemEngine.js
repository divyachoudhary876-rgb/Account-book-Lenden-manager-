// frontend/src/utils/inventoryItemEngine.js

import { loadFirmData, saveFirmData } from './firmIsolationEngine.js';

export const STANDARD_SUGGESTED_ITEMS = [
  { item_name: 'Int 1 Number (अव्वल)', unit: 'Pcs', rate: 7500, item_type: 'FINISHED_GOODS', hsn: '69010010' },
  { item_name: 'Int 2 Number (दोयम)', unit: 'Pcs', rate: 6200, item_type: 'FINISHED_GOODS', hsn: '69010010' },
  { item_name: 'Int 1.25 Number (पीला / सवाया)', unit: 'Pcs', rate: 5000, item_type: 'FINISHED_GOODS', hsn: '69010010' },
  { item_name: 'Khora Eent (खोरा / खंगार)', unit: 'Pcs', rate: 3800, item_type: 'FINISHED_GOODS', hsn: '69010010' },
  { item_name: 'Chatta Eent (चट्टा)', unit: 'Pcs', rate: 3500, item_type: 'FINISHED_GOODS', hsn: '69010010' },
  { item_name: 'Tukda / Rodi (रोड़ा / खंडा)', unit: 'Trolley', rate: 1200, item_type: 'FINISHED_GOODS', hsn: '69010010' },
  { item_name: 'Kacchi Eent (कच्ची ईंट)', unit: 'Pcs', rate: 1100, item_type: 'RAW_MATERIAL', hsn: '69010010' },
  { item_name: 'Koyla / Coal (कोयला)', unit: 'MT', rate: 9500, item_type: 'FUEL', hsn: '2701' },
  { item_name: 'Mitti (कच्ची मिट्टी)', unit: 'Trolley', rate: 450, item_type: 'RAW_MATERIAL', hsn: '2505' },
  { item_name: 'Mustard Husk / Turi (तूड़ी)', unit: 'MT', rate: 3800, item_type: 'FUEL', hsn: '1213' }
];

export const getSuggestedBhattaItems = () => STANDARD_SUGGESTED_ITEMS;

export const autoSeedStandardBhattaItems = (firm) => {
  const existing = loadFirmData('inventory_items', firm, []);
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const initialItems = STANDARD_SUGGESTED_ITEMS.map((it, idx) => ({
    id: `ITEM-SEED-${idx + 1}`,
    name: it.item_name,
    item_name: it.item_name,
    unit: it.unit,
    purchase_price: it.rate,
    unit_purchase_price: it.rate,
    rate: it.rate,
    current_stock: 0,
    stock: 0,
    is_active: true,
    created_at: new Date().toISOString()
  }));

  saveFirmData('inventory_items', firm, initialItems);
  window.dispatchEvent(new Event('app_storage_updated'));
  return initialItems;
};

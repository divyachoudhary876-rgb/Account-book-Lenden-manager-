/**
 * Inventory Item Master Engine with Automatic Linked Stock Ledger Synchronization
 */

import { loadFirmData, saveFirmData } from './firmIsolationEngine.js';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';
import { StorageService } from './storageSync';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

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

const resolveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.id || firmInput.firm_id || firmInput.firmId || 'FIRM-001';
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

/**
 * Automatically creates or updates the corresponding Stock Account in Account Master
 */
const autoEnsureStockLedger = (firmId, rawItemName, oldItemName = null) => {
  if (!firmId || !rawItemName) return null;

  const cleanItemName = String(rawItemName).trim();
  const targetAccountName = `${cleanItemName} Stock Account`;
  const oldAccountName = oldItemName ? `${String(oldItemName).trim()} Stock Account` : null;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    
    // Check if old account exists to perform cascade rename if name changed
    if (oldAccountName && oldAccountName.toLowerCase() !== targetAccountName.toLowerCase()) {
      const oldAcc = masterAccounts.find(acc => {
        const name = (acc.account_name || acc.name || '').trim().toLowerCase();
        return name === oldAccountName.toLowerCase();
      });

      if (oldAcc) {
        const updatedAcc = {
          ...oldAcc,
          account_name: targetAccountName,
          name: targetAccountName,
          sub_group: 'Raw Material Inventory (कच्चा माल)',
          updated_at: new Date().toISOString()
        };
        saveMasterAccount(firmId, updatedAcc);
        return updatedAcc;
      }
    }

    const existingIndex = masterAccounts.findIndex(acc => {
      const name = (acc.account_name || acc.name || '').trim().toLowerCase();
      return name === targetAccountName.toLowerCase();
    });

    if (existingIndex !== -1) {
      return masterAccounts[existingIndex];
    }

    const newAccountObj = {
      id: `ACC-STK-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      firm_id: firmId,
      account_name: targetAccountName,
      name: targetAccountName,
      primary_type: 'ASSETS',
      type: 'Assets',
      sub_group: 'Raw Material Inventory (कच्चा माल)',
      group: 'Current Assets',
      balance_type: 'Dr',
      opening_balance: 0,
      is_system_generated: true,
      created_at: new Date().toISOString()
    };

    saveMasterAccount(firmId, newAccountObj);
    return newAccountObj;
  } catch (err) {
    console.error('Error auto-syncing stock ledger account:', err);
    return null;
  }
};

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

export const loadFirmInventory = (firmInput) => {
  const firmId = resolveFirmId(firmInput);
  const possibleKeys = [
    `inventory_items_${firmId}`,
    `app_stock_${firmId}`,
    `app_inventory_${firmId}`,
    'inventory_items'
  ];

  let items = [];
  for (const key of possibleKeys) {
    try {
      const raw = StorageService.getItem(key, []) || JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(raw) && raw.length > 0) {
        items = raw;
        break;
      }
    } catch (e) {}
  }

  return Array.isArray(items) ? items.filter(item => item && (item.name || item.item_name)) : [];
};

export const saveFirmInventory = (firmInput, itemData) => {
  const firmId = resolveFirmId(firmInput);
  const cleanName = String(itemData.name || itemData.item_name || '').trim();
  if (!cleanName) throw new Error('Item name is mandatory.');

  const existingItems = loadFirmInventory(firmInput);
  const itemId = itemData.id ? String(itemData.id).trim() : null;
  
  const existingItemIndex = itemId 
    ? existingItems.findIndex(i => i && String(i.id).trim() === itemId)
    : -1;

  const oldItemName = existingItemIndex !== -1 ? (existingItems[existingItemIndex].name || existingItems[existingItemIndex].item_name) : null;

  const currentStock = round2(parseFloat(itemData.current_stock ?? itemData.stock ?? itemData.qty ?? 0));
  const purchasePrice = round2(parseFloat(itemData.unit_purchase_price ?? itemData.purchase_price ?? itemData.rate ?? 0));
  const sellingPrice = round2(parseFloat(itemData.unit_selling_price ?? itemData.selling_price ?? 0));

  const resolvedId = itemId || `ITEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const normalizedItem = {
    id: resolvedId,
    firm_id: firmId,
    name: cleanName,
    item_name: cleanName,
    unit: itemData.unit || 'Pcs',
    item_type: itemData.item_type || (itemData.is_service ? 'SERVICE' : 'GOODS'),
    is_service: Boolean(itemData.is_service || itemData.item_type === 'SERVICE'),
    current_stock: currentStock,
    stock: currentStock,
    qty: currentStock,
    unit_purchase_price: purchasePrice,
    purchase_price: purchasePrice,
    unit_selling_price: sellingPrice,
    selling_price: sellingPrice,
    hsn_sac: itemData.hsn_sac || '',
    tax_rate: parseFloat(itemData.tax_rate || 0),
    description: itemData.description || '',
    updated_at: new Date().toISOString()
  };

  let updatedList;
  if (existingItemIndex !== -1) {
    updatedList = [...existingItems];
    updatedList[existingItemIndex] = { ...existingItems[existingItemIndex], ...normalizedItem };
  } else {
    normalizedItem.created_at = new Date().toISOString();
    updatedList = [normalizedItem, ...existingItems];
  }

  saveFirmData('inventory_items', firmInput, updatedList);
  StorageService.setItem(`inventory_items_${firmId}`, updatedList);
  StorageService.setItem(`app_stock_${firmId}`, updatedList);
  localStorage.setItem(`inventory_items_${firmId}`, JSON.stringify(updatedList));
  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(updatedList));
  localStorage.setItem('inventory_items', JSON.stringify(updatedList));

  if (!normalizedItem.is_service && normalizedItem.item_type !== 'SERVICE') {
    autoEnsureStockLedger(firmId, cleanName, oldItemName);
  }

  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return normalizedItem;
};

export const deleteFirmInventory = (firmInput, itemId) => {
  const firmId = resolveActiveFirmId(firmInput);
  if (!firmId || !itemId) return false;

  const existingItems = loadFirmInventory(firmInput);
  const updatedList = existingItems.filter(i => String(i.id) !== String(itemId));

  saveFirmData('inventory_items', firmInput, updatedList);
  StorageService.setItem(`inventory_items_${firmId}`, updatedList);
  StorageService.setItem(`app_stock_${firmId}`, updatedList);
  localStorage.setItem(`inventory_items_${firmId}`, JSON.stringify(updatedList));
  localStorage.setItem(`app_stock_${firmId}`, JSON.stringify(updatedList));
  localStorage.setItem('inventory_items', JSON.stringify(updatedList));

  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return true;
};

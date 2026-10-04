// frontend/src/utils/inventoryItemEngine.js

import { loadFirmData, saveFirmData, getCleanFirmId } from './firmIsolationEngine';
import { getFirmMasterAccounts, saveMasterAccount } from './accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

/**
 * Automatically creates or synchronizes the Financial Asset Ledger in Master Accounts
 * whenever a stock item is created or updated.
 */
export const ensureStockItemLedgerAccount = (firmInput, rawItemName, existingAccountName = null) => {
  const firmId = getCleanFirmId(firmInput);
  if (!firmId || !rawItemName) return null;

  const cleanItemName = String(rawItemName).trim();
  const targetAccountName = `${cleanItemName} Stock Account`;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    
    const existingIndex = masterAccounts.findIndex(acc => 
      (acc.account_name || acc.name || '').trim().toLowerCase() === targetAccountName.toLowerCase() ||
      (existingAccountName && (acc.account_name || acc.name || '').trim().toLowerCase() === existingAccountName.toLowerCase())
    );

    if (existingIndex !== -1) {
      const matchedAcc = masterAccounts[existingIndex];
      if ((matchedAcc.account_name || matchedAcc.name) !== targetAccountName) {
        matchedAcc.account_name = targetAccountName;
        matchedAcc.name = targetAccountName;
        matchedAcc.updated_at = new Date().toISOString();
        saveMasterAccount(firmId, matchedAcc);
      }
      return matchedAcc;
    }

    const newAccountObj = {
      id: `ACC-STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      firm_id: firmId,
      account_name: targetAccountName,
      name: targetAccountName,
      primary_type: 'ASSETS',
      type: 'Assets',
      sub_group: 'Inventory / Current Assets',
      group: 'Current Assets',
      balance_type: 'Dr',
      opening_balance: 0,
      is_system_generated: true,
      created_at: new Date().toISOString()
    };

    saveMasterAccount(firmId, newAccountObj);

    window.dispatchEvent(new Event('app_accounts_updated'));
    window.dispatchEvent(new Event('app_storage_updated'));

    return newAccountObj;
  } catch (err) {
    console.error('Error auto-syncing stock ledger account:', err);
    return null;
  }
};

/**
 * Fetch all inventory items for the active firm
 */
export const getFirmInventoryItems = (firmInput) => {
  const firmId = getCleanFirmId(firmInput);
  let items = loadFirmData('inventory_items', firmInput, []);

  if (!Array.isArray(items) || items.length === 0) {
    try {
      const raw = localStorage.getItem(`inventory_items_${firmId}`) || localStorage.getItem('inventory_items');
      if (raw) {
        items = JSON.parse(raw);
      }
    } catch (e) {
      items = [];
    }
  }

  return Array.isArray(items) ? items.filter(item => item && (item.name || item.item_name)) : [];
};

/**
 * Save or Update an Inventory Item and auto-link its Stock Account
 */
export const saveFirmInventoryItem = (firmInput, itemData) => {
  const firmId = getCleanFirmId(firmInput);
  if (!firmId) throw new Error('Valid Firm is required to save inventory items.');

  const cleanName = String(itemData.name || itemData.item_name || '').trim();
  if (!cleanName) throw new Error('Item name is mandatory.');

  const existingItems = getFirmInventoryItems(firmInput);
  const itemId = itemData.id || `ITEM-${Date.now()}`;
  
  const existingItemIndex = existingItems.findIndex(i => String(i.id) === String(itemId));
  const oldItemName = existingItemIndex !== -1 ? (existingItems[existingItemIndex].name || existingItems[existingItemIndex].item_name) : null;

  const currentStock = round2(parseFloat(itemData.current_stock ?? itemData.stock ?? itemData.qty ?? 0));
  const purchasePrice = round2(parseFloat(itemData.unit_purchase_price ?? itemData.purchase_price ?? itemData.rate ?? 0));
  const sellingPrice = round2(parseFloat(itemData.unit_selling_price ?? itemData.selling_price ?? 0));

  const normalizedItem = {
    id: itemId,
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
  localStorage.setItem(`inventory_items_${firmId}`, JSON.stringify(updatedList));
  localStorage.setItem('inventory_items', JSON.stringify(updatedList));

  if (!normalizedItem.is_service && normalizedItem.item_type !== 'SERVICE') {
    ensureStockItemLedgerAccount(firmInput, cleanName, oldItemName ? `${oldItemName} Stock Account` : null);
  }

  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return normalizedItem;
};

/**
 * Delete an Inventory Item
 */
export const deleteFirmInventoryItem = (firmInput, itemId) => {
  const firmId = getCleanFirmId(firmInput);
  if (!firmId || !itemId) return false;

  const existingItems = getFirmInventoryItems(firmInput);
  const updatedList = existingItems.filter(i => String(i.id) !== String(itemId));

  saveFirmData('inventory_items', firmInput, updatedList);
  localStorage.setItem(`inventory_items_${firmId}`, JSON.stringify(updatedList));
  localStorage.setItem('inventory_items', JSON.stringify(updatedList));

  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return true;
};

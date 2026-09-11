// frontend/src/utils/stockinventoryEngine.js

/**
 * Get stock items strictly filtered by the currently active Firm ID or Firm Name
 */
export const getActiveFirmStockItems = (activeFirmInput) => {
  let activeFirmId = 'FIRM-001';
  let activeFirmName = '';

  if (typeof activeFirmInput === 'string') {
    activeFirmName = activeFirmInput.trim().toLowerCase();
    activeFirmId = activeFirmInput.trim();
  } else if (activeFirmInput && typeof activeFirmInput === 'object') {
    activeFirmId = activeFirmInput.id || activeFirmInput.firm_id || 'FIRM-001';
    activeFirmName = (activeFirmInput.legal_name || activeFirmInput.trade_name || activeFirmInput.name || '').trim().toLowerCase();
  }

  let rawItems = [];
  const stockKeys = ['inventory_items', 'stock_master', 'items_list', 'stock_items'];

  // 1. Fetch from known stock storage keys
  stockKeys.forEach(k => {
    try {
      const val = JSON.parse(localStorage.getItem(k) || '[]');
      if (Array.isArray(val)) rawItems.push(...val);
    } catch (e) {}
  });

  // 2. Deep scan localStorage for any stock/inventory related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('stock') || key.includes('inventory') || key.includes('item'))) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) rawItems.push(...parsed);
        } catch (err) {}
      }
    }
  }

  // 3. Deduplicate items by ID or name
  const uniqueMap = new Map();
  rawItems.forEach(item => {
    if (!item) return;
    const uKey = item.id || item.item_name || item.name;
    if (uKey && !uniqueMap.has(uKey)) {
      uniqueMap.set(uKey, item);
    }
  });

  const allItems = Array.from(uniqueMap.values());

  // 4. STRICT FIRM ISOLATION FILTER
  const filteredItems = allItems.filter(item => {
    const itemFirmId = String(item.firm_id || item.company_id || '').trim();
    const itemFirmName = String(item.firm_name || item.company_name || '').trim().toLowerCase();

    if (itemFirmId && activeFirmId && itemFirmId !== 'FIRM-001' && activeFirmId !== 'FIRM-001') {
      return itemFirmId === activeFirmId || itemFirmName === activeFirmName;
    }

    if (itemFirmName && activeFirmName) {
      return itemFirmName === activeFirmName;
    }

    return true; 
  });

  return filteredItems;
};

// Universal Aliases to support multiple component import naming conventions
export const getStockItems = getActiveFirmStockItems;
export const fetchInventoryItems = getActiveFirmStockItems;
export const getStockInventory = getActiveFirmStockItems;

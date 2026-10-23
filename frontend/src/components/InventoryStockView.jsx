import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine.js';
import { generateStockItemLedgerStatement, exportStockLedgerPDF } from '../utils/inventoryLedgerReport';
import { getStockItemsByFirm, getFirmItemStock } from '../utils/stockInventoryEngine';
import { StorageService } from '../utils/storageSync';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

const resolveActiveFirmId = (firmInput) => {
  if (typeof firmInput === 'string' && firmInput.trim() !== '') return firmInput.trim();
  if (firmInput && typeof firmInput === 'object') {
    return firmInput.id || firmInput.firm_id || firmInput.firmId || 'FIRM-001';
  }
  return localStorage.getItem('app_active_firm_id') || 'FIRM-001';
};

const autoEnsureStockLedger = (firmId, rawItemName, existingAccountName = null) => {
  if (!firmId || !rawItemName) return null;

  const cleanItemName = String(rawItemName).trim();
  const targetAccountName = `${cleanItemName} Stock Account`;

  try {
    const masterAccounts = getFirmMasterAccounts(firmId) || [];
    
    const existingIndex = masterAccounts.findIndex(acc => {
      const name = (acc.account_name || acc.name || '').trim().toLowerCase();
      return name === targetAccountName.toLowerCase() ||
        (existingAccountName && name === existingAccountName.toLowerCase());
    });

    if (existingIndex !== -1) {
      const matchedAcc = masterAccounts[existingIndex];
      let needsUpdate = false;

      if ((matchedAcc.account_name || matchedAcc.name) !== targetAccountName) {
        matchedAcc.account_name = targetAccountName;
        matchedAcc.name = targetAccountName;
        needsUpdate = true;
      }
      if (matchedAcc.sub_group !== 'Raw Material Inventory (कच्चा माल)') {
        matchedAcc.sub_group = 'Raw Material Inventory (कच्चा माल)';
        needsUpdate = true;
      }

      if (needsUpdate) {
        matchedAcc.updated_at = new Date().toISOString();
        saveMasterAccount(firmId, matchedAcc);
      }
      return matchedAcc;
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

const loadFirmInventory = (firmInput) => {
  const firmId = resolveActiveFirmId(firmInput);
  let items = getStockItemsByFirm(firmId);

  if (!Array.isArray(items) || items.length === 0) {
    items = loadFirmData('inventory_items', firmInput, []);
  }

  return Array.isArray(items) ? items.filter(item => item && (item.name || item.item_name)) : [];
};

const saveFirmInventory = (firmInput, itemData) => {
  const firmId = resolveActiveFirmId(firmInput);
  const cleanName = String(itemData.name || itemData.item_name || '').trim();
  if (!cleanName) throw new Error('Item name is mandatory.');

  const existingItems = loadFirmInventory(firmInput);
  const itemId = itemData.id ? String(itemData.id).trim() : null;
  
  const existingItemIndex = itemId 
    ? existingItems.findIndex(i => i && String(i.id).trim() === itemId)
    : -1;

  const oldItemName = existingItemIndex !== -1 ? (existingItems[existingItemIndex].name || existingItems[existingItemIndex].item_name) : null;

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
    unit_purchase_price: purchasePrice,
    purchase_price: purchasePrice,
    rate: purchasePrice,
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
    autoEnsureStockLedger(firmId, cleanName, oldItemName ? `${oldItemName} Stock Account` : null);
  }

  window.dispatchEvent(new Event('app_accounts_updated'));
  window.dispatchEvent(new Event('app_inventory_updated'));
  window.dispatchEvent(new Event('app_storage_updated'));
  window.dispatchEvent(new Event('storage'));

  return normalizedItem;
};

const deleteFirmInventory = (firmInput, itemId) => {
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

export default function InventoryStockView({ firm, onClose }) {
  const activeFirmId = useMemo(() => {
    return resolveActiveFirmId(firm);
  }, [firm]);

  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [itemType, setItemType] = useState('GOODS');
  const [openingStock, setOpeningStock] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  const loadStockItems = useCallback(() => {
    try {
      const stock = loadFirmInventory(firm);
      setItems(Array.isArray(stock) ? stock : []);
    } catch (err) {
      console.error('Error loading inventory items:', err);
    }
  }, [firm]);

  useEffect(() => {
    loadStockItems();
    window.addEventListener('app_inventory_updated', loadStockItems);
    window.addEventListener('app_storage_updated', loadStockItems);
    window.addEventListener('storage', loadStockItems);
    return () => {
      window.removeEventListener('app_inventory_updated', loadStockItems);
      window.removeEventListener('app_storage_updated', loadStockItems);
      window.removeEventListener('storage', loadStockItems);
    };
  }, [loadStockItems]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanName = itemName.trim();
    if (!cleanName) {
      setStatusMessage({ type: 'error', text: 'Kripya Item Name darj karein!' });
      return;
    }

    try {
      saveFirmInventory(firm, {
        id: editingItem ? editingItem.id : undefined,
        name: cleanName,
        item_name: cleanName,
        unit: unit.trim() || 'Pcs',
        item_type: itemType,
        is_service: itemType === 'SERVICE',
        unit_purchase_price: round2(parseFloat(purchasePrice) || 0),
        purchase_price: round2(parseFloat(purchasePrice) || 0),
        rate: round2(parseFloat(purchasePrice) || 0),
        unit_selling_price: round2(parseFloat(sellingPrice) || 0),
        selling_price: round2(parseFloat(sellingPrice) || 0),
        hsn_sac: hsnSac.trim()
      });

      setStatusMessage({
        type: 'success',
        text: editingItem 
          ? `✓ "${cleanName}" successfully update ho gaya!` 
          : `✓ "${cleanName}" inventory mein save ho gaya!`
      });

      setEditingItem(null);
      setItemName('');
      setUnit('Pcs');
      setItemType('GOODS');
      setOpeningStock('');
      setPurchasePrice('');
      setSellingPrice('');
      setHsnSac('');
      loadStockItems();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed: ${err.message}` });
    }
  };

  const handleEdit = (e, item) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingItem(item);
    setItemName(item.name || item.item_name || '');
    setUnit(item.unit || 'Pcs');
    setItemType(item.item_type || (item.is_service ? 'SERVICE' : 'GOODS'));
    setOpeningStock(String(item.current_stock || item.stock || item.qty || 0));
    setPurchasePrice(String(item.unit_purchase_price || item.purchase_price || item.rate || ''));
    setSellingPrice(String(item.unit_selling_price || item.selling_price || ''));
    setHsnSac(item.hsn_sac || '');
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (e, item) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const name = item.name || item.item_name;
    if (!window.confirm(`Kya aap "${name}" ko inventory se delete karna chahte hain?`)) return;

    deleteFirmInventory(firm, item.id);
    loadStockItems();
  };

  const handleDownloadStockPDF = async (e, item) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const firms = StorageService.getItem('app_firms_registry', []) || [];
      const currentFirm = firms.find(f => String(f.id || f.firm_id) === String(activeFirmId)) || {};

      const statementData = generateStockItemLedgerStatement(activeFirmId, item);
      await exportStockLedgerPDF(currentFirm, item, statementData);
    } catch (err) {
      alert("Stock Statement PDF download karne mein asafalta hui: " + err.message);
    }
  };

  const filteredItems = items.filter(i => {
    if (!i) return false;
    const q = searchQuery.toLowerCase();
    const name = (i.name || i.item_name || '').toLowerCase();
    const hsn = (i.hsn_sac || '').toLowerCase();
    return name.includes(q) || hsn.includes(q);
  });

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', boxSizing: 'border-box', padding: '12px 12px 60px 12px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header Banner */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {editingItem ? '✏️ Edit Stock Item' : '📦 Inventory & Stock Items Master'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Item par click karke direct PDF statement download karein</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {onClose && (
              <button type="button" onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div style={{
          backgroundColor: statusMessage.type === 'error' ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${statusMessage.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
          color: statusMessage.type === 'error' ? '#991b1b' : '#065f46',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxSizing: 'border-box',
          width: '100%'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Creation / Edit Form */}
      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>ITEM NAME *</label>
          <input 
            type="text" 
            placeholder="e.g. Kitchen Accessories, Mitti Grade A, Diesel" 
            value={itemName} 
            onChange={e => setItemName(e.target.value)} 
            style={inputStyle} 
            required 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>UNIT OF MEASURE *</label>
            <input 
              type="text" 
              placeholder="Pcs, Quintal, Litres, Bags" 
              value={unit} 
              onChange={e => setUnit(e.target.value)} 
              style={inputStyle} 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>ITEM TYPE</label>
            <select 
              value={itemType} 
              onChange={e => setItemType(e.target.value)} 
              style={inputStyle}
            >
              <option value="GOODS">Goods / Stock Item</option>
              <option value="SERVICE">Service (Non-Stock)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>DEFAULT PURCHASE RATE (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={purchasePrice} 
              onChange={e => setPurchasePrice(e.target.value)} 
              style={inputStyle} 
            />
          </div>
          <div>
            <label style={labelStyle}>HSN / SAC CODE</label>
            <input 
              type="text" 
              placeholder="e.g. 6901" 
              value={hsnSac} 
              onChange={e => setHsnSac(e.target.value)} 
              style={inputStyle} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button 
            type="submit" 
            style={{ 
              flex: 1, 
              backgroundColor: '#059669', 
              color: '#ffffff', 
              border: 'none', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '12px', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            {editingItem ? `✓ Update Stock Item` : `💾 Save Stock Item`}
          </button>

          {editingItem && (
            <button 
              type="button" 
              onClick={() => {
                setEditingItem(null);
                setItemName('');
                setUnit('Pcs');
                setItemType('GOODS');
                setOpeningStock('');
                setPurchasePrice('');
                setSellingPrice('');
                setStatusMessage(null);
              }} 
              style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Stock Items List */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
            📋 All Stock Items ({filteredItems.length})
          </strong>
          <span style={{ fontSize: '10px', color: '#0369a1', fontStyle: 'italic' }}>* Click card to download PDF statement</span>
        </div>

        <input 
          type="text" 
          placeholder="🔍 Search items by name..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          style={{ ...inputStyle, padding: '8px 12px', fontSize: '11px', marginBottom: '10px' }} 
        />

        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
              No inventory stock items found.
            </div>
          ) : (
            filteredItems.map((item) => {
              const stockName = item.name || item.item_name;
              const stockQty = getFirmItemStock(activeFirmId, stockName);
              const rate = parseFloat(item.unit_purchase_price || item.purchase_price || item.rate || 0);

              return (
                <div 
                  key={item.id} 
                  onClick={(e) => handleDownloadStockPDF(e, item)}
                  title="Click to download complete Stock Movement PDF Statement"
                  style={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '10px 12px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                      📄 {stockName}
                    </strong>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Unit: {item.unit || 'Pcs'} | Default Rate: ₹{rate.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#059669', fontWeight: 'bold', marginTop: '1px' }}>
                      🔗 Linked Ledger: {stockName} Stock Account
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: stockQty > 0 ? '#0284c7' : '#94a3b8' }}>
                      {stockQty} {item.unit || 'Pcs'}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <button 
                        type="button" 
                        onClick={(e) => handleEdit(e, item)} 
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => handleDelete(e, item)} 
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '14px',
  border: '1px solid #cbd5e1',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
  boxSizing: 'border-box',
  width: '100%'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#334155',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};

// frontend/src/components/InventoryManagerView.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { getFirmInventoryItems, saveFirmInventoryItem, deleteFirmInventoryItem } from '../utils/inventoryItemEngine';
import { getCleanFirmId } from '../utils/firmIsolationEngine';

export default function InventoryManagerView({ firm, onClose }) {
  const activeFirmId = getCleanFirmId(firm) || localStorage.getItem('app_active_firm_id') || 'FIRM-001';

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
      const stock = getFirmInventoryItems(firm);
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
      saveFirmInventoryItem(firm, {
        id: editingItem ? editingItem.id : undefined,
        name: cleanName,
        unit: unit.trim() || 'Pcs',
        item_type: itemType,
        is_service: itemType === 'SERVICE',
        current_stock: editingItem ? editingItem.current_stock : (parseFloat(openingStock) || 0),
        unit_purchase_price: parseFloat(purchasePrice) || 0,
        unit_selling_price: parseFloat(sellingPrice) || 0,
        hsn_sac: hsnSac.trim()
      });

      setStatusMessage({
        type: 'success',
        text: editingItem 
          ? `✓ "${cleanName}" aur uska Stock Ledger update ho gaya!` 
          : `✓ "${cleanName}" inventory me save ho gaya aur "${cleanName} Stock Account" ledger auto-create ho gaya!`
      });

      // Reset Form
      setEditingItem(null);
      setItemName('');
      setOpeningStock('');
      setPurchasePrice('');
      setSellingPrice('');
      setHsnSac('');
      loadStockItems();
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Failed: ${err.message}` });
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setItemName(item.name || item.item_name || '');
    setUnit(item.unit || 'Pcs');
    setItemType(item.item_type || (item.is_service ? 'SERVICE' : 'GOODS'));
    setOpeningStock(String(item.current_stock || item.stock || 0));
    setPurchasePrice(String(item.unit_purchase_price || item.purchase_price || ''));
    setSellingPrice(String(item.unit_selling_price || item.selling_price || ''));
    setHsnSac(item.hsn_sac || '');
    setStatusMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (item) => {
    const name = item.name || item.item_name;
    if (!window.confirm(`Kya aap "${name}" ko inventory se delete karna chahte hain?`)) return;

    deleteFirmInventoryItem(firm, item.id);
    loadStockItems();
  };

  const filteredItems = items.filter(i => {
    const q = searchQuery.toLowerCase();
    const name = (i.name || i.item_name || '').toLowerCase();
    const hsn = (i.hsn_sac || '').toLowerCase();
    return name.includes(q) || hsn.includes(q);
  });

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', padding: '12px 12px 60px 12px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              {editingItem ? '✏️ Edit Stock Item' : '📦 Inventory & Stock Items Master'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Item bante hi uska Stock Asset Ledger automatic ban jayega</span>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
              Close
            </button>
          )}
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
          fontWeight: 'bold'
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
            <label style={labelStyle}>{editingItem ? 'CURRENT STOCK' : 'OPENING STOCK'}</label>
            <input 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={openingStock} 
              onChange={e => setOpeningStock(e.target.value)} 
              style={{ ...inputStyle, backgroundColor: editingItem ? '#f8fafc' : '#ffffff' }}
              disabled={Boolean(editingItem)} 
            />
          </div>
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
            {editingItem ? `✓ Update Item & Ledger` : `💾 Save Item & Auto-Create Stock Ledger`}
          </button>

          {editingItem && (
            <button 
              type="button" 
              onClick={() => {
                setEditingItem(null);
                setItemName('');
                setOpeningStock('');
                setPurchasePrice('');
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
        <div style={{ marginBottom: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a' }}>
            📋 All Stock Items ({filteredItems.length})
          </strong>
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
              const stockQty = parseFloat(item.current_stock || item.stock || 0);
              const rate = parseFloat(item.unit_purchase_price || item.purchase_price || 0);

              return (
                <div 
                  key={item.id} 
                  style={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '10px 12px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                      {item.name || item.item_name}
                    </strong>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Unit: {item.unit || 'Pcs'} | Default Rate: ₹{rate.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#059669', fontWeight: 'bold', marginTop: '1px' }}>
                      🔗 Linked Ledger: {item.name || item.item_name} Stock Account
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '900', color: stockQty > 0 ? '#0284c7' : '#94a3b8' }}>
                      {stockQty} {item.unit || 'Pcs'}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button" 
                        onClick={() => handleEdit(item)} 
                        style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(item)} 
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

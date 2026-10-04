// frontend/src/components/TradingInventoryCatalogView.jsx

import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine.js';
import { STANDARD_SUGGESTED_ITEMS } from '../utils/inventoryItemEngine.js';

export default function TradingInventoryCatalogView({ firm, onClose }) {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [rate, setRate] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [hsn, setHsn] = useState('69010010');
  
  const [feedback, setFeedback] = useState(null);

  const loadItems = () => {
    if (!firm) return;
    const list = loadFirmData('inventory_items', firm, []) || [];
    setItems(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    loadItems();
    window.addEventListener('app_storage_updated', loadItems);
    return () => window.removeEventListener('app_storage_updated', loadItems);
  }, [firm]);

  const handleApplySuggestion = (sug) => {
    setItemName(sug.item_name);
    setUnit(sug.unit);
    setRate(String(sug.rate));
    setHsn(sug.hsn);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert('Item name darj karein.');

    const newItem = {
      id: `ITEM-${Date.now()}`,
      name: itemName.trim(),
      item_name: itemName.trim(),
      unit: unit || 'Pcs',
      purchase_price: Number(rate) || 0,
      unit_purchase_price: Number(rate) || 0,
      rate: Number(rate) || 0,
      current_stock: Number(openingStock) || 0,
      stock: Number(openingStock) || 0,
      qty: Number(openingStock) || 0,
      opening_stock: Number(openingStock) || 0,
      hsn_code: hsn,
      created_at: new Date().toISOString()
    };

    const updated = [newItem, ...items];
    setItems(updated);
    saveFirmData('inventory_items', firm, updated);
    window.dispatchEvent(new Event('app_storage_updated'));

    setFeedback({ type: 'success', text: `✓ Item "${newItem.name}" successfully add ho gaya!` });
    setItemName('');
    setRate('');
    setOpeningStock('');
  };

  const filteredItems = items.filter(i => 
    (i.name || i.item_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '10px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>📦 Inventory & Stock Items Catalog</h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Eent, Koyla, Mitti aur raw material stock management</span>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            ← Dashboard
          </button>
        )}
      </div>

      {feedback && (
        <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: 'bold', border: '1px solid #a7f3d0', marginBottom: '10px' }}>
          {feedback.text}
        </div>
      )}

      {/* Add New Item Form with Standard Suggestions */}
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
          ⚡ Quick Add Standard Bhatta Items (Click to Auto-Fill):
        </h3>

        {/* Suggestion Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {STANDARD_SUGGESTED_ITEMS.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySuggestion(sug)}
              style={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                color: '#0369a1',
                cursor: 'pointer'
              }}
            >
              + {sug.item_name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSaveItem}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={labelStyle}>Item Name *</label>
              <input type="text" placeholder="e.g. Int 1 Number" value={itemName} onChange={e => setItemName(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Unit *</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
                <option value="Pcs">Pcs (हज़ार/संख्या)</option>
                <option value="Trolley">Trolley (ट्रॉली)</option>
                <option value="MT">MT (टन / Metric Ton)</option>
                <option value="Litre">Litre (लीटर)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rate / Price (₹)</label>
              <input type="number" step="0.01" placeholder="e.g. 7500" value={rate} onChange={e => setRate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Opening Stock Qty</label>
              <input type="number" step="1" placeholder="e.g. 50000" value={openingStock} onChange={e => setOpeningStock(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            ✓ Save Item into Inventory Stock
          </button>
        </form>
      </div>

      {/* Stock Items List */}
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
            Stock Register ({filteredItems.length})
          </h3>
          <input 
            type="text" 
            placeholder="Search stock..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', outline: 'none' }} 
          />
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
            Koi stock item darj nahi hai. Upar diye gaye buttons se turant standard items jodein.
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filteredItems.map(item => (
              <div key={item.id} style={{ padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>{item.name || item.item_name}</strong>
                  <div style={{ color: '#64748b', fontSize: '10px' }}>Rate: ₹{item.purchase_price || item.rate || 0} / {item.unit || 'Unit'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: '800', color: '#059669', fontSize: '12px' }}>
                    {Number(item.current_stock || item.stock || 0).toLocaleString('en-IN')} {item.unit || 'Pcs'}
                  </span>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>Available Stock</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 'bold',
  color: '#475569',
  marginBottom: '3px',
  textTransform: 'uppercase'
};

const inputStyle = {
  width: '100%',
  padding: '7px 8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  outline: 'none'
};

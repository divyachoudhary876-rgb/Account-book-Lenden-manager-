// frontend/src/components/TradingInventoryCatalogView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function TradingInventoryCatalogView({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const storageKey = `trading_catalog_${firmId}_${selectedFY}`;

  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('General');
  const [unit, setUnit] = useState('Pcs');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [openingStock, setOpeningStock] = useState('');

  useEffect(() => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setItems(saved);
    } catch (e) {
      console.error("Error loading trading catalog:", e);
    }
  }, [storageKey]);

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName || !sellingPrice) {
      alert("Kripya Item Name aur Selling Price bharein!");
      return;
    }

    const newItem = {
      id: 'ITEM-' + Date.now(),
      itemName: itemName.trim(),
      category: category.trim(),
      unit,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      stockQty: Number(openingStock) || 0,
      selectedFY
    };

    const updated = [newItem, ...items];
    setItems(updated);
    StorageService.setItem(storageKey, updated);
    window.dispatchEvent(new Event('app_storage_updated'));

    // Reset Form
    setItemName('');
    setCategory('General');
    setPurchasePrice('');
    setSellingPrice('');
    setOpeningStock('');
    alert("✓ Trading Item successfully added to catalog!");
  };

  const handleDelete = (id) => {
    if (window.confirm("Kya aap is item ko catalog se hatana chahte hain?")) {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      StorageService.setItem(storageKey, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  return (
    <div style={{ padding: '10px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📦 Trading Item Catalog & Stock Master ({selectedFY})
        </h3>

        <form onSubmit={handleSaveItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Item Name / Product *</label>
            <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="e.g. Cement Bag / Hardware Item" style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Category / Group</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Hardware / Grocery" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Unit</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
              <option value="Pcs">Pcs (नग)</option>
              <option value="Kg">Kg (किलोग्राम)</option>
              <option value="Bags">Bags (कट्टे)</option>
              <option value="Boxes">Boxes (डब्बे)</option>
              <option value="Meters">Meters (मीटर)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Purchase Price (₹)</label>
            <input type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Selling Price (₹) *</label>
            <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" style={inputStyle} required />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Opening Stock Qty</label>
            <input type="number" value={openingStock} onChange={e => setOpeningStock(e.target.value)} placeholder="0" style={inputStyle} />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
            <button type="submit" style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
              💾 Save Item to Catalog
            </button>
          </div>
        </form>
      </div>

      {/* Item Catalog List Table */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>Active Stock Catalog ({selectedFY})</h4>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '12px' }}>Koi trading item darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px' }}>Item Name</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Purchase Rate</th>
                  <th style={{ padding: '8px' }}>Selling Rate</th>
                  <th style={{ padding: '8px' }}>Stock Qty</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.itemName}</td>
                    <td style={{ padding: '8px', color: '#64748b' }}>{item.category}</td>
                    <td style={{ padding: '8px' }}>₹{item.purchasePrice}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#166534' }}>₹{item.sellingPrice}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0369a1' }}>{item.stockQty} {item.unit}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(item.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  marginTop: '4px'
};

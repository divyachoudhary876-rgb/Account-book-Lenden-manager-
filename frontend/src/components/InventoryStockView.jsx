// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';

export default function InventoryStockView({ firm }) {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [salesPrice, setSalesPrice] = useState('');
  const [stockQty, setStockQty] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_inventory') || '[]');
      setItems(saved);
    } catch (e) {
      setItems([]);
    }
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert('Item Name enter karein!');

    const newItem = {
      id: `ITEM-${Date.now()}`,
      item_name: itemName.trim(),
      unit_of_measure: unit,
      sales_price: parseFloat(salesPrice) || 0,
      current_stock: parseFloat(stockQty) || 0
    };

    const updated = [...items, newItem];
    localStorage.setItem('app_inventory', JSON.stringify(updated));
    setItems(updated);
    setItemName('');
    setSalesPrice('');
    setStockQty('');
    alert(`Item "${newItem.item_name}" added to stock master!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Create Stock Item Form */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📦 Add Product / Raw Material Stock</h3>
        <form onSubmit={handleCreateItem} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Item Name *</label>
            <input type="text" placeholder="e.g. Red Bricks / Biomass Briquettes" value={itemName} onChange={(e) => setItemName(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Unit</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}>
              <option value="PCS">Pieces (Pcs)</option>
              <option value="TON">Tonne (MT)</option>
              <option value="KG">Kilogram (Kg)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Selling Rate (₹)</label>
            <input type="number" step="0.01" placeholder="5.50" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>Opening Stock</label>
            <input type="number" placeholder="10000" value={stockQty} onChange={(e) => setStockQty(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ padding: '9px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>➕ Save Item</button>
        </form>
      </div>

      {/* Inventory Master Table */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Live Inventory & Stock Summary</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Item Name</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'center' }}>Unit</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Selling Rate (₹)</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right' }}>Current Available Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No Stock Items Created yet.</td></tr>
            ) : (
              items.map(item => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{item.item_name}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'center' }}>{item.unit_of_measure}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'right' }}>₹{parseFloat(item.sales_price).toFixed(2)}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'right', fontWeight: 'bold', color: item.current_stock < 100 ? '#dc2626' : '#16a34a' }}>
                    {item.current_stock} {item.unit_of_measure}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

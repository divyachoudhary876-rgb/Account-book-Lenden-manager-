// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm, addNewStockItem } from '../utils/stockInventoryEngine.js';

export default function InventoryStockView({ firm }) {
  const activeFirmId = firm?.id;
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [openingStock, setOpeningStock] = useState('0');

  useEffect(() => {
    loadInventory();
    const handleStorage = () => loadInventory();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [firm]);

  const loadInventory = () => {
    setItems(getStockItemsByFirm(activeFirmId));
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert("❌ Please enter Stock Item Name.");

    try {
      addNewStockItem(activeFirmId, { item_name: itemName, unit, opening_stock: openingStock });
      alert(`✓ New Item "${itemName}" added! It is now available in Inventory, Sales, and Purchase entry forms.`);
      setItemName('');
      setOpeningStock('0');
      loadInventory();
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>📦 Master Inventory & Stock Balance</h3>

      {/* Add Item Form */}
      <form onSubmit={handleCreateItem} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <input type="text" placeholder="Item Name (e.g. Red Brick / Coal)" value={itemName} onChange={e => setItemName(e.target.value)} style={inputStyle} required />
        <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
          <option value="Pcs">Pcs (Pieces)</option>
          <option value="Tons">Tons</option>
          <option value="MT">MT (Metric Ton)</option>
          <option value="Kg">Kg</option>
          <option value="Bags">Bags</option>
        </select>
        <input type="number" placeholder="Opening Stock" value={openingStock} onChange={e => setOpeningStock(e.target.value)} style={inputStyle} />
        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>➕ Add Stock Item</button>
      </form>

      {/* Synchronized Inventory Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Unit</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Current Available Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>📦 {item.item_name}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>{item.unit}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: item.current_stock > 0 ? '#059669' : '#dc2626' }}>
                  {item.current_stock} {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = { padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' };

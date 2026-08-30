// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';
import {
  getStockItemsByFirm,
  addNewStockItem,
  deleteStockItem,
  purgeAndClearInventoryData
} from '../utils/stockInventoryEngine.js';

export default function InventoryStockView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [openingStock, setOpeningStock] = useState('');
  const [saleRate, setSaleRate] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');

  useEffect(() => {
    loadStock();
    const handleStorage = () => loadStock();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [firm]);

  const loadStock = () => {
    setItems(getStockItemsByFirm(activeFirmId));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    try {
      addNewStockItem(activeFirmId, {
        item_name: itemName,
        unit,
        current_stock: openingStock,
        opening_stock: openingStock,
        sale_rate: saleRate,
        purchase_rate: purchaseRate
      });
      setItemName('');
      setOpeningStock('');
      setSaleRate('');
      setPurchaseRate('');
      loadStock();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this stock item?')) {
      deleteStockItem(activeFirmId, id);
      loadStock();
    }
  };

  const handleClear = () => {
    if (window.confirm('Clear all inventory master items?')) {
      purgeAndClearInventoryData(activeFirmId);
      loadStock();
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>📦 Master Inventory Management</h3>
        <button onClick={handleClear} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
          🗑️ Clear Inventory
        </button>
      </div>

      <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <input type="text" placeholder="Item Name *" value={itemName} onChange={e => setItemName(e.target.value)} style={inputStyle} required />
        <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
          <option value="Pcs">Pcs</option>
          <option value="Tons">Tons</option>
          <option value="Thousand">Thousand</option>
          <option value="Kg">Kg</option>
          <option value="Bags">Bags</option>
        </select>
        <input type="number" placeholder="Opening Stock" value={openingStock} onChange={e => setOpeningStock(e.target.value)} style={inputStyle} />
        <input type="number" placeholder="Sale Rate (₹)" value={saleRate} onChange={e => setSaleRate(e.target.value)} style={inputStyle} />
        <input type="number" placeholder="Purchase Rate (₹)" value={purchaseRate} onChange={e => setPurchaseRate(e.target.value)} style={inputStyle} />
        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
          + Add
        </button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
            <th style={{ padding: '8px', textAlign: 'left' }}>Item Name</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Unit</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Current Stock</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Sale Rate</th>
            <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No stock items found.</td></tr>
          ) : (
            items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.item_name}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{item.unit}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: item.current_stock > 0 ? '#059669' : '#dc2626' }}>{item.current_stock}</td>
                <td style={{ padding: '8px', textAlign: 'right' }}>₹{item.sale_rate}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => handleDelete(item.id)} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' };

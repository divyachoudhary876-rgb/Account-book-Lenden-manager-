// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getStockItemsByFirm, 
  addNewStockItem, 
  deleteStockItem,
  purgeAndClearInventoryData,
  UNITS_OF_MEASUREMENT 
} from '../utils/stockInventoryEngine.js';

export default function InventoryStockView({ firm }) {
  const activeFirmId = firm?.id;

  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [openingStock, setOpeningStock] = useState('0');

  useEffect(() => {
    loadInventory();
    const handleStorageChange = () => loadInventory();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [firm]);

  const loadInventory = () => {
    const list = getStockItemsByFirm(activeFirmId);
    setItems(Array.isArray(list) ? list : []);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert("❌ Please enter Stock Item Name.");

    try {
      addNewStockItem(activeFirmId, {
        id: editingId,
        item_name: itemName,
        unit: unit,
        opening_stock: openingStock
      });

      alert(`✓ Stock Item "${itemName}" ${editingId ? 'updated' : 'created'} successfully!`);
      resetForm();
      loadInventory();
    } catch (err) {
      alert(`❌ Operation Failed: ${err.message}`);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setItemName(item.item_name);
    setUnit(item.unit);
    setOpeningStock(item.current_stock);
  };

  const handleDeleteClick = (item) => {
    if (window.confirm(`⚠️ Are you sure you want to delete "${item.item_name}"?`)) {
      deleteStockItem(activeFirmId, item.id);
      alert(`✓ Stock Item "${item.item_name}" deleted.`);
      loadInventory();
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setItemName('');
    setUnit('Pcs');
    setOpeningStock('0');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📦 Master Inventory & Stock Balance</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firm?.legal_name || 'Aa (TRADING)'}</span>
        </div>
      </div>

      {/* Dynamic Item Form (Create & Edit Mode) */}
      <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155' }}>
          {editingId ? '✏️ Edit Stock Item' : '➕ Register New Stock Item'}
        </div>

        <div>
          <label style={labelStyle}>Item Name *</label>
          <input
            type="text"
            placeholder="e.g. Gehun / Sarson / Red Brick"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Measurement Unit *</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
              {UNITS_OF_MEASUREMENT.map(u => (
                <option key={u.code} value={u.code}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Stock Balance</label>
            <input
              type="number"
              value={openingStock}
              onChange={e => setOpeningStock(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            style={{ flex: 1, backgroundColor: editingId ? '#059669' : '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
          >
            {editingId ? '💾 Update Stock Item' : '➕ Save & Register Stock Item'}
          </button>
          
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={{ backgroundColor: '#64748b', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Stock Items Directory with Action Controls */}
      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Unit</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Current Stock</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                  No stock items registered.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item?.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>📦 {item?.item_name}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>{item?.unit}</span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: (item?.current_stock || 0) > 0 ? '#059669' : '#dc2626' }}>
                    {item?.current_stock} {item?.unit}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button onClick={() => handleEditClick(item)} style={{ backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', marginRight: '6px', cursor: 'pointer', fontSize: '11px' }}>✏️ Edit</button>
                    <button onClick={() => handleDeleteClick(item)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>🗑️ Delete</button>
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

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm, addNewStockItem } from '../utils/stockInventoryEngine.js';

export default function InventoryStockView({ firm }) {
  const activeFirmId = firm?.id;

  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [openingStock, setOpeningStock] = useState('0');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadInventory();
    const handleStorageChange = () => loadInventory();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [firm]);

  const loadInventory = () => {
    try {
      const list = getStockItemsByFirm(activeFirmId);
      setItems(Array.isArray(list) ? list : []);
      setHasError(false);
    } catch (err) {
      console.error("Inventory loading crash prevented:", err);
      setItems([]);
      setHasError(true);
    }
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert("❌ Please enter Stock Item Name.");

    try {
      addNewStockItem(activeFirmId, {
        item_name: itemName,
        unit: unit,
        opening_stock: openingStock
      });

      alert(`✓ Stock Item "${itemName}" created successfully!`);
      setItemName('');
      setOpeningStock('0');
      loadInventory();
    } catch (err) {
      alert(`❌ Creation Failed: ${err.message}`);
    }
  };

  if (hasError) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', textAlign: 'center' }}>
        <h4>⚠️ Inventory Module Data Reset Needed</h4>
        <p style={{ fontSize: '12px' }}>Data formatting mismatch detected. Click below to recover inventory view.</p>
        <button onClick={loadInventory} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
          🔄 Reload Stock Items
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Module Title */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>📦 Master Inventory & Stock Balance</h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firm?.legal_name || 'Aa (TRADING)'}</span>
      </div>

      {/* Item Creation Form */}
      <form onSubmit={handleCreateItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#334155' }}>➕ Register New Stock Item</div>

        <div>
          <label style={labelStyle}>Item Name *</label>
          <input
            type="text"
            placeholder="e.g. Red Brick / Raw Coal / Briquette"
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
              <option value="Pcs">Pcs (Pieces)</option>
              <option value="Tons">Tons</option>
              <option value="MT">MT (Metric Ton)</option>
              <option value="Kg">Kg</option>
              <option value="Bags">Bags</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Initial Opening Stock</label>
            <input
              type="number"
              placeholder="0"
              value={openingStock}
              onChange={e => setOpeningStock(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          type="submit"
          style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}
        >
          ➕ Save & Register Stock Item
        </button>
      </form>

      {/* Directory Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '320px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Unit</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                  No stock items registered yet. Create one above.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item?.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#0f172a' }}>📦 {item?.item_name || 'Unnamed Item'}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}><span style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>{item?.unit || 'Pcs'}</span></td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: (item?.current_stock || 0) > 0 ? '#059669' : '#dc2626' }}>
                    {item?.current_stock || 0} {item?.unit || 'Pcs'}
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

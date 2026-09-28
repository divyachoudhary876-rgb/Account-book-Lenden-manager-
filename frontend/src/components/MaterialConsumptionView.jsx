// frontend/src/components/MaterialConsumptionView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function MaterialConsumptionView({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const storageKey = `fuel_consumption_${firmId}_${selectedFY}`;
  const stockStorageKey = `trading_catalog_${firmId}_${selectedFY}`;

  const [consumptions, setConsumptions] = useState([]);
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleRef, setVehicleRef] = useState('');

  // Catalog items & Accounts
  const [stockItems, setStockItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState('');
  const [expenseAccount, setExpenseAccount] = useState('Fuel & Power Expense');
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    try {
      const saved = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) setConsumptions(saved);

      const catalog = StorageService.getItem ? StorageService.getItem(stockStorageKey) : JSON.parse(localStorage.getItem(stockStorageKey) || '[]');
      if (Array.isArray(catalog)) setStockItems(catalog);
    } catch (e) {
      console.error("Error loading consumption data:", e);
    }
  }, [storageKey, stockStorageKey]);

  const handleAddToCart = () => {
    if (!selectedItem || !qty || Number(qty) <= 0) {
      alert("Kripya inventory item aur valid quantity chunein!");
      return;
    }

    const itemObj = stockItems.find(i => i.id === selectedItem || i.itemName === selectedItem);
    const itemName = itemObj ? itemObj.itemName : selectedItem;

    const newCartItem = {
      id: 'CART-' + Date.now(),
      itemName,
      qty: Number(qty) || 0,
      expenseAccount
    };

    setCartItems([...cartItems, newCartItem]);
    setSelectedItem('');
    setQty('');
  };

  const handleRemoveCartItem = (id) => {
    setCartItems(cartItems.filter(c => c.id !== id));
  };

  const handlePostConsumptions = (e) => {
    e.preventDefault();
    if (!vehicleRef || cartItems.length === 0) {
      alert("Kripya Vehicle/Chamber Ref bharein aur cart me items jodein!");
      return;
    }

    const record = {
      id: 'CONS-' + Date.now(),
      usageDate,
      vehicleRef,
      items: cartItems,
      selectedFY
    };

    const updated = [record, ...consumptions];
    setConsumptions(updated);
    StorageService.setItem(storageKey, updated);
    window.dispatchEvent(new Event('app_storage_updated'));

    // Reset Form
    setVehicleRef('');
    setCartItems([]);
    alert("✓ Fuel & Material consumption successfully posted & stock deducted!");
  };

  const handleDeleteRecord = (id) => {
    if (window.confirm("Kya aap is consumption record ko delete karna chahte hain?")) {
      const updated = consumptions.filter(c => c.id !== id);
      setConsumptions(updated);
      StorageService.setItem(storageKey, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  return (
    <div style={{ padding: '8px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚜 Multi-Item Fuel & Material Consumption ({selectedFY})
        </h3>

        <form onSubmit={handlePostConsumptions}>
          {/* Top Date & Ref Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Date of Usage *</label>
              <input type="date" value={usageDate} onChange={e => setUsageDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Vehicle / Chamber Ref *</label>
              <input type="text" value={vehicleRef} onChange={e => setVehicleRef(e.target.value)} placeholder="e.g. Tractor-1 / Chamber-1" style={inputStyle} required />
            </div>
          </div>

          {/* Cart Box */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#15803d', marginBottom: '8px' }}>
              ➕ Add Items to Consumption Cart
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Select Stock Item / Fuel *</label>
                <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle}>
                  <option value="">-- Search & Choose Fuel/Stock --</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>{item.itemName} (Stock: {item.stockQty} {item.unit})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Quantity *</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.0" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Debit Expense Account *</label>
                  <select value={expenseAccount} onChange={e => setExpenseAccount(e.target.value)} style={inputStyle}>
                    <option value="Fuel & Power Expense">Fuel & Power Expense</option>
                    <option value="Raw Material Consumed">Raw Material Consumed</option>
                    <option value="Factory Maintenance">Factory Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="button" onClick={handleAddToCart} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '9px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px' }}>
              + Add Item to Cart
            </button>

            {/* Cart Items List */}
            {cartItems.length > 0 && (
              <div style={{ marginTop: '10px', backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #dcfce7' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#166534', marginBottom: '4px' }}>Items in Current Cart:</div>
                {cartItems.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f0fdf4', fontSize: '11px' }}>
                    <span><strong>{c.itemName}</strong> (Qty: {c.qty}) - <span style={{ color: '#64748b' }}>{c.expenseAccount}</span></span>
                    <button type="button" onClick={() => handleRemoveCartItem(c.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '13px' }}>
            🚀 Post All Consumptions & Deduct Stock
          </button>
        </form>
      </div>

      {/* Consumption Register */}
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#334155' }}>Consumption Register ({selectedFY})</h4>
        {consumptions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '11px' }}>Koi consumption record darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '6px' }}>Date / Ref</th>
                  <th style={{ padding: '6px' }}>Consumed Items & Qty</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {consumptions.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{c.usageDate}<br /><strong>{c.vehicleRef}</strong></td>
                    <td style={{ padding: '6px' }}>
                      {c.items.map((it, idx) => (
                        <div key={idx}>• {it.itemName}: <strong>{it.qty}</strong></div>
                      ))}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteRecord(c.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
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
  padding: '7px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  marginTop: '3px',
  backgroundColor: '#ffffff'
};

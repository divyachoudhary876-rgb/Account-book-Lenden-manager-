// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';

export default function BhattaProductionMasterView({ firm }) {
  const [activeSubTab, setActiveSubTab] = useState('PATHAI'); // 'PATHAI' or 'NIKASI'
  const [inventory, setInventory] = useState([]);

  // Form States
  const [pathaiData, setPathaiData] = useState({ laborer: 'Ramesh Labor Group', rawQty: '', ratePerThousand: '350' });
  const [nikasiData, setNikasiData] = useState({ furnaceId: 'KILN-1', rawConsumed: '', avval: '', doyam: '', roda: '' });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = () => {
    const defaultStock = [
      { id: '1', item_name: 'कच्ची ईंट (Raw Unbaked Brick)', stage: 'RAW_KACHI', current_qty: 100 },
      { id: '2', item_name: 'पक्की ईंट - अव्वल (Class A Brick)', stage: 'FINISHED_PAKKI', current_qty: 0 },
      { id: '3', item_name: 'पक्की ईंट - दोयं (Class B Brick)', stage: 'FINISHED_PAKKI', current_qty: 0 },
      { id: '4', item_name: 'चट्टा / रोड़ा (Roda)', stage: 'FINISHED_PAKKI', current_qty: 0 }
    ];
    const stored = JSON.parse(localStorage.getItem('app_inventory') || '[]');
    if (stored.length === 0) {
      localStorage.setItem('app_inventory', JSON.stringify(defaultStock));
      setInventory(defaultStock);
    } else {
      setInventory(stored);
    }
  };

  const handlePathaiSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(pathaiData.rawQty || 0);
    if (qty <= 0) return alert("❌ Please enter valid Raw Bricks quantity.");

    const updated = [...inventory];
    updated[0].current_qty = parseFloat(updated[0].current_qty || 0) + qty;
    localStorage.setItem('app_inventory', JSON.stringify(updated));
    setInventory(updated);
    setPathaiData({ ...pathaiData, rawQty: '' });
    alert(`✓ Pathai Labor Entry Saved! Raw Stock increased by ${qty} NOS.`);
  };

  const handleNikasiSubmit = (e) => {
    e.preventDefault();
    const consumed = parseFloat(nikasiData.rawConsumed || 0);
    const avvalQty = parseFloat(nikasiData.avval || 0);
    const doyamQty = parseFloat(nikasiData.doyam || 0);
    const rodaQty = parseFloat(nikasiData.roda || 0);

    if (consumed <= 0) return alert("❌ Please enter Raw Bricks consumed quantity.");

    const updated = [...inventory];
    updated[0].current_qty = Math.max(0, parseFloat(updated[0].current_qty || 0) - consumed);
    updated[1].current_qty = parseFloat(updated[1].current_qty || 0) + avvalQty;
    updated[2].current_qty = parseFloat(updated[2].current_qty || 0) + doyamQty;
    updated[3].current_qty = parseFloat(updated[3].current_qty || 0) + rodaQty;

    localStorage.setItem('app_inventory', JSON.stringify(updated));
    setInventory(updated);
    setNikasiData({ furnaceId: 'KILN-1', rawConsumed: '', avval: '', doyam: '', roda: '' });
    alert("✓ Kiln Nikasi Transformation successfully saved & stock updated!");
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🧱 Brick Production & Kiln Transformation</h3>

      {/* Sub-Tab Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveSubTab('PATHAI')}
          style={{ padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: activeSubTab === 'PATHAI' ? '#2563eb' : '#e2e8f0', color: activeSubTab === 'PATHAI' ? '#ffffff' : '#334155' }}
        >
          1. Pathai Labor & Raw Brick Stock (+ IN)
        </button>
        <button
          onClick={() => setActiveSubTab('NIKASI')}
          style={{ padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', backgroundColor: activeSubTab === 'NIKASI' ? '#2563eb' : '#e2e8f0', color: activeSubTab === 'NIKASI' ? '#ffffff' : '#334155' }}
        >
          2. Kiln Unloading / Nikasi (RAW ➔ FINISHED)
        </button>
      </div>

      {/* Dynamic Active Form */}
      {activeSubTab === 'PATHAI' ? (
        <form onSubmit={handlePathaiSubmit} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>📝 Raw Bricks Pathai Entry</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Laborer Group Account</label>
              <input type="text" value={pathaiData.laborer} onChange={e => setPathaiData({...pathaiData, laborer: e.target.value})} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Raw Bricks Made (NOS) *</label>
              <input type="number" placeholder="e.g. 5000" value={pathaiData.rawQty} onChange={e => setPathaiData({...pathaiData, rawQty: e.target.value})} style={inputStyle} required />
            </div>
          </div>
          <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            💾 Save Raw Stock Entry
          </button>
        </form>
      ) : (
        <form onSubmit={handleNikasiSubmit} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>🔥 Baked Bricks Nikasi Grading</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Furnace ID</label>
              <input type="text" value={nikasiData.furnaceId} onChange={e => setNikasiData({...nikasiData, furnaceId: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Raw Bricks Consumed (NOS) *</label>
              <input type="number" placeholder="e.g. 10000" value={nikasiData.rawConsumed} onChange={e => setNikasiData({...nikasiData, rawConsumed: e.target.value})} style={inputStyle} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Avval Grade (NOS)</label>
              <input type="number" placeholder="7000" value={nikasiData.avval} onChange={e => setNikasiData({...nikasiData, avval: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Doyam Grade (NOS)</label>
              <input type="number" placeholder="2000" value={nikasiData.doyam} onChange={e => setNikasiData({...nikasiData, doyam: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Roda Grade (NOS)</label>
              <input type="number" placeholder="1000" value={nikasiData.roda} onChange={e => setNikasiData({...nikasiData, roda: e.target.value})} style={inputStyle} />
            </div>
          </div>
          <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔄 Post Nikasi & Update Inventory
          </button>
        </form>
      )}

      {/* Live Inventory Status Table */}
      <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>📋 Live Stock Inventory Status</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #e2e8f0' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            <th style={thStyle}>Item Name</th>
            <th style={thStyle}>Stage</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Current Stock Qty</th>
          </tr>
        </thead>
        <tbody>
          {inventory.map((item, idx) => (
            <tr key={item.id || idx} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
              <td style={{ ...tdStyle, fontWeight: 'bold' }}>{item.item_name}</td>
              <td style={tdStyle}>{item.stage}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>
                {parseFloat(item.current_qty || 0).toLocaleString()} NOS
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
const thStyle = { padding: '10px', textAlign: 'left', fontWeight: 'bold' };
const tdStyle = { padding: '10px' };

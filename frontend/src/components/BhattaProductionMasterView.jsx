// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';

export default function BhattaProductionMasterView() {
  const [activeSubTab, setActiveSubTab] = useState('PATHAI');
  const [inventory, setInventory] = useState([]);
  const [accounts, setAccounts] = useState([]);

  // Pathai State
  const [pathaiQty, setPathaiQty] = useState('');
  const [ratePer1000, setRatePer1000] = useState('500');
  const [selectedLaborAcc, setSelectedLaborAcc] = useState('');

  // Nikasi State
  const [kachiUsedQty, setKachiUsedQty] = useState('');
  const [gradeAQty, setGradeAQty] = useState('');
  const [gradeBQty, setGradeBQty] = useState('');
  const [rodaQty, setRodaQty] = useState('');

  const loadData = () => {
    const inv = JSON.parse(localStorage.getItem('app_inventory') || '[]');
    const acc = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    setInventory(inv);
    setAccounts(acc);
    if (acc.length > 0) setSelectedLaborAcc(acc[0].id);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePathai = (e) => {
    e.preventDefault();
    const numericQty = parseFloat(pathaiQty || 0);
    if (numericQty <= 0) return alert("❌ Please enter a valid quantity.");

    const inv = JSON.parse(localStorage.getItem('app_inventory') || '[]');
    let kachiItemIndex = inv.findIndex(i => i.item_stage === 'RAW_KACHI' || i.name.includes('कच्ची'));

    if (kachiItemIndex === -1) {
      const newKachi = {
        id: `ITEM-KACHI-${Date.now()}`,
        name: 'कच्ची ईंट (Raw Unbaked Brick)',
        unit: 'NOS',
        item_stage: 'RAW_KACHI',
        current_qty: numericQty
      };
      inv.push(newKachi);
    } else {
      inv[kachiItemIndex].current_qty = parseFloat(inv[kachiItemIndex].current_qty || 0) + numericQty;
    }

    localStorage.setItem('app_inventory', JSON.stringify(inv));
    window.dispatchEvent(new Event('storage'));

    alert(`✓ Pathai labor entry saved! ${numericQty} Raw Bricks added to Inventory.`);
    setPathaiQty('');
    loadData();
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🧱 Brick Production & Kiln Transformation</h3>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveSubTab('PATHAI')} style={tabBtnStyle(activeSubTab === 'PATHAI')}>
          1. Pathai Labor & Raw Brick Stock (+ IN)
        </button>
        <button onClick={() => setActiveSubTab('NIKASI')} style={tabBtnStyle(activeSubTab === 'NIKASI')}>
          2. Kiln Unloading / Nikasi (RAW ➔ FINISHED)
        </button>
      </div>

      {activeSubTab === 'PATHAI' ? (
        <form onSubmit={handleSavePathai} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Select Labor Account *</label>
              <select value={selectedLaborAcc} onChange={e => setSelectedLaborAcc(e.target.value)} style={inputStyle}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Produced Raw Brick Qty *</label>
              <input type="number" placeholder="e.g. 10000" value={pathaiQty} onChange={e => setPathaiQty(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Rate (Per 1000 Bricks ₹) *</label>
              <input type="number" value={ratePer1000} onChange={e => setRatePer1000(e.target.value)} style={inputStyle} required />
            </div>
          </div>
          <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            💾 Save Pathai Entry & Increase Raw Stock
          </button>
        </form>
      ) : (
        <div style={{ color: '#64748b', fontSize: '13px' }}>
          Nikasi Transformation Module Active. Select Kiln Furnace ID to proceed.
        </div>
      )}

      <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '14px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>📋 Live Stock Inventory Status</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#fff' }}>
              <th style={thStyle}>Item Name</th>
              <th style={thStyle}>Stage</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Current Stock Qty</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item.id}>
                <td style={tdStyle}><strong>{item.name}</strong></td>
                <td style={tdStyle}>{item.item_stage || 'FINISHED'}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>{item.current_qty} {item.unit || 'NOS'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tabBtnStyle = (active) => ({
  padding: '10px 16px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: active ? '#2563eb' : '#e2e8f0',
  color: active ? '#fff' : '#0f172a',
  fontWeight: 'bold',
  cursor: 'pointer'
});
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };
const thStyle = { padding: '8px', textAlign: 'left', border: '1px solid #0f172a' };
const tdStyle = { padding: '8px', border: '1px solid #cbd5e1' };

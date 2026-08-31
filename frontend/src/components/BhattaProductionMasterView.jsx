// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getBrickKilnStock, 
  processNikasiTransformation, 
  clearAllDummyKilnData 
} from '../utils/productionEngine.js';

export default function BhattaProductionMasterView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [activeTab, setActiveTab] = useState('nikasi');
  const [stock, setStock] = useState({ RAW_KACHI: 0, PAKKI_AVVAL: 0, PAKKI_DOYAM: 0, PAKKI_RODA: 0 });

  // Nikasi Inputs (Clean Zero Defaults)
  const [furnaceId, setFurnaceId] = useState('KILN-1');
  const [rawConsumed, setRawConsumed] = useState('');
  const [avvalGrade, setAvvalGrade] = useState('');
  const [doyamGrade, setDoyamGrade] = useState('');
  const [rodaGrade, setRodaGrade] = useState('');

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState('');

  useEffect(() => {
    loadStockData();
    window.addEventListener('storage', loadStockData);
    return () => window.removeEventListener('storage', loadStockData);
  }, [firm]);

  const loadStockData = () => {
    setStock(getBrickKilnStock(activeFirmId));
  };

  const handlePostNikasi = (e) => {
    e.preventDefault();
    try {
      processNikasiTransformation(activeFirmId, {
        furnace_id: furnaceId,
        raw_consumed: rawConsumed,
        avval: avvalGrade || 0,
        doyam: doyamGrade || 0,
        roda: rodaGrade || 0
      });

      alert("✓ Nikasi posted successfully! Finished Bricks updated in stock.");
      setRawConsumed('');
      setAvvalGrade('');
      setDoyamGrade('');
      setRodaGrade('');
      loadStockData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveStockEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;

    const newStockVal = parseInt(editQty || 0, 10);
    const updatedStock = { ...stock, [editingItem.key]: newStockVal };
    
    localStorage.setItem(`app_brick_stock_${activeFirmId}`, JSON.stringify(updatedStock));
    window.dispatchEvent(new Event('storage'));
    
    alert(`✓ Stock for ${editingItem.name} updated to ${newStockVal} NOS.`);
    setEditingItem(null);
    loadStockData();
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🧱 Brick Production & Kiln Transformation</h3>
        <button 
          onClick={() => { if(window.confirm("Clear all dummy stock data?")) { clearAllDummyKilnData(activeFirmId); loadStockData(); } }}
          style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🗑️ Clear Demo Data
        </button>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <button style={subTabStyle(activeTab === 'pathai')} onClick={() => setActiveTab('pathai')}>
          1. Pathai Labor & Raw Brick Stock (+ IN)
        </button>
        <button style={subTabStyle(activeTab === 'nikasi')} onClick={() => setActiveTab('nikasi')}>
          2. Kiln Unloading / Nikasi (RAW ➔ FINISHED)
        </button>
      </div>

      {/* Inline Edit Modal */}
      {editingItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <form onSubmit={handleSaveStockEdit} style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', maxWidth: '380px', width: '100%', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>✏️ Edit Stock Inventory Quantity</h4>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Item: <strong>{editingItem.name}</strong></p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>New Current Stock (NOS/Qty)</label>
              <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} style={inputStyle} required />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditingItem(null)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>Update Stock</button>
            </div>
          </form>
        </div>
      )}

      {/* Nikasi Form */}
      {activeTab === 'nikasi' && (
        <form onSubmit={handlePostNikasi} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>🔥 Baked Bricks Nikasi Grading</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Furnace ID</label>
              <input type="text" value={furnaceId} onChange={e => setFurnaceId(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Raw Bricks Consumed (NOS) *</label>
              <input type="number" placeholder="e.g. 10000" value={rawConsumed} onChange={e => setRawConsumed(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Avval Grade (NOS)</label>
              <input type="number" placeholder="Avval Qty" value={avvalGrade} onChange={e => setAvvalGrade(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Doyam Grade (NOS)</label>
              <input type="number" placeholder="Doyam Qty" value={doyamGrade} onChange={e => setDoyamGrade(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Roda Grade (NOS)</label>
              <input type="number" placeholder="Roda Qty" value={rodaGrade} onChange={e => setRodaGrade(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button type="submit" style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            🔄 Post Nikasi & Update Inventory
          </button>
        </form>
      )}

      {/* Stock Table View */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
          📋 Live Stock Inventory Status (Click Edit to Adjust)
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Stage</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Current Stock Qty</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>कच्ची ईंट (Raw Unbaked Brick)</td>
              <td style={{ padding: '10px', textAlign: 'center' }}><span style={badgeStyle('#fed7aa', '#9a3412')}>RAW_KACHI</span></td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>{stock.RAW_KACHI} NOS</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button onClick={() => { setEditingItem({ key: 'RAW_KACHI', name: 'Raw Brick' }); setEditQty(stock.RAW_KACHI); }} style={editBtnStyle}>✏️ Edit</button>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>पक्की ईंट (Avval Grade A)</td>
              <td style={{ padding: '10px', textAlign: 'center' }}><span style={badgeStyle('#bbf7d0', '#166534')}>FINISHED_AVVAL</span></td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stock.PAKKI_AVVAL} NOS</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button onClick={() => { setEditingItem({ key: 'PAKKI_AVVAL', name: 'Avval Grade' }); setEditQty(stock.PAKKI_AVVAL); }} style={editBtnStyle}>✏️ Edit</button>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>पक्की ईंट (Doyam Grade B)</td>
              <td style={{ padding: '10px', textAlign: 'center' }}><span style={badgeStyle('#e0e7ff', '#3730a3')}>FINISHED_DOYAM</span></td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stock.PAKKI_DOYAM} NOS</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button onClick={() => { setEditingItem({ key: 'PAKKI_DOYAM', name: 'Doyam Grade' }); setEditQty(stock.PAKKI_DOYAM); }} style={editBtnStyle}>✏️ Edit</button>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>रोड़ा ईंट (Roda Grade C)</td>
              <td style={{ padding: '10px', textAlign: 'center' }}><span style={badgeStyle('#fecdd3', '#9f1239')}>FINISHED_RODA</span></td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{stock.PAKKI_RODA} NOS</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                <button onClick={() => { setEditingItem({ key: 'PAKKI_RODA', name: 'Roda Grade' }); setEditQty(stock.PAKKI_RODA); }} style={editBtnStyle}>✏️ Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

const subTabStyle = (isActive) => ({
  backgroundColor: isActive ? '#2563eb' : '#e2e8f0',
  color: isActive ? '#ffffff' : '#334155',
  border: 'none',
  padding: '10px',
  borderRadius: '6px',
  fontWeight: 'bold',
  fontSize: '11px',
  cursor: 'pointer'
});

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };
const badgeStyle = (bg, color) => ({ backgroundColor: bg, color, padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' });
const editBtnStyle = { backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' };

// frontend/src/components/BrickKilnProductionView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getBrickKilnStock, 
  getKilnSettings, 
  updateDefaultBrickWeight,
  calculateSoilTons,
  processPathaiProductionEntry, 
  clearBrickKilnData 
} from '../utils/brickKilnEngine.js';

export default function BrickKilnProductionView({ firm }) {
  const activeFirmId = firm?.id;

  const [stock, setStock] = useState({ RAW_KACHI: 0, RAW_SOIL_TONS: 0 });
  const [settings, setSettings] = useState({ default_brick_weight_kg: 3.2, soil_waste_percentage: 2.0 });

  // Form Controls
  const [laborerName, setLaborerName] = useState('Ramesh Labor Group');
  const [rawBricksCount, setRawBricksCount] = useState('');
  const [unitWeightKg, setUnitWeightKg] = useState('3.2');
  const [pathaiRate, setPathaiRate] = useState('400');

  // Weight Edit Confirmation Modal State
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [tempNewWeight, setTempNewWeight] = useState('');

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [firm]);

  const loadData = () => {
    const activeSettings = getKilnSettings(activeFirmId);
    setStock(getBrickKilnStock(activeFirmId));
    setSettings(activeSettings);
    setUnitWeightKg(activeSettings.default_brick_weight_kg.toString());
  };

  const estimatedSoilTons = calculateSoilTons(rawBricksCount, unitWeightKg, settings.soil_waste_percentage);
  const calculatedWages = ((parseFloat(rawBricksCount || 0) / 1000) * parseFloat(pathaiRate || 0)).toFixed(2);

  const handleSavePathai = (e) => {
    e.preventDefault();
    try {
      processPathaiProductionEntry(activeFirmId, {
        laborer_name: laborerName,
        raw_bricks_count: rawBricksCount,
        unit_weight_kg: unitWeightKg,
        rate_per_1000: pathaiRate
      });
      alert(`✓ Pathai entry saved! ${rawBricksCount} Raw Bricks created (${unitWeightKg} kg/brick). Deducted ${estimatedSoilTons} Tons of Clay stock.`);
      setRawBricksCount('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const triggerWeightEdit = () => {
    setTempNewWeight(unitWeightKg);
    setShowWeightModal(true);
  };

  const handleConfirmWeightChange = (applyRetrospective) => {
    updateDefaultBrickWeight(activeFirmId, tempNewWeight, applyRetrospective);
    alert(
      applyRetrospective 
        ? `✓ New weight (${tempNewWeight} kg) applied to ALL past and future records!`
        : `✓ New weight (${tempNewWeight} kg) set for FUTURE entries only.`
    );
    setShowWeightModal(false);
    loadData();
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🧱 Brick Kiln Manual Weight & Soil Engine</h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firm?.legal_name || 'Aa (BRICK_KILN)'}</span>
        </div>

        <button
          onClick={() => { if(window.confirm("Clear kiln stock data?")) { clearBrickKilnData(activeFirmId); loadData(); } }}
          style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🗑️ Clear Data
        </button>
      </div>

      {/* Weight Change Decision Modal Overlay */}
      {showWeightModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', maxWidth: '420px', width: '100%', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>⚖️ Confirm Brick Weight Update</h4>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
              Aap <strong>1 Brick ka weight {tempNewWeight} kg</strong> update kar rahe hain. Iska prabhav kis par padna chahiye?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => handleConfirmWeightChange(false)}
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
              >
                1. ➡️ Sirf Aage Se (Future Entries Only)
                <div style={{ fontSize: '10px', fontWeight: 'normal', opacity: 0.9 }}>Purana stock aur data waisa hi rahega.</div>
              </button>

              <button
                onClick={() => handleConfirmWeightChange(true)}
                style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}
              >
                2. 🔄 Purani Aur Aage Ki Sabhi Entries Par (Retrospective)
                <div style={{ fontSize: '10px', fontWeight: 'normal', opacity: 0.9 }}>Pichhle sabhi pathai records ka mitti vajan fir se calculate hoga.</div>
              </button>

              <button
                onClick={() => setShowWeightModal(false)}
                style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pathai Form with Manual Weight Input */}
      <form onSubmit={handleSavePathai} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1e293b' }}>📝 Raw Bricks Pathai & Manual Weight Input</div>

        <div>
          <label style={labelStyle}>Laborer Group / Contractor Account *</label>
          <input type="text" value={laborerName} onChange={e => setLaborerName(e.target.value)} style={inputStyle} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Raw Bricks Made (NOS) *</label>
            <input type="number" placeholder="e.g. 10000" value={rawBricksCount} onChange={e => setRawBricksCount(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={labelStyle}>1 Brick Wt (Kg) *</label>
              <button type="button" onClick={triggerWeightEdit} style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>⚙️ Set Default</button>
            </div>
            <input type="number" step="0.1" value={unitWeightKg} onChange={e => setUnitWeightKg(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Pathai Wage (₹ / 1000 NOS)</label>
            <input type="number" value={pathaiRate} onChange={e => setPathaiRate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* Live Calculation Output Card */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', color: '#1e40af' }}>
          <div><strong>Calculated Soil Consumed:</strong> <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>{estimatedSoilTons} Tons</span></div>
          <div><strong>Total Wages Payable:</strong> <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8' }}>₹{calculatedWages}</span></div>
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
          💾 Save Pathai & Deduct Mud Stock (-OUT)
        </button>
      </form>

      {/* Live Stock Matrix */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
          📋 Live Inventory Stock Balance
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Item Name</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Stage</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fefce8' }}>
              <td style={{ padding: '10px', fontWeight: 'bold', color: '#854d0e' }}>🌱 कच्ची मिट्टी (Raw Clay / Mud)</td>
              <td style={{ padding: '10px', textAlign: 'center' }}><span style={{ backgroundColor: '#fef08a', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#713f12' }}>RAW_MATERIAL</span></td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: stock.RAW_SOIL_TONS > 0 ? '#059669' : '#dc2626' }}>{stock.RAW_SOIL_TONS} Tons</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>कच्ची ईंट (Raw Unbaked Brick)</td>
              <td style={{ padding: '10px', textAlign: 'center' }}><span style={{ backgroundColor: '#fed7aa', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', color: '#9a3412' }}>RAW_KACHI</span></td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: stock.RAW_KACHI > 0 ? '#059669' : '#64748b' }}>{stock.RAW_KACHI} NOS</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

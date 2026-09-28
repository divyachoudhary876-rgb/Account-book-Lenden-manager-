// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function BhattaProductionMasterView({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const storageKey = `bhatta_production_${firmId}_${selectedFY}`;
  const stockStorageKey = `trading_catalog_${firmId}_${selectedFY}`;

  const [batches, setBatches] = useState([]);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchRef, setBatchRef] = useState('');
  
  // Inventory items for raw material consumption
  const [stockItems, setStockItems] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [consumedList, setConsumedList] = useState([]);

  // Costs & Output
  const [directLabor, setDirectLabor] = useState('');
  const [machineryOverhead, setMachineryOverhead] = useState('');
  const [outputItemName, setOutputItemName] = useState('Pakki Eent (Number 1)');
  const [producedQty, setProducedQty] = useState('');

  useEffect(() => {
    try {
      const savedBatches = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(savedBatches)) setBatches(savedBatches);

      const savedCatalog = StorageService.getItem ? StorageService.getItem(stockStorageKey) : JSON.parse(localStorage.getItem(stockStorageKey) || '[]');
      if (Array.isArray(savedCatalog)) setStockItems(savedCatalog);
    } catch (e) {
      console.error("Error loading production data:", e);
    }
  }, [storageKey, stockStorageKey]);

  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQty || Number(materialQty) <= 0) {
      alert("Kripya valid raw material aur quantity chunein!");
      return;
    }

    const itemObj = stockItems.find(i => i.id === selectedMaterial || i.itemName === selectedMaterial);
    const itemName = itemObj ? itemObj.itemName : selectedMaterial;
    const unitCost = itemObj ? (itemObj.purchasePrice || itemObj.sellingPrice || 0) : 0;
    const qty = Number(materialQty) || 0;

    const newItem = {
      id: 'MAT-' + Date.now(),
      itemName,
      qty,
      unitCost,
      totalCost: qty * unitCost
    };

    setConsumedList([...consumedList, newItem]);
    setSelectedMaterial('');
    setMaterialQty('');
  };

  const handleRemoveMaterial = (id) => {
    setConsumedList(consumedList.filter(m => m.id !== id));
  };

  // Calculations
  const totalMaterialCost = consumedList.reduce((sum, m) => sum + m.totalCost, 0);
  const laborCostNum = Number(directLabor) || 0;
  const overheadNum = Number(machineryOverhead) || 0;
  const totalProductionCost = totalMaterialCost + laborCostNum + overheadNum;
  
  const producedQtyNum = Number(producedQty) || 0;
  const costPerPiece = producedQtyNum > 0 ? (totalProductionCost / producedQtyNum) : 0;
  const costPerThousand = costPerPiece * 1000; // Per 1,000 Bricks calculation

  const handleSaveProduction = (e) => {
    e.preventDefault();
    if (!batchRef || producedQtyNum <= 0) {
      alert("Kripya Batch/Chamber Ref aur Produced Qty (Quantity) sahi se bharein!");
      return;
    }

    const newBatch = {
      id: 'PROD-' + Date.now(),
      productionDate,
      batchRef,
      consumedList,
      totalMaterialCost,
      directLabor: laborCostNum,
      machineryOverhead: overheadNum,
      totalProductionCost,
      outputItemName,
      producedQty: producedQtyNum,
      costPerPiece: Number(costPerPiece.toFixed(4)),
      costPerThousand: Number(costPerThousand.toFixed(2)),
      selectedFY
    };

    const updated = [newBatch, ...batches];
    setBatches(updated);
    StorageService.setItem(storageKey, updated);
    window.dispatchEvent(new Event('app_storage_updated'));

    // Reset Form
    setBatchRef('');
    setConsumedList([]);
    setDirectLabor('');
    setMachineryOverhead('');
    setProducedQty('');
    alert("✓ Production batch & Cost Valuation successfully recorded!");
  };

  const handleDelete = (id) => {
    if (window.confirm("Kya aap is production record ko delete karna chahte hain?")) {
      const updated = batches.filter(b => b.id !== id);
      setBatches(updated);
      StorageService.setItem(storageKey, updated);
      window.dispatchEvent(new Event('app_storage_updated'));
    }
  };

  return (
    <div style={{ padding: '10px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚙️ Smart Production & Auto-Valuation ({selectedFY})
        </h3>

        <form onSubmit={handleSaveProduction}>
          {/* Basic Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Production Date *</label>
              <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Batch / Chamber Ref *</label>
              <input type="text" value={batchRef} onChange={e => setBatchRef(e.target.value)} placeholder="e.g. CHAMBER-1254" style={inputStyle} required />
            </div>
          </div>

          {/* Step 1: Raw Materials */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '6px' }}>
              🔥 Step 1: Consumed Raw Materials & Fuels
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'end' }}>
              <div>
                <select value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)} style={inputStyle}>
                  <option value="">-- Select Raw Material / Fuel --</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>{item.itemName} (Stock: {item.stockQty} {item.unit})</option>
                  ))}
                  <option value="Manual Coal / Petcoke">Manual Coal / Petcoke</option>
                  <option value="Manual Diesel">Manual Diesel</option>
                </select>
              </div>
              <div>
                <input type="number" value={materialQty} onChange={e => setMaterialQty(e.target.value)} placeholder="Quantity" style={inputStyle} />
              </div>
              <div>
                <button type="button" onClick={handleAddMaterial} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
                  + Add
                </button>
              </div>
            </div>

            {consumedList.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '11px', backgroundColor: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                {consumedList.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #fef3c7' }}>
                    <span>{m.itemName} (Qty: {m.qty})</span>
                    <span>₹{m.totalCost} <button type="button" onClick={() => handleRemoveMaterial(m.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button></span>
                  </div>
                ))}
                <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: '4px', color: '#b45309' }}>
                  Total Material Cost: ₹{totalMaterialCost}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Labor & Overheads */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#15803d', display: 'block', marginBottom: '6px' }}>
              👷 Step 2: Direct Labor & Overheads
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#374155' }}>Direct Labor Cost (₹)</label>
                <input type="number" value={directLabor} onChange={e => setDirectLabor(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#374155' }}>Machinery & Overheads (₹)</label>
                <input type="number" value={machineryOverhead} onChange={e => setMachineryOverhead(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: '8px', color: '#15803d', fontSize: '12px' }}>
              Total Production Cost: ₹{totalProductionCost}
            </div>
          </div>

          {/* Step 3: Output & Valuation */}
          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#0369a1', display: 'block', marginBottom: '6px' }}>
              📦 Step 3: Output Finished Product & Auto Valuation
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#374155' }}>Output Item Name</label>
                <input type="text" value={outputItemName} onChange={e => setOutputItemName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#374155' }}>Produced Qty (Pcs) *</label>
                <input type="number" value={producedQty} onChange={e => setProducedQty(e.target.value)} placeholder="e.g. 30000" style={inputStyle} required />
              </div>
            </div>

            {producedQtyNum > 0 && (
              <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #7dd3fc', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>Cost Per Piece</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a' }}>₹{costPerPiece.toFixed(2)}</div>
                </div>
                <div style={{ width: '1px', height: '24px', backgroundColor: '#cbd5e1' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>Cost Per 1,000 Bricks (Per Hazaar)</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7' }}>₹{costPerThousand.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '13px' }}>
            ⚡ Save Production & Update Cost Valuation
          </button>
        </form>
      </div>

      {/* Production Register Table */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#334155' }}>Production Batches Register ({selectedFY})</h4>
        {batches.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '12px' }}>Koi production record darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px' }}>Date / Chamber</th>
                  <th style={{ padding: '8px' }}>Output Qty</th>
                  <th style={{ padding: '8px' }}>Total Cost</th>
                  <th style={{ padding: '8px' }}>Cost / 1,000 Bricks</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{b.productionDate}<br /><strong>{b.batchRef}</strong></td>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{b.producedQty} Pcs</td>
                    <td style={{ padding: '8px', color: '#b45309' }}>₹{b.totalProductionCost}</td>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#0284c7' }}>₹{b.costPerThousand?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(b.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
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
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '12px',
  boxSizing: 'border-box',
  marginTop: '4px'
};

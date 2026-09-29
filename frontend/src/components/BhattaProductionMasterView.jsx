// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function BhattaProductionMasterView({ firm, selectedFY }) {
  const firmId = firm?.id || 'FIRM-001';
  const storageKey = `bhatta_production_${firmId}_${selectedFY}`;
  const stockStorageKey = `trading_catalog_${firmId}_${selectedFY}`;

  const [batches, setBatches] = useState([]);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [usesFor, setUsesFor] = useState('');
  
  const [stockItems, setStockItems] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [consumedList, setConsumedList] = useState([]);

  const [directLabor, setDirectLabor] = useState('');
  const [machineryOverhead, setMachineryOverhead] = useState('');
  const [outputItem, setOutputItem] = useState('');
  const [producedQty, setProducedQty] = useState('');

  useEffect(() => {
    try {
      const savedBatches = StorageService.getItem ? StorageService.getItem(storageKey) : JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(savedBatches)) setBatches(savedBatches);

      let catalog = StorageService.getItem ? StorageService.getItem(stockStorageKey) : JSON.parse(localStorage.getItem(stockStorageKey) || '[]');
      if (!catalog || catalog.length === 0) {
        catalog = JSON.parse(localStorage.getItem(`trading_catalog_${firmId}`) || localStorage.getItem('inventory_catalog') || '[]');
      }
      if (Array.isArray(catalog)) setStockItems(catalog);
    } catch (e) {
      console.error("Error loading production data:", e);
    }
  }, [storageKey, stockStorageKey, firmId]);

  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQty || Number(materialQty) <= 0) {
      alert("Kripya inventory me se raw material aur valid quantity chunein!");
      return;
    }

    const itemObj = stockItems.find(i => i.id === selectedMaterial || i.itemName === selectedMaterial);
    if (!itemObj) {
      alert("Chuna gaya item inventory catalog me nahi mila!");
      return;
    }

    const itemName = itemObj.itemName || itemObj.name;
    const unitCost = itemObj.purchasePrice || itemObj.sellingPrice || 0;
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

  const totalMaterialCost = consumedList.reduce((sum, m) => sum + m.totalCost, 0);
  const laborCostNum = Number(directLabor) || 0;
  const overheadNum = Number(machineryOverhead) || 0;
  const totalProductionCost = totalMaterialCost + laborCostNum + overheadNum;
  
  const producedQtyNum = Number(producedQty) || 0;
  const costPerPiece = producedQtyNum > 0 ? (totalProductionCost / producedQtyNum) : 0;
  const costPerThousand = costPerPiece * 1000;

  const handleSaveProduction = (e) => {
    e.preventDefault();
    if (!usesFor || !outputItem || producedQtyNum <= 0) {
      alert("Kripya 'Uses For', Output Item aur Produced Qty sahi se bharein!");
      return;
    }

    const selectedOutputObj = stockItems.find(i => i.id === outputItem || i.itemName === outputItem);
    const outputItemName = selectedOutputObj ? (selectedOutputObj.itemName || selectedOutputObj.name) : outputItem;

    const newBatch = {
      id: 'PROD-' + Date.now(),
      productionDate,
      usesFor,
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

    setUsesFor('');
    setConsumedList([]);
    setDirectLabor('');
    setMachineryOverhead('');
    setOutputItem('');
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
    <div style={{ padding: '8px', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ⚙️ Smart Production & Auto-Valuation ({selectedFY})
        </h3>

        <form onSubmit={handleSaveProduction}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Production Date *</label>
              <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} style={inputStyle} required />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>Uses For (Kaha use hua h) *</label>
              <input type="text" value={usesFor} onChange={e => setUsesFor(e.target.value)} placeholder="e.g. Chamber-1 / Batch-A" style={inputStyle} required />
            </div>
          </div>

          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#b45309', display: 'block', marginBottom: '6px' }}>
              🔥 Step 1: Consumed Raw Materials & Fuels (From Inventory)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '6px', alignItems: 'end' }}>
              <div>
                <select value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)} style={inputStyle}>
                  <option value="">-- Select Inventory Item ({stockItems.length}) --</option>
                  {stockItems.map(item => (
                    <option key={item.id || item.itemName} value={item.id || item.itemName}>
                      {item.itemName || item.name} (Stock: {item.stockQty ?? item.qty ?? 0} {item.unit || ''})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <input type="number" value={materialQty} onChange={e => setMaterialQty(e.target.value)} placeholder="Qty" style={inputStyle} />
              </div>
              <div>
                <button type="button" onClick={handleAddMaterial} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '8px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
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

          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#15803d', display: 'block', marginBottom: '6px' }}>
              👷 Step 2: Direct Labor & Overheads
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Direct Labor Cost (₹)</label>
                <input type="number" value={directLabor} onChange={e => setDirectLabor(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Machinery & Overheads (₹)</label>
                <input type="number" value={machineryOverhead} onChange={e => setMachineryOverhead(e.target.value)} placeholder="0" style={inputStyle} />
              </div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: '6px', color: '#15803d', fontSize: '11px' }}>
              Total Production Cost: ₹{totalProductionCost}
            </div>
          </div>

          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '10px', borderRadius: '8px', marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#0369a1', display: 'block', marginBottom: '6px' }}>
              📦 Step 3: Output Finished Product & Auto Valuation
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Output Item (From Inventory) *</label>
                <select value={outputItem} onChange={e => setOutputItem(e.target.value)} style={inputStyle} required>
                  <option value="">-- Select Output Item --</option>
                  {stockItems.map(item => (
                    <option key={item.id || item.itemName} value={item.id || item.itemName}>{item.itemName || item.name} ({item.unit || ''})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#374155' }}>Produced Qty *</label>
                <input type="number" value={producedQty} onChange={e => setProducedQty(e.target.value)} placeholder="e.g. 30000" style={inputStyle} required />
              </div>
            </div>

            {producedQtyNum > 0 && (
              <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '6px', border: '1px solid #7dd3fc', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>Cost Per Piece</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>₹{costPerPiece.toFixed(2)}</div>
                </div>
                <div style={{ width: '1px', height: '22px', backgroundColor: '#cbd5e1' }}></div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>Cost Per 1,000 Units</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7' }}>₹{costPerThousand.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px' }}>
            ⚡ Save Production & Update Cost Valuation
          </button>
        </form>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '14px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#334155' }}>Production Batches Register ({selectedFY})</h4>
        {batches.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '11px' }}>Koi production record darj nahi hai.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '6px' }}>Date / Uses For</th>
                  <th style={{ padding: '6px' }}>Output Item & Qty</th>
                  <th style={{ padding: '6px' }}>Total Cost</th>
                  <th style={{ padding: '6px' }}>Cost / 1,000</th>
                  <th style={{ padding: '6px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{b.productionDate}<br /><strong>{b.usesFor || b.batchRef}</strong></td>
                    <td style={{ padding: '6px' }}><strong>{b.outputItemName}</strong><br />{b.producedQty} Pcs</td>
                    <td style={{ padding: '6px', color: '#b45309' }}>₹{b.totalProductionCost}</td>
                    <td style={{ padding: '6px', fontWeight: 'bold', color: '#0284c7' }}>₹{b.costPerThousand?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <button onClick={() => handleDelete(b.id)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
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

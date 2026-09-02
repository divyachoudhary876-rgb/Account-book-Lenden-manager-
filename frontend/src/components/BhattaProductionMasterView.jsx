// frontend/src/components/BhattaProductionMasterView.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { executeProductionBatch } from '../utils/manufacturingEngine.js';

export default function BhattaProductionMasterView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [stockList, setStockList] = useState([]);
  const [finishedItem, setFinishedItem] = useState('');
  const [customFinishedItem, setCustomFinishedItem] = useState('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);

  const [producedQuantity, setProducedQuantity] = useState('');
  const [batchRef, setBatchRef] = useState(`CHAMBER-${new Date().getDate()}-${Date.now().toString().slice(-3)}`);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [laborCost, setLaborCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');
  
  const [consumedMaterials, setConsumedMaterials] = useState([
    { item_name: 'Coal / Steam Coal', quantity: '' },
    { item_name: 'Diesel', quantity: '' }
  ]);

  const [status, setStatus] = useState(null);

  const loadStock = () => {
    const list = getStockItemsByFirm(activeFirmId);
    setStockList(list);

    // Auto-select preferred finished good if available
    const fgCandidate = list.find(i => 
      i.item_name.toLowerCase().includes('eent') || 
      i.item_name.toLowerCase().includes('brick') ||
      i.item_name.toLowerCase().includes('briquette') ||
      parseFloat(i.selling_price || 0) > 0
    );

    if (fgCandidate) {
      setFinishedItem(fgCandidate.item_name);
    } else if (list.length > 0) {
      setFinishedItem(list[0].item_name);
    }
  };

  useEffect(() => {
    loadStock();
    window.addEventListener('stock_updated', loadStock);
    return () => window.removeEventListener('stock_updated', loadStock);
  }, [activeFirmId]);

  const handleFinishedItemDropdownChange = (val) => {
    if (val === 'ADD_CUSTOM') {
      setIsCustomProduct(true);
      setCustomFinishedItem('');
    } else {
      setIsCustomProduct(false);
      setFinishedItem(val);
    }
  };

  const handleMaterialChange = (index, field, value) => {
    const updated = [...consumedMaterials];
    updated[index][field] = value;
    setConsumedMaterials(updated);
  };

  const addMaterialRow = () => {
    setConsumedMaterials([...consumedMaterials, { item_name: stockList[0]?.item_name || 'Diesel', quantity: '' }]);
  };

  const removeMaterialRow = (index) => {
    if (consumedMaterials.length <= 1) return;
    setConsumedMaterials(consumedMaterials.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    const finalFinishedProduct = isCustomProduct ? customFinishedItem.trim() : finishedItem.trim();
    if (!finalFinishedProduct) {
      setStatus({ type: 'error', text: 'Output finished product select ya enter karein.' });
      return;
    }

    const validMaterials = consumedMaterials.filter(m => parseFloat(m.quantity || 0) > 0);
    if (validMaterials.length === 0) {
      setStatus({ type: 'error', text: 'Kam se kam ek raw material ki quantity enter karein.' });
      return;
    }

    try {
      const res = executeProductionBatch(activeFirmId, {
        production_date: productionDate,
        batch_ref: batchRef,
        finished_item_name: finalFinishedProduct,
        finished_quantity: parseFloat(producedQuantity),
        raw_materials: validMaterials,
        labor_cost: parseFloat(laborCost || 0),
        other_overhead: parseFloat(overheadCost || 0)
      });

      setStatus({
        type: 'success',
        text: `✓ Production Successful!\n• Output: ${res.produced_quantity.toLocaleString()} units of ${res.produced_item}\n• Total Cost: ₹${res.total_cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n• Cost/Unit: ₹${res.per_unit_cost.toFixed(2)}/unit\n• Raw materials deducted from stock.`
      });

      setProducedQuantity('');
      setLaborCost('');
      setOverheadCost('');
      if (isCustomProduct) setIsCustomProduct(false);
      loadStock();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '30px' }}>
      
      {/* Header Banner */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            Production & Raw Material Conversion
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Convert Raw Materials & Fuel into Finished Goods</span>
        </div>
        <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
          Manufacturing Core
        </div>
      </div>

      {status && (
        <div style={{
          backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'pre-line'
        }}>
          {status.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        {/* Date and Batch Reference */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Production Date *</label>
            <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Batch / Chamber Reference *</label>
            <input type="text" value={batchRef} onChange={e => setBatchRef(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* 1. OUTPUT FINISHED PRODUCT (DYNAMIC DROPDOWN LIST) */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px', borderRadius: '12px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ ...labelStyle, color: '#166534' }}>Output Finished Product (तैयार माल) *</label>
            {!isCustomProduct ? (
              <select
                value={finishedItem}
                onChange={e => handleFinishedItemDropdownChange(e.target.value)}
                style={{ ...inputStyle, fontWeight: 'bold', backgroundColor: '#ffffff' }}
                required
              >
                {stockList.map(item => (
                  <option key={item.id} value={item.item_name}>
                    {item.item_name} (Current: {item.current_stock} {item.unit})
                  </option>
                ))}
                <option value="ADD_CUSTOM">➕ + Type New Product Name...</option>
              </select>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Type new finished item..."
                  value={customFinishedItem}
                  onChange={e => setCustomFinishedItem(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: '#ffffff', fontWeight: 'bold' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsCustomProduct(false)}
                  style={{ backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '0 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  List
                </button>
              </div>
            )}
          </div>

          <div>
            <label style={{ ...labelStyle, color: '#166534' }}>Produced Quantity *</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 50000"
              value={producedQuantity}
              onChange={e => setProducedQuantity(e.target.value)}
              style={{ ...inputStyle, fontSize: '14px', fontWeight: 'bold', backgroundColor: '#ffffff' }}
              required
            />
          </div>
        </div>

        {/* Consumed Raw Materials List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ ...labelStyle, fontSize: '12px', color: '#0f172a' }}>
              Consumed Raw Materials & Fuels (खपत होने वाला कच्चा माल)
            </label>
            <button type="button" onClick={addMaterialRow} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
              + Add Material
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {consumedMaterials.map((row, idx) => {
              const matched = stockList.find(s => s.item_name === row.item_name);
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr auto', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={row.item_name}
                    onChange={e => handleMaterialChange(idx, 'item_name', e.target.value)}
                    style={{ ...inputStyle, fontWeight: 'bold' }}
                  >
                    {stockList.map(s => (
                      <option key={s.id} value={s.item_name}>
                        {s.item_name} (Avail: {s.current_stock} {s.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Qty (${matched?.unit || 'Units'})`}
                    value={row.quantity}
                    onChange={e => handleMaterialChange(idx, 'quantity', e.target.value)}
                    style={inputStyle}
                    required
                  />

                  {consumedMaterials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaterialRow(idx)}
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', width: '32px', height: '36px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Overheads */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Direct Labor / Pathai Cost (₹)</label>
            <input type="number" step="0.01" placeholder="e.g. 15000" value={laborCost} onChange={e => setLaborCost(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Machinery & Overheads (₹)</label>
            <input type="number" step="0.01" placeholder="e.g. 5000" value={overheadCost} onChange={e => setOverheadCost(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button
          type="submit"
          style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.3)' }}
        >
          ⚡ Deduct Raw Materials & Add Finished Stock
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };

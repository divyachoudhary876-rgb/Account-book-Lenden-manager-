// frontend/src/components/BhattaProductionMasterView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import SearchableStockDropdown from './SearchableStockDropdown';

export default function BhattaProductionMasterView({ firm, onClose }) {
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchRef, setBatchRef] = useState(`CHAMBER-${Math.floor(1000 + Math.random() * 9000)}`);
  const [stockItems, setStockItems] = useState([]);
  
  const [selectedOutput, setSelectedOutput] = useState('');
  const [producedQty, setProducedQty] = useState('');
  const [laborCost, setLaborCost] = useState('0');
  const [overheadCost, setOverheadCost] = useState('0');
  
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [consumedQty, setConsumedQty] = useState('');
  const [materialCart, setMaterialCart] = useState([]);
  
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [batchesList, setBatchesList] = useState([]);

  const loadData = () => {
    if (!firm) return;
    try {
      let savedStock = loadFirmData('app_inventory', firm, []);
      const savedBatches = loadFirmData('app_production_batches', firm, []);

      // केवल पहली बार डिफ़ॉल्ट सीडिंग करें यदि स्टॉक बिल्कुल खाली हो
      if (!savedStock || savedStock.length === 0) {
        savedStock = [
          { id: 'm_1', name: 'Mitti (मिट्टी)', stock_qty: 5000, type: 'raw' },
          { id: 'm_2', name: 'Coal (कोयला - Fuel)', stock_qty: 2000, type: 'raw' },
          { id: 'm_3', name: 'Biomass Briquette (ब्रिकेट)', stock_qty: 10000, type: 'raw' },
          { id: 'f_1', name: 'Phedi / Raw Bricks (कच्ची ईंट)', stock_qty: 50000, type: 'finished' },
          { id: 'f_2', name: 'A-Class Pakka Bricks (पक्की ईंट)', stock_qty: 25000, type: 'finished' }
        ];
        saveFirmData('app_inventory', firm, savedStock);
      }

      setStockItems(savedStock);
      setBatchesList(savedBatches);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, [firm]);

  const handleAddMaterialToCart = () => {
    setErrorMsg(null);
    if (!selectedMaterial) {
      setErrorMsg('Please select a raw material/fuel.');
      return;
    }
    const qtyNum = Number(consumedQty);
    if (!qtyNum || qtyNum <= 0) {
      setErrorMsg('Please enter a valid consumption quantity.');
      return;
    }

    const materialObj = stockItems.find(m => (m.name || m.item_name) === selectedMaterial);
    const availableStock = Number(materialObj?.stock_qty || materialObj?.quantity || 0);

    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Insufficient stock for "${selectedMaterial}". Available: ${availableStock}`);
      return;
    }

    setMaterialCart([...materialCart, { id: materialObj?.id || Math.random().toString(), name: selectedMaterial, qty: qtyNum }]);
    setSelectedMaterial('');
    setConsumedQty('');
  };

  const handleProcessProduction = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedOutput) {
      setErrorMsg('Please select an output finished product.');
      return;
    }
    if (!producedQty || Number(producedQty) <= 0) {
      setErrorMsg('Please enter valid produced quantity.');
      return;
    }
    if (materialCart.length === 0) {
      setErrorMsg('Please add at least one consumed raw material.');
      return;
    }

    const newBatch = {
      id: 'BATCH-' + Date.now(),
      date: productionDate,
      batch_ref: batchRef,
      output_item: selectedOutput,
      produced_qty: Number(producedQty),
      labor_cost: Number(laborCost) || 0,
      overhead_cost: Number(overheadCost) || 0,
      consumed_materials: materialCart,
      timestamp: new Date().toISOString()
    };

    const updatedBatches = [newBatch, ...batchesList];
    setBatchesList(updatedBatches);
    saveFirmData('app_production_batches', firm, updatedBatches);

    setSuccessMsg(`✓ Production Batch ${batchRef} successfully recorded!`);
    setBatchRef(`CHAMBER-${Math.floor(1000 + Math.random() * 9000)}`);
    setProducedQty('');
    setMaterialCart([]);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '8px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
            Firm: {firm?.legal_name || firm?.name || 'Active Firm'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>⚙️ Production & Raw Material Conversion</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46' }}>{successMsg}</div>}

      <form onSubmit={handleProcessProduction} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Production Date *</label>
            <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Batch / Chamber Ref *</label>
            <input type="text" value={batchRef} onChange={(e) => setBatchRef(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* आउटपुट फिनिश्ड प्रोडक्ट (SearchableStockDropdown का उपयोग) */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800, color: '#166534' }}>📦 Output Finished Product (तैयार माल)</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 3 }}>
              <SearchableStockDropdown 
                label="Select Output Item *"
                items={stockItems}
                value={selectedOutput}
                onChange={(val) => setSelectedOutput(val)}
                placeholder="-- Search & Choose Output --"
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Produced Qty *</label>
              <input type="number" placeholder="e.g. 50000" value={producedQty} onChange={(e) => setProducedQty(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* खर्चे */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Direct Labor Cost (₹)</label>
            <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Machinery & Overheads (₹)</label>
            <input type="number" value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* कच्चा माल खपत अनुभाग */}
        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800 }}>🔥 Consumed Raw Materials & Fuels</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <SearchableStockDropdown 
              label="Select Raw Material / Fuel *"
              items={stockItems}
              value={selectedMaterial}
              onChange={(val) => setSelectedMaterial(val)}
              placeholder="-- Search Raw Material --"
            />

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Quantity *</label>
                <input type="number" placeholder="Enter Qty" value={consumedQty} onChange={(e) => setConsumedQty(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
              </div>
              <button type="button" onClick={handleAddMaterialToCart} style={{ padding: '9px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', height: '35px' }}>
                + Add
              </button>
            </div>
          </div>

          {materialCart.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {materialCart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                  <span><b>{item.name}</b> — Qty: {item.qty}</span>
                  <button type="button" onClick={() => { const u = [...materialCart]; u.splice(index, 1); setMaterialCart(u); }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
          ⚡ Deduct Raw Materials & Add Finished Stock
        </button>
      </form>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>📋 Production Batches Register ({batchesList.length})</h3>
        {batchesList.map((batch, idx) => (
          <div key={idx} style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', marginBottom: '6px' }}>
            <b>{batch.batch_ref}</b> ({batch.date}) — <b>{batch.output_item}</b>: +{batch.produced_qty} Pcs
          </div>
        ))}
      </div>
    </div>
  );
}

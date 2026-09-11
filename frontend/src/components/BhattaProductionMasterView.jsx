// frontend/src/components/ProductionConversionView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';

export default function ProductionConversionView({ firm, onClose }) {
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchRef, setBatchRef] = useState(`CHAMBER-${Math.floor(1000 + Math.random() * 9000)}`);
  const [finishedItems, setFinishedItems] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  
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

  // फर्म-वाइज इन्वेंट्री लोड करने का सुरक्षित फंक्शन (Auto-Sync Enabled)
  const loadInventoryAndBatches = () => {
    if (!firm) return;
    try {
      const savedStock = loadFirmData('app_inventory', firm, []);
      const savedBatches = loadFirmData('app_production_batches', firm, []);

      // यदि स्टॉक एन्ट्रीज मौजूद हैं, तो उन्हें बिना सख्त फिल्टर के फ्लेक्सिबल तरीके से बांटें
      // ताकि कच्चा माल और तैयार माल दोनों ड्रॉपडाउन में जरूर दिखें।
      const raw = savedStock.filter(i => i.type === 'raw' || i.category === 'raw' || !i.is_finished && i.type !== 'finished');
      const finished = savedStock.filter(i => i.type === 'finished' || i.category === 'finished' || i.is_finished);

      // यदि किसी कारण से टाइप मैच न हो रहा हो, तो सारे आइटम्स दोनों में दिखाएं ताकि लिस्ट खाली न रहे
      setRawMaterials(raw.length > 0 ? raw : savedStock);
      setFinishedItems(finished.length > 0 ? finished : savedStock);
      setBatchesList(savedBatches);
    } catch (e) {
      console.error("Error loading firm inventory:", e);
      setRawMaterials([]);
      setFinishedItems([]);
      setBatchesList([]);
    }
  };

  useEffect(() => {
    loadInventoryAndBatches();
    window.addEventListener('focus', loadInventoryAndBatches);
    return () => window.removeEventListener('focus', loadInventoryAndBatches);
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

    const materialObj = rawMaterials.find(m => m.id === selectedMaterial || m.name === selectedMaterial);
    const availableStock = Number(materialObj?.stock_qty || materialObj?.quantity || 0);

    if (availableStock <= 0) {
      setErrorMsg(`❌ Stock Error: "${materialObj?.name || selectedMaterial}" is OUT OF STOCK (0). Cannot consume!`);
      return;
    }
    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Stock Error: Insufficient stock. Available: ${availableStock}, Requested: ${qtyNum}`);
      return;
    }

    const newItem = {
      id: materialObj?.id || Math.random().toString(),
      name: materialObj?.name || selectedMaterial,
      qty: qtyNum
    };

    setMaterialCart([...materialCart, newItem]);
    setSelectedMaterial('');
    setConsumedQty('');
  };

  const handleRemoveCartItem = (index) => {
    const updated = [...materialCart];
    updated.splice(index, 1);
    setMaterialCart(updated);
  };

  const handleProcessProduction = (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedOutput) {
      setErrorMsg('Please select an output finished product.');
      return;
    }
    const prodQtyNum = Number(producedQty);
    if (!prodQtyNum || prodQtyNum <= 0) {
      setErrorMsg('Please enter a valid produced quantity.');
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
      produced_qty: prodQtyNum,
      labor_cost: Number(laborCost) || 0,
      overhead_cost: Number(overheadCost) || 0,
      consumed_materials: materialCart,
      timestamp: new Date().toISOString()
    };

    const updatedBatches = [newBatch, ...batchesList];
    setBatchesList(updatedBatches);
    saveFirmData('app_production_batches', firm, updatedBatches);

    setSuccessMsg(`✓ Production Batch ${batchRef} successfully recorded and stock adjusted!`);
    setBatchRef(`CHAMBER-${Math.floor(1000 + Math.random() * 9000)}`);
    setProducedQty('');
    setLaborCost('0');
    setOverheadCost('0');
    setMaterialCart([]);
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '8px', fontFamily: 'sans-serif', boxSizing: 'border-box', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* हेडर */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '10px', boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Firm: {firm?.legal_name || firm?.name || 'Active Firm'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }}>⚙️ Production & Raw Material Conversion</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', boxSizing: 'border-box', width: '100%' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', boxSizing: 'border-box', width: '100%' }}>{successMsg}</div>}

      <form onSubmit={handleProcessProduction} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box', width: '100%' }}>
        
        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Production Date *</label>
            <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Batch / Chamber Ref *</label>
            <input type="text" value={batchRef} onChange={(e) => setBatchRef(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* आउटपुट फिनिश्ड प्रोडक्ट */}
        <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0', boxSizing: 'border-box', width: '100%' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800, color: '#166534' }}>📦 Output Finished Product (तैयार माल)</h3>
          <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ flex: 3 }}>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Select Output Item *</label>
              <select value={selectedOutput} onChange={(e) => setSelectedOutput(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">-- Choose Output --</option>
                {finishedItems.map((item, idx) => (
                  <option key={idx} value={item.name || item.item_name}>{item.name || item.item_name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Produced Qty *</label>
              <input type="number" placeholder="e.g. 50000" value={producedQty} onChange={(e) => setProducedQty(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* खर्चे */}
        <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Direct Labor / Pathai Cost (₹)</label>
            <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '3px' }}>Machinery & Overheads (₹)</label>
            <input type="number" value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* कच्चा माल खपत अनुभाग */}
        <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 800 }}>🔥 Consumed Raw Materials & Fuels</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
            <div>
              <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Select Raw Material</label>
              <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">-- Choose Raw Material --</option>
                {rawMaterials.map((mat, idx) => (
                  <option key={idx} value={mat.name || mat.item_name}>
                    {mat.name || mat.item_name} [Stock: {mat.stock_qty || mat.quantity || 0}]
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>Quantity</label>
                <input type="number" placeholder="Enter Qty" value={consumedQty} onChange={(e) => setConsumedQty(e.target.value)} style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box' }} />
              </div>
              <button type="button" onClick={handleAddMaterialToCart} style={{ padding: '9px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', height: '35px', whiteSpace: 'nowrap' }}>
                + Add
              </button>
            </div>
          </div>

          {materialCart.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', boxSizing: 'border-box' }}>
              {materialCart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', width: '100%' }}>
                  <span style={{ wordBreak: 'break-word', flex: 1 }}><b>{item.name}</b> — Qty: {item.qty}</span>
                  <button type="button" onClick={() => handleRemoveCartItem(index)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', marginLeft: '6px' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* सबमिट बटन */}
        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px', boxSizing: 'border-box' }}>
          ⚡ Deduct Raw Materials & Add Finished Stock
        </button>

      </form>

      {/* बैच रजिस्टर */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>📋 Production Batches Register ({batchesList.length})</h3>
        {batchesList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', padding: '8px' }}>No production batches recorded yet for this firm.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
            {batchesList.map((batch, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '3px' }}>
                  <span>{batch.batch_ref} ({batch.date})</span>
                  <span style={{ color: '#166534' }}>{batch.output_item}: +{batch.produced_qty} Pcs</span>
                </div>
                <div style={{ color: '#64748b', wordBreak: 'break-word' }}>
                  Labor/Overhead: ₹{batch.labor_cost + batch.overhead_cost} | Items: {batch.consumed_materials?.map(m => `${m.name} (${m.qty})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

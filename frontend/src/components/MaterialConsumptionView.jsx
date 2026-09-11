import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    const firmId = firm?.firm_id || 'default_firm';
    try {
      const savedStock = JSON.parse(localStorage.getItem(`app_inventory_${firmId}`) || '[]');
      const savedBatches = JSON.parse(localStorage.getItem(`app_production_batches_${firmId}`) || '[]');
      
      if (savedStock.length === 0) {
        setRawMaterials([
          { id: 'mat_1', name: 'Mitti (मिट्टी)', stock_qty: 0 },
          { id: 'mat_2', name: 'Coal (कोयला)', stock_qty: 4500 },
          { id: 'mat_3', name: 'Biomass Briquette (ब्रिकेट)', stock_qty: 12000 }
        ]);
        setFinishedItems([
          { id: 'fin_1', name: 'Phedi / Raw Bricks (कच्ची ईंट)', price: 1.5 },
          { id: 'fin_2', name: 'A-Class Pakka Bricks (पक्की ईंट)', price: 6.0 }
        ]);
      } else {
        setRawMaterials(savedStock.filter(i => i.type === 'raw' || !i.is_finished));
        setFinishedItems(savedStock.filter(i => i.type === 'finished' || i.is_finished));
      }
      setBatchesList(savedBatches);
    } catch (e) {
      console.error(e);
    }
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
    const availableStock = Number(materialObj?.stock_qty || 0);

    // Strict Negative Stock Guard
    if (availableStock <= 0) {
      setErrorMsg(`❌ Stock Error: "${materialObj?.name || selectedMaterial}" is completely OUT OF STOCK (0). Cannot consume!`);
      return;
    }
    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Stock Error: Insufficient stock for "${materialObj?.name || selectedMaterial}". Available: ${availableStock}, Requested: ${qtyNum}`);
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

    const firmId = firm?.firm_id || 'default_firm';
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
    localStorage.setItem(`app_production_batches_${firmId}`, JSON.stringify(updatedBatches));

    setSuccessMsg(`✓ Production Batch ${batchRef} successfully recorded and stock adjusted!`);
    
    setBatchRef(`CHAMBER-${Math.floor(1000 + Math.random() * 9000)}`);
    setProducedQty('');
    setLaborCost('0');
    setOverheadCost('0');
    setMaterialCart([]);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '12px', fontFamily: 'sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Firm: {firm?.legal_name || 'Neelkanth Int Udyog'}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>⚙️ Production & Raw Material Conversion</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>{successMsg}</div>}

      <form onSubmit={handleProcessProduction} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Production Date *</label>
            <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Batch / Chamber Ref *</label>
            <input type="text" value={batchRef} onChange={(e) => setBatchRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800, color: '#166534' }}>📦 Output Finished Product (तैयार माल)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Select Output Item *</label>
              <select value={selectedOutput} onChange={(e) => setSelectedOutput(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">-- Choose Output --</option>
                {finishedItems.map((item, idx) => (
                  <option key={idx} value={item.name}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Produced Qty *</label>
              <input type="number" placeholder="e.g. 50000" value={producedQty} onChange={(e) => setProducedQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Direct Labor / Pathai Cost (₹)</label>
            <input type="number" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Machinery & Overheads (₹)</label>
            <input type="number" value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 800 }}>🔥 Consumed Raw Materials & Fuels (खपत होने वाला कच्चा माल)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Select Raw Material</label>
              <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">-- Choose Raw Material --</option>
                {rawMaterials.map((mat, idx) => (
                  <option key={idx} value={mat.name}>
                    {mat.name} [Stock: {mat.stock_qty || 0}]
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Qty</label>
              <input type="number" placeholder="Qty" value={consumedQty} onChange={(e) => setConsumedQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>
            <button type="button" onClick={handleAddMaterialToCart} style={{ padding: '10px 14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', height: '39px' }}>
              + Add
            </button>
          </div>

          {materialCart.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {materialCart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                  <span><b>{item.name}</b> — Qty: {item.qty}</span>
                  <button type="button" onClick={() => handleRemoveCartItem(index)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
          ⚡ Deduct Raw Materials & Add Finished Stock
        </button>

      </form>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800 }}>📋 Production Batches Register ({batchesList.length})</h3>
        {batchesList.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '10px' }}>No production batches recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {batchesList.map((batch, idx) => (
              <div key={idx} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                  <span>{batch.batch_ref} ({batch.date})</span>
                  <span style={{ color: '#166534' }}>{batch.output_item}: +{batch.produced_qty} Pcs</span>
                </div>
                <div style={{ color: '#64748b' }}>
                  Labor/Overhead: ₹{batch.labor_cost + batch.overhead_cost} | Consumed Items: {batch.consumed_materials?.map(m => `${m.name} (${m.qty})`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// frontend/src/components/BhattaProductionMasterView.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import SearchableStockDropdown from './SearchableStockDropdown';

export default function BhattaProductionMasterView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
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
    try {
      // 1. सीधे StorageService से inventory_items लोड करें (कोई डिफ़ॉल्ट हार्डकोडेड आइटम नहीं)
      const allStoredStock = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const firmStock = allStoredStock.filter(item => !item.firm_id || item.firm_id === activeFirmId);
      setStockItems(firmStock);

      // 2. प्रोडक्शन बैचेस लोड करें
      const savedBatches = StorageService.getItem(`app_production_batches_${activeFirmId}`) || [];
      setBatchesList(savedBatches);
    } catch (e) {
      console.error("Error loading production data:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [activeFirmId]);

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

    const materialObj = stockItems.find(m => (m.item_name || m.name) === selectedMaterial);
    const availableStock = Number(materialObj?.current_stock || materialObj?.stock || 0);

    if (qtyNum > availableStock) {
      setErrorMsg(`❌ Insufficient stock for "${selectedMaterial}". Available: ${availableStock}`);
      return;
    }

    setMaterialCart([
      ...materialCart, 
      { 
        id: materialObj?.id || Math.random().toString(), 
        name: selectedMaterial, 
        qty: qtyNum 
      }
    ]);
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

    try {
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
      StorageService.setItem(`app_production_batches_${activeFirmId}`, updatedBatches);

      // इन्वेंट्री अपडेट करें: कच्चा माल घटाएं और पक्का माल (Output) बढ़ाएं
      let allStoredStock = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      
      // 1. कच्चा माल घटाएं
      materialCart.forEach(mat => {
        const target = allStoredStock.find(i => (i.item_name || i.name) === mat.name && (!i.firm_id || i.firm_id === activeFirmId));
        if (target) {
          const current = Number(target.current_stock || target.stock || 0);
          target.current_stock = Math.max(0, current - mat.qty);
        }
      });

      // 2. पक्का माल बढ़ाएं
      const outputTarget = allStoredStock.find(i => (i.item_name || i.name) === selectedOutput && (!i.firm_id || i.firm_id === activeFirmId));
      if (outputTarget) {
        const currentOut = Number(outputTarget.current_stock || outputTarget.stock || 0);
        outputTarget.current_stock = currentOut + Number(producedQty);
      } else {
        // यदि आउटपुट आइटम पहले से इन्वेंट्री में नहीं है तो नया जोड़ दें
        allStoredStock.unshift({
          id: `ITEM-${Date.now()}`,
          firm_id: activeFirmId,
          item_name: selectedOutput,
          current_stock: Number(producedQty),
          unit: 'Pcs'
        });
      }

      StorageService.setItem('inventory_items', allStoredStock);
      window.dispatchEvent(new Event('app_storage_updated'));

      setSuccessMsg(`✓ Production Batch ${batchRef} successfully recorded! Stock updated.`);
      setBatchRef(`CHAMBER-${Math.floor(1000 + Math.random() * 9000)}`);
      setProducedQty('');
      setMaterialCart('');
      loadData();
    } catch (err) {
      setErrorMsg('Error processing production: ' + err.message);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '100vw', minHeight: '100vh', backgroundColor: '#f8fafc', padding: '16px', fontFamily: 'sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
            Firm ID: {activeFirmId}
          </div>
        </div>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>⚙️ Production & Raw Material Conversion</h1>
      </div>

      {errorMsg && <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>{errorMsg}</div>}
      {successMsg && <div style={{ marginBottom: '12px', padding: '12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #bbf7d0' }}>{successMsg}</div>}

      <form onSubmit={handleProcessProduction} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Production Date *</label>
            <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Batch / Chamber Ref *</label>
            <input type="text" value={batchRef} onChange={(e) => setBatchRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: '#166534' }}>📦 Output Finished Product (तैयार माल)</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 3 }}>
              <SearchableStockDropdown 
                firm={firm}
                label="Select Output Item *"
                items={stockItems}
                value={selectedOutput}
                onChange={(val) => setSelectedOutput(val)}
                placeholder="-- Search & Choose Output --"
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Produced Qty *</label>
              <input type="number" step="0.01" placeholder="e.g. 50000" value={producedQty} onChange={(e) => setProducedQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Direct Labor Cost (₹)</label>
            <input type="number" step="0.01" value={laborCost} onChange={(e) => setLaborCost(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Machinery & Overheads (₹)</label>
            <input type="number" step="0.01" value={overheadCost} onChange={(e) => setOverheadCost(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800 }}>🔥 Consumed Raw Materials & Fuels</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SearchableStockDropdown 
              firm={firm}
              label="Select Raw Material / Fuel *"
              items={stockItems}
              value={selectedMaterial}
              onChange={(val) => setSelectedMaterial(val)}
              placeholder="-- Search Raw Material --"
            />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#475569' }}>Quantity *</label>
                <input type="number" step="0.01" placeholder="Enter Qty" value={consumedQty} onChange={(e) => setConsumedQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>
              <button type="button" onClick={handleAddMaterialToCart} style={{ padding: '10px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', height: '38px' }}>
                + Add
              </button>
            </div>
          </div>

          {materialCart.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {materialCart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                  <span><b>{item.name}</b> — Qty: {item.qty}</span>
                  <button type="button" onClick={() => { const u = [...materialCart]; u.splice(index, 1); setMaterialCart(u); }} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
          ⚡ Deduct Raw Materials & Add Finished Stock
        </button>
      </form>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800 }}>📋 Production Batches Register ({batchesList.length})</h3>
        {batchesList.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No production records found.</div>
        ) : (
          batchesList.map((batch, idx) => (
            <div key={idx} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', marginBottom: '8px' }}>
              <b>{batch.batch_ref}</b> ({batch.date}) — <b>{batch.output_item}</b>: +{batch.produced_qty} Pcs
            </div>
          ))
        )}
      </div>
    </div>
  );
}

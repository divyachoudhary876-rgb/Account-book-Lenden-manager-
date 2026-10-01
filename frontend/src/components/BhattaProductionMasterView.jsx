// frontend/src/components/SmartProductionView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import SearchableStockDropdown from './SearchableStockDropdown';

export default function SmartProductionView({ firm, onClose }) {
  const activeFY = getCurrentActiveFY();
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const [useForLocation, setUseForLocation] = useState('');
  
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [materialQty, setMaterialQty] = useState('');
  const [consumedMaterials, setConsumedMaterials] = useState([]);

  const [directLaborCost, setDirectLaborCost] = useState('');
  const [machineryOverheads, setMachineryOverheads] = useState('');

  const [outputItem, setOutputItem] = useState('');
  const [producedQty, setProducedQty] = useState('');

  const [batchesList, setBatchesList] = useState([]);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;
    const rawItems = loadFirmData('inventory_items', firm, []);
    const validItems = rawItems.filter(i => i && (i.name || i.item_name));
    setInventoryItems(validItems);

    const savedBatches = loadFirmData('production_batches', firm, []);
    setBatchesList(savedBatches);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
    };
  }, [firm]);

  const handleAddMaterial = () => {
    if (!selectedMaterial || !materialQty || Number(materialQty) <= 0) {
      return alert('Kripya material chunein aur maatra (Qty) darj karein.');
    }
    const itemObj = inventoryItems.find(i => String(i.id) === String(selectedMaterial));
    if (!itemObj) return alert('Selected inventory item not found.');

    const qty = Number(materialQty);
    const costPrice = Number(itemObj.cost_price || itemObj.rate || itemObj.unit_purchase_price || 0);

    setConsumedMaterials([
      ...consumedMaterials,
      {
        id: Date.now(),
        itemId: itemObj.id,
        name: itemObj.name || itemObj.item_name,
        qty,
        unit: itemObj.unit || 'Units',
        estimatedCost: qty * costPrice
      }
    ]);

    setSelectedMaterial('');
    setMaterialQty('');
  };

  const removeConsumedItem = (id) => {
    setConsumedMaterials(consumedMaterials.filter(m => m.id !== id));
  };

  const totalMaterialCost = consumedMaterials.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
  const totalProductionCost = totalMaterialCost + (Number(directLaborCost) || 0) + (Number(machineryOverheads) || 0);
  const unitValuation = (Number(producedQty) > 0) ? (totalProductionCost / Number(producedQty)).toFixed(2) : 0;

  const handleSaveProduction = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!useForLocation) return alert('Kripya use location / batch details darj karein.');
    if (consumedMaterials.length === 0) return alert('Kam se kam ek raw material ya fuel jodein.');
    if (!outputItem) return alert('Kripya finished output item chunein.');
    if (!producedQty || Number(producedQty) <= 0) return alert('Kripya valid produced quantity darj karein.');

    try {
      const batchId = editingBatchId || ('PROD-' + Date.now());

      // If editing, first revert old batch inventory impact
      let workingInventory = [...inventoryItems];
      if (editingBatchId) {
        const oldBatch = batchesList.find(b => b.id === editingBatchId);
        if (oldBatch) {
          workingInventory = workingInventory.map(inv => {
            const invId = String(inv.id);
            const oldConsumed = (oldBatch.consumed_materials || []).find(m => String(m.itemId) === invId);
            let currentStock = Number(inv.current_stock || inv.stock || inv.qty || 0);

            if (oldConsumed) currentStock += Number(oldConsumed.qty);
            if (invId === String(oldBatch.output_item_id)) {
              currentStock = Math.max(0, currentStock - Number(oldBatch.produced_qty));
            }
            return { ...inv, current_stock: currentStock, stock: currentStock, qty: currentStock };
          });
        }
      }

      const newBatch = {
        id: batchId,
        fiscal_year: activeFY,
        date: productionDate,
        location: useForLocation,
        consumed_materials: consumedMaterials,
        direct_labor: Number(directLaborCost) || 0,
        machinery_overheads: Number(machineryOverheads) || 0,
        total_cost: totalProductionCost,
        output_item_id: outputItem,
        produced_qty: Number(producedQty),
        unit_valuation: Number(unitValuation),
        created_at: new Date().toISOString()
      };

      const filteredBatches = batchesList.filter(b => b.id !== batchId);
      const updatedBatches = [newBatch, ...filteredBatches];
      setBatchesList(updatedBatches);
      saveFirmData('production_batches', firm, updatedBatches);

      // Apply new batch inventory deduction & addition
      const finalInventory = workingInventory.map(inv => {
        const invId = String(inv.id);
        const consumedMatch = consumedMaterials.find(m => String(m.itemId) === invId);
        let currentStock = Number(inv.current_stock || inv.stock || inv.qty || 0);

        if (consumedMatch) {
          currentStock = Math.max(0, currentStock - Number(consumedMatch.qty));
        }

        if (invId === String(outputItem)) {
          currentStock += Number(producedQty);
        }

        return {
          ...inv,
          current_stock: currentStock,
          stock: currentStock,
          qty: currentStock,
          ...(invId === String(outputItem) ? { cost_price: Number(unitValuation), unit_purchase_price: Number(unitValuation), rate: Number(unitValuation) } : {})
        };
      });

      setInventoryItems(finalInventory);
      saveFirmData('inventory_items', firm, finalInventory);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      setFeedback({ type: 'success', message: editingBatchId ? '✓ Production batch updated successfully!' : '✓ Production saved successfully!' });

      setEditingBatchId(null);
      setUseForLocation('');
      setConsumedMaterials([]);
      setDirectLaborCost('');
      setMachineryOverheads('');
      setOutputItem('');
      setProducedQty('');

    } catch (err) {
      alert('Error saving production: ' + err.message);
    }
  };

  const handleEditBatch = (batch) => {
    if (!batch) return;
    setEditingBatchId(batch.id);
    setProductionDate(batch.date || new Date().toISOString().slice(0, 10));
    setUseForLocation(batch.location || '');
    setConsumedMaterials(batch.consumed_materials || []);
    setDirectLaborCost(batch.direct_labor ? String(batch.direct_labor) : '');
    setMachineryOverheads(batch.machinery_overheads ? String(batch.machinery_overheads) : '');
    setOutputItem(batch.output_item_id || '');
    setProducedQty(batch.produced_qty ? String(batch.produced_qty) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBatch = (batchId) => {
    if (!window.confirm('Is production batch ko delete karne se stock purani sthiti me vapas aa jayega. Jari rakhein?')) return;

    try {
      const batchToDelete = batchesList.find(b => b.id === batchId);
      if (!batchToDelete) return;

      // Revert inventory stock
      const revertedInventory = inventoryItems.map(inv => {
        const invId = String(inv.id);
        const oldConsumed = (batchToDelete.consumed_materials || []).find(m => String(m.itemId) === invId);
        let currentStock = Number(inv.current_stock || inv.stock || inv.qty || 0);

        if (oldConsumed) currentStock += Number(oldConsumed.qty);
        if (invId === String(batchToDelete.output_item_id)) {
          currentStock = Math.max(0, currentStock - Number(batchToDelete.produced_qty));
        }
        return { ...inv, current_stock: currentStock, stock: currentStock, qty: currentStock };
      });

      setInventoryItems(revertedInventory);
      saveFirmData('inventory_items', firm, revertedInventory);

      const filteredBatches = batchesList.filter(b => b.id !== batchId);
      setBatchesList(filteredBatches);
      saveFirmData('production_batches', firm, filteredBatches);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));

      if (editingBatchId === batchId) {
        setEditingBatchId(null);
        setUseForLocation('');
        setConsumedMaterials([]);
        setDirectLaborCost('');
        setMachineryOverheads('');
        setOutputItem('');
        setProducedQty('');
      }

      alert('✓ Production batch deleted & stock restored.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '12px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', marginBottom: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            {editingBatchId ? '✏️ Edit Production Batch' : `⚙️ Smart Production & Auto-Valuation (${activeFY})`}
          </h2>
          {onClose && (
            <button onClick={onClose} style={{ padding: '6px 10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
              Close
            </button>
          )}
        </div>

        {feedback && (
          <div style={{ padding: '10px', marginBottom: '12px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold', fontSize: '11px', border: '1px solid #bbf7d0' }}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSaveProduction}>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Production Date *
              </label>
              <input 
                type="date" 
                value={productionDate} 
                onChange={e => setProductionDate(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Use For / Location *
              </label>
              <input 
                type="text" 
                placeholder="e.g. Chamber-1 / Batch-2" 
                value={useForLocation} 
                onChange={e => setUseForLocation(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
          </div>

          {/* STEP 1: Consumed Raw Materials */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '10px', marginBottom: '12px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#b45309', marginBottom: '8px' }}>
              🔥 Step 1: Consumed Raw Materials & Fuels (From Inventory)
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', boxSizing: 'border-box' }}>
              <SearchableStockDropdown 
                firm={firm}
                label=""
                value={selectedMaterial}
                onChange={val => setSelectedMaterial(val)}
                placeholder="-- Select Inventory --"
              />

              <div style={{ display: 'flex', gap: '8px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter Qty" 
                    value={materialQty} 
                    onChange={e => setMaterialQty(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddMaterial} 
                  style={{ padding: '9px 16px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {consumedMaterials.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                {consumedMaterials.map(mat => (
                  <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #fef3c7', fontSize: '11px' }}>
                    <span><strong>{mat.name}</strong> - {mat.qty} {mat.unit}</span>
                    <span>
                      Est: ₹{mat.estimatedCost.toFixed(2)}
                      <button type="button" onClick={() => removeConsumedItem(mat.id)} style={{ color: '#dc2626', border: 'none', background: 'none', marginLeft: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 2: Direct Labor & Overheads (Optional) */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '10px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#166534', marginBottom: '2px' }}>
              👷 Step 2: Direct Labor & Overheads (Optional)
            </div>
            <div style={{ fontSize: '10px', color: '#15803d', marginBottom: '8px' }}>
              *(खर्चे अलग से जर्नल/वाउचर में दर्ज होने पर इसे **0** छोड़ सकते हैं)*
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#166534' }}>Direct Labor Cost (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0" 
                  value={directLaborCost} 
                  onChange={e => setDirectLaborCost(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#166534' }}>Machinery & Overheads (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0" 
                  value={machineryOverheads} 
                  onChange={e => setMachineryOverheads(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: '800', color: '#15803d' }}>
              Total Production Cost: ₹{totalProductionCost.toFixed(2)}
            </div>
          </div>

          {/* STEP 3: Output Finished Product & Auto Valuation */}
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '10px', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1e40af', marginBottom: '8px' }}>
              📦 Step 3: Output Finished Product & Auto Valuation
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '6px' }}>
              <SearchableStockDropdown 
                firm={firm}
                label="Output Item (From Inventory) *"
                value={outputItem}
                onChange={val => setOutputItem(val)}
                placeholder="-- Select Output Item --"
              />
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#1e40af' }}>Produced Qty *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="e.g. 30000" 
                  value={producedQty} 
                  onChange={e => setProducedQty(e.target.value)} 
                  style={inputStyle} 
                />
              </div>
            </div>

            {Number(producedQty) > 0 && (
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e40af', marginTop: '6px' }}>
                Auto Valued Rate: <strong>₹{unitValuation} / Unit</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="submit" 
              style={{ flex: 1, padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
            >
              {editingBatchId ? '✓ Update Production Batch' : '⚡ Save Production & Update Cost Valuation'}
            </button>
            {editingBatchId && (
              <button 
                type="button" 
                onClick={() => {
                  setEditingBatchId(null);
                  setUseForLocation('');
                  setConsumedMaterials([]);
                  setDirectLaborCost('');
                  setMachineryOverheads('');
                  setOutputItem('');
                  setProducedQty('');
                }}
                style={{ padding: '12px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          Production Batches Register ({activeFY})
        </h3>

        {batchesList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
            Koi production record darj nahi hai.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {batchesList.map(batch => (
              <div key={batch.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#0f172a' }}>
                    {batch.date} | Location: {batch.location}
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Produced Qty: {batch.produced_qty} Units (Valued @ ₹{batch.unit_valuation}/unit) | <strong style={{ color: '#166534' }}>Cost: ₹{batch.total_cost.toFixed(2)}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEditBatch(batch)} style={{ padding: '5px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Edit</button>
                  <button onClick={() => handleDeleteBatch(batch.id)} style={{ padding: '5px 8px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Delete</button>
                </div>
              </div>
            ))}
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
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};

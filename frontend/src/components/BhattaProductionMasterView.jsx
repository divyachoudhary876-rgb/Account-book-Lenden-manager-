import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';

export default function BhattaProductionMasterView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const allItems = useItemMaster(); 

  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchRef, setBatchRef] = useState(`CHAMBER-${Math.floor(Date.now() / 1000)}`);
  
  const [outputProductId, setOutputProductId] = useState('');
  const [producedQty, setProducedQty] = useState('');
  
  // Costing fields
  const [laborCost, setLaborCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');

  const [rawMaterials, setRawMaterials] = useState([{ id: Date.now(), itemId: '', qty: '' }]);
  const [productionLogs, setProductionLogs] = useState([]);
  
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadLogs = () => {
    const logs = StorageService.getItem('bhatta_production_logs') || [];
    setProductionLogs(logs.filter(l => l.firm_id === activeFirmId));
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('app_storage_updated', loadLogs);
    return () => window.removeEventListener('app_storage_updated', loadLogs);
  }, [activeFirmId]);

  // Filter out output product from raw materials
  const availableRawMaterials = allItems.filter(item => String(item.id) !== String(outputProductId) && item.item_type !== 'SERVICE');

  const addRawMaterialRow = () => setRawMaterials([...rawMaterials, { id: Date.now(), itemId: '', qty: '' }]);
  const updateRawMaterial = (id, field, value) => setRawMaterials(rawMaterials.map(rm => rm.id === id ? { ...rm, [field]: value } : rm));
  const removeRawMaterial = (id) => setRawMaterials(rawMaterials.filter(rm => rm.id !== id));

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!outputProductId || !producedQty) return alert('Select Output Product and Quantity.');
    
    try {
      const currentInventory = StorageService.getInventoryItems() || [];
      const allLogs = StorageService.getItem('bhatta_production_logs') || [];

      // If editing, restore old stock changes first
      let workingInventory = [...currentInventory];
      if (editingId) {
        const oldLog = allLogs.find(l => l.id === editingId);
        if (oldLog) {
          // Restore raw materials
          workingInventory = workingInventory.map(inv => {
            const used = (oldLog.rawMaterials || []).find(r => String(r.itemId) === String(inv.id));
            if (used) {
              return { ...inv, current_stock: Number(inv.current_stock || 0) + Number(used.qty) };
            }
            // Deduct old finished good
            if (String(inv.id) === String(oldLog.outputProductId)) {
              return { ...inv, current_stock: Math.max(0, Number(inv.current_stock || 0) - Number(oldLog.producedQty)) };
            }
            return inv;
          });
        }
      }

      // Apply new production stock delta
      const updatedInventory = workingInventory.map(invItem => {
        if (String(invItem.id) === String(outputProductId)) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) + Number(producedQty) };
        }
        
        const usedRm = rawMaterials.find(rm => String(rm.itemId) === String(invItem.id));
        if (usedRm && usedRm.qty) {
          return { ...invItem, current_stock: Math.max(0, Number(invItem.current_stock || 0) - Number(usedRm.qty)) };
        }
        return invItem;
      });

      StorageService.setItem('inventory_items', updatedInventory);

      const payload = {
        id: editingId || `PROD-${Date.now()}`,
        firm_id: activeFirmId,
        productionDate,
        batchRef,
        outputProductId,
        outputProductName: allItems.find(i => String(i.id) === String(outputProductId))?.item_name || 'Finished Good',
        producedQty: Number(producedQty),
        laborCost: Number(laborCost || 0),
        overheadCost: Number(overheadCost || 0),
        rawMaterials,
        created_at: new Date().toISOString()
      };

      let newLogs;
      if (editingId) {
        newLogs = allLogs.map(l => l.id === editingId ? payload : l);
        setFeedback({ type: 'success', message: '✓ Production Log Updated Successfully!' });
      } else {
        newLogs = [payload, ...allLogs];
        setFeedback({ type: 'success', message: '✓ Production Recorded: Raw Materials Deducted & Finished Stock Added!' });
      }

      StorageService.setItem('bhatta_production_logs', newLogs);
      loadLogs();

      // Reset form
      setEditingId(null);
      setOutputProductId(''); setProducedQty(''); setLaborCost(''); setOverheadCost('');
      setRawMaterials([{ id: Date.now(), itemId: '', qty: '' }]);
      setBatchRef(`CHAMBER-${Math.floor(Date.now() / 1000)}`);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (log) => {
    setEditingId(log.id);
    setProductionDate(log.productionDate);
    setBatchRef(log.batchRef);
    setOutputProductId(log.outputProductId);
    setProducedQty(String(log.producedQty));
    setLaborCost(log.laborCost ? String(log.laborCost) : '');
    setOverheadCost(log.overheadCost ? String(log.overheadCost) : '');
    setRawMaterials(log.rawMaterials || [{ id: Date.now(), itemId: '', qty: '' }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (logId) => {
    if (!window.confirm('इस प्रोडक्शन लॉग को हटाने पर खपत हुआ कच्चा माल वापस स्टॉक में जुड़ जाएगा। जारी रखें?')) return;
    try {
      const allLogs = StorageService.getItem('bhatta_production_logs') || [];
      const targetLog = allLogs.find(l => l.id === logId);

      if (targetLog) {
        const currentInventory = StorageService.getInventoryItems() || [];
        const restoredInventory = currentInventory.map(inv => {
          // Restore raw materials
          const used = (targetLog.rawMaterials || []).find(r => String(r.itemId) === String(inv.id));
          if (used) {
            return { ...inv, current_stock: Number(inv.current_stock || 0) + Number(used.qty) };
          }
          // Deduct finished good
          if (String(inv.id) === String(targetLog.outputProductId)) {
            return { ...inv, current_stock: Math.max(0, Number(inv.current_stock || 0) - Number(targetLog.producedQty)) };
          }
          return inv;
        });
        StorageService.setItem('inventory_items', restoredInventory);
      }

      const filteredLogs = allLogs.filter(l => l.id !== logId);
      StorageService.setItem('bhatta_production_logs', filteredLogs);
      loadLogs();
      if (editingId === logId) {
        setEditingId(null); setOutputProductId(''); setProducedQty('');
      }
      alert('✓ Production log deleted & stock adjusted.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
            {editingId ? '✏️ Edit Production Batch' : '⚙️ Production & Raw Material Conversion'}
          </h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>
        
        {feedback && <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 'bold' }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', boxSizing: 'border-box' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Production Date *</label>
              <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Batch / Chamber Ref *</label>
              <input type="text" value={batchRef} onChange={e => setBatchRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#065f46' }}>Output Finished Product (तैयार माल) *</label>
                <select value={outputProductId} onChange={e => setOutputProductId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff' }} required>
                  <option value="">-- Select Output --</option>
                  {allItems.map(item => <option key={item.id} value={item.id}>{item.item_name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: '#065f46' }}>Produced Qty *</label>
                <input type="number" step="0.01" value={producedQty} onChange={e => setProducedQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="e.g. 50000" required />
              </div>
            </div>
          </div>

          {/* Costing Inputs */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Direct Labor / Pathai Cost (₹)</label>
              <input type="number" step="0.01" value={laborCost} onChange={e => setLaborCost(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Machinery & Overheads (₹)</label>
              <input type="number" step="0.01" value={overheadCost} onChange={e => setOverheadCost(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Consumed Raw Materials & Fuels (खपत होने वाला कच्चा माल)</label>
              <button type="button" onClick={addRawMaterialRow} style={{ color: '#0284c7', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Material</button>
            </div>
            
            {rawMaterials.map((rm, index) => (
              <div key={rm.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', boxSizing: 'border-box' }}>
                <select value={rm.itemId} onChange={e => updateRawMaterial(rm.id, 'itemId', e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff' }} required>
                  <option value="">-- Choose Raw Material --</option>
                  {availableRawMaterials.map(item => ( 
                    <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0}]</option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Qty" value={rm.qty} onChange={e => updateRawMaterial(rm.id, 'qty', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
                {index > 0 && <button type="button" onClick={() => removeRawMaterial(rm.id)} style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>X</button>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: editingId ? '#0284c7' : '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
              {editingId ? '✓ Update Production Log' : '⚡ Deduct Raw Materials & Add Finished Stock'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setOutputProductId(''); setProducedQty(''); }} style={{ padding: '14px 20px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* PRODUCTION LOGS REGISTER */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>📋 Production Batches Register ({productionLogs.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {productionLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>No production logs recorded yet.</div>
          ) : (
            productionLogs.map(log => (
              <div key={log.id} style={{ backgroundColor: editingId === log.id ? '#f0f9ff' : '#f8fafc', border: `1px solid ${editingId === log.id ? '#0284c7' : '#e2e8f0'}`, borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{log.productionDate}</span>
                    <strong style={{ fontSize: '12px', color: '#0f172a' }}>{log.batchRef}</strong>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#059669' }}>{log.outputProductName} : +{log.producedQty} Pcs</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Labor/Overhead: ₹{(log.laborCost || 0) + (log.overheadCost || 0)}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleEdit(log)} style={{ padding: '6px 12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Edit</button>
                  <button onClick={() => handleDelete(log.id)} style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Del</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

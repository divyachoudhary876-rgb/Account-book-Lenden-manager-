import React, { useState } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';

export default function BhattaProductionMasterView({ firm, onClose }) {
  const allItems = useItemMaster(); 

  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchRef, setBatchRef] = useState(`CHAMBER-${Math.floor(Date.now() / 1000)}`);
  
  const [outputProductId, setOutputProductId] = useState('');
  const [producedQty, setProducedQty] = useState('');
  
  const [rawMaterials, setRawMaterials] = useState([{ id: Date.now(), itemId: '', qty: '' }]);

  const availableRawMaterials = allItems.filter(item => String(item.id) !== String(outputProductId) && item.item_type !== 'SERVICE');

  const addRawMaterialRow = () => setRawMaterials([...rawMaterials, { id: Date.now(), itemId: '', qty: '' }]);
  const updateRawMaterial = (id, field, value) => setRawMaterials(rawMaterials.map(rm => rm.id === id ? { ...rm, [field]: value } : rm));
  const removeRawMaterial = (id) => setRawMaterials(rawMaterials.filter(rm => rm.id !== id));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!outputProductId || !producedQty) return alert('Select Output Product and Quantity.');
    
    try {
      const currentInventory = StorageService.getInventoryItems() || [];
      
      const updatedInventory = currentInventory.map(invItem => {
        if (String(invItem.id) === String(outputProductId)) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) + Number(producedQty) };
        }
        
        const usedRm = rawMaterials.find(rm => String(rm.itemId) === String(invItem.id));
        if (usedRm && usedRm.qty) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) - Number(usedRm.qty) };
        }
        return invItem;
      });

      StorageService.setItem('inventory_items', updatedInventory);
      alert('✓ Production Recorded: Raw Materials Deducted & Finished Stock Added!');
      
      setOutputProductId(''); setProducedQty('');
      setRawMaterials([{ id: Date.now(), itemId: '', qty: '' }]);
      setBatchRef(`CHAMBER-${Math.floor(Date.now() / 1000)}`);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>⚙️ Production & Raw Material Conversion</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Production Date *</label>
              <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Batch / Chamber Ref *</label>
              <input type="text" value={batchRef} onChange={e => setBatchRef(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
            </div>
          </div>

          <div style={{ backgroundColor: '#ecfdf5', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#065f46' }}>Output Finished Product (तैयार माल) *</label>
                <select value={outputProductId} onChange={e => setOutputProductId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #eab308' }} required>
                  <option value="">-- Select Output --</option>
                  {allItems.map(item => <option key={item.id} value={item.id}>{item.item_name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#065f46' }}>Produced Qty *</label>
                <input type="number" value={producedQty} onChange={e => setProducedQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Consumed Raw Materials (खपत होने वाला माल)</label>
              <button type="button" onClick={addRawMaterialRow} style={{ color: '#0284c7', background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Material</button>
            </div>
            
            {rawMaterials.map((rm, index) => (
              <div key={rm.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select value={rm.itemId} onChange={e => updateRawMaterial(rm.id, 'itemId', e.target.value)} style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required>
                  <option value="">-- Choose Raw Material --</option>
                  {availableRawMaterials.map(item => ( 
                    <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0}]</option>
                  ))}
                </select>
                <input type="number" placeholder="Qty" value={rm.qty} onChange={e => updateRawMaterial(rm.id, 'qty', e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
                {index > 0 && <button type="button" onClick={() => removeRawMaterial(rm.id)} style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>X</button>}
              </div>
            ))}
          </div>

          <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            ⚡ Deduct Raw Materials & Add Finished Stock
          </button>
        </form>
      </div>
    </div>
  );
}

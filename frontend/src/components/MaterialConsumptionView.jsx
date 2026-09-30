// frontend/src/components/MaterialConsumptionView.jsx
import React, { useState, useEffect } from 'react';
import { loadFirmData, saveFirmData } from '../utils/firmIsolationEngine';
import { getCurrentActiveFY } from '../utils/financialYearLockEngine';
import SearchableStockDropdown from './SearchableStockDropdown';

export default function MaterialConsumptionView({ firm, onClose }) {
  const activeFY = getCurrentActiveFY();
  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [usesFor, setUsesFor] = useState('');
  
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [consumptionList, setConsumptionList] = useState([]);
  
  const [savedRecords, setSavedRecords] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    if (!firm) return;
    
    const rawInventory = loadFirmData('inventory_items', firm, []);
    const validInventory = rawInventory.filter(i => i && (i.name || i.item_name));
    setInventoryItems(validInventory);

    const records = loadFirmData('material_consumption_records', firm, []);
    setSavedRecords(records);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('app_storage_updated', loadData);
    };
  }, [firm]);

  const handleAddToList = () => {
    if (!selectedStockId || !quantity || Number(quantity) <= 0) {
      return alert('Kripya item chunein aur valid quantity darj karein.');
    }

    const itemObj = inventoryItems.find(i => String(i.id) === String(selectedStockId));
    if (!itemObj) return alert('Selected inventory item not found.');

    const qty = Number(quantity);
    if (qty > Number(itemObj.current_stock || 0)) {
      return alert(`Available stock se zyada quantity darj nahi kar sakte! (Stock: ${itemObj.current_stock} ${itemObj.unit})`);
    }

    setConsumptionList([
      ...consumptionList,
      {
        id: Date.now(),
        itemId: itemObj.id,
        name: itemObj.name || itemObj.item_name,
        unit: itemObj.unit || 'Units',
        qty,
        rate: Number(itemObj.cost_price || itemObj.rate || 0)
      }
    ]);

    setSelectedStockId('');
    setQuantity('');
  };

  const removeItemFromList = (id) => {
    setConsumptionList(consumptionList.filter(c => c.id !== id));
  };

  const handleSaveConsumption = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!usesFor) return alert('Kripya usage location / purpose darj karein (e.g. Chamber-1 / Tractor).');
    if (consumptionList.length === 0) return alert('Kam se kam ek item consumption list me jodein.');

    try {
      const newRecord = {
        id: 'CONS-' + Date.now(),
        fiscal_year: activeFY,
        date: usageDate,
        uses_for: usesFor,
        items: consumptionList,
        created_at: new Date().toISOString()
      };

      const updatedRecords = [newRecord, ...savedRecords];
      setSavedRecords(updatedRecords);
      saveFirmData('material_consumption_records', firm, updatedRecords);

      const updatedInventory = inventoryItems.map(inv => {
        const matched = consumptionList.find(c => String(c.itemId) === String(inv.id));
        if (matched) {
          return {
            ...inv,
            current_stock: Math.max(0, Number(inv.current_stock || 0) - Number(matched.qty))
          };
        }
        return inv;
      });
      setInventoryItems(updatedInventory);
      saveFirmData('inventory_items', firm, updatedInventory);

      window.dispatchEvent(new Event('app_storage_updated'));
      setFeedback({ type: 'success', message: '✓ Consumption recorded & inventory stock updated successfully!' });

      setUsesFor('');
      setConsumptionList([]);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
            🚜 Multi-Item Fuel & Material Consumption ({activeFY})
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

        <form onSubmit={handleSaveConsumption}>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Date of Usage *
              </label>
              <input 
                type="date" 
                value={usageDate} 
                onChange={e => setUsageDate(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', color: '#475569' }}>
                Uses For / Location *
              </label>
              <input 
                type="text" 
                placeholder="e.g. Chamber-1 / Tractor" 
                value={usesFor} 
                onChange={e => setUsesFor(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#334155', marginBottom: '8px' }}>
              Select Stock Item & Quantity
            </div>

            {/* Fixed Layout: Dropdown on top, Qty and Add button neatly below */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <SearchableStockDropdown 
                firm={firm}
                label=""
                value={selectedStockId}
                onChange={val => setSelectedStockId(val)}
                placeholder="-- Search & Choose Fuel/Stock --"
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter Qty" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
                <button 
                  type="button" 
                  onClick={handleAddToList} 
                  style={{ padding: '9px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {consumptionList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                {consumptionList.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px' }}>
                    <span><strong>{c.name}</strong> - {c.qty} {c.unit}</span>
                    <button type="button" onClick={() => removeItemFromList(c.id)} style={{ color: '#dc2626', border: 'none', background: 'none', fontWeight: 'bold', cursor: 'pointer' }}>✕ Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
          >
            ⚡ Post Material Consumption & Deduct Stock
          </button>

        </form>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
          Consumption History Register ({activeFY})
        </h3>

        {savedRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '11px' }}>
            Koi consumption record darj nahi hai.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedRecords.map(rec => (
              <div key={rec.id} style={{ padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {rec.date} | Location: {rec.uses_for}
                </div>
                <div style={{ color: '#64748b' }}>
                  Items: {(rec.items || []).map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ')}
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

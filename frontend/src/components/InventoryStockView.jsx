import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function InventoryStockView({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [inventoryList, setInventoryList] = useState([]);
  
  // Modal State for Adding Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [openingStock, setOpeningStock] = useState('0');
  const [purchaseRate, setPurchaseRate] = useState('0');

  const loadInventory = () => {
    const items = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
    const firmItems = items.filter(item => !item.firm_id || item.firm_id === activeFirmId);
    setInventoryList(firmItems);
  };

  useEffect(() => {
    loadInventory();
    window.addEventListener('app_state_updated', loadInventory);
    window.addEventListener('app_storage_updated', loadInventory);
    return () => {
      window.removeEventListener('app_state_updated', loadInventory);
      window.removeEventListener('app_storage_updated', loadInventory);
    };
  }, [activeFirmId]);

  // Handle Save New Item
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) return alert('कृपया आइटम का नाम दर्ज करें।');

    try {
      const currentItems = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      
      const newItem = {
        id: `ITEM-${Date.now()}`,
        firm_id: activeFirmId,
        item_name: itemName.trim(),
        item_type: 'PHYSICAL',
        unit: unit,
        current_stock: Number(openingStock || 0),
        unit_purchase_price: Number(purchaseRate || 0),
        created_at: new Date().toISOString()
      };

      const updated = [newItem, ...currentItems];
      StorageService.setItem('inventory_items', updated);
      
      // Dispatch global sync event
      window.dispatchEvent(new Event('app_storage_updated'));

      alert('✓ Item Created Successfully in Master!');
      // Reset & Close Modal
      setItemName('');
      setOpeningStock('0');
      setPurchaseRate('0');
      setIsModalOpen(false);
      loadInventory();
    } catch (err) {
      alert('Error saving item: ' + err.message);
    }
  };

  const handleDeleteItem = (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) return;
    try {
      const allItems = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const updated = allItems.filter(i => String(i.id) !== String(itemId));
      StorageService.setItem('inventory_items', updated);
      loadInventory();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const totalValuation = inventoryList.reduce((sum, item) => {
    const stock = Number(item.current_stock || item.stock || 0);
    const rate = Number(item.unit_purchase_price || item.rate || 0);
    return sum + (stock * rate);
  }, 0);

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      
      {/* Top Header & Action Card */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Perpetual Valuation</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a' }}>📦 Live Stock & Inventory</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>

        {/* 🔥 PROMINENT "+ ADD NEW ITEM" BUTTON */}
        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => setIsModalOpen(true)} 
            style={{ width: '100%', padding: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(2, 132, 199, 0.2)' }}
          >
            + Add New Item to Master
          </button>
        </div>

        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#065f46' }}>Total Valuation:</span>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#047857' }}>
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* INVENTORY LIST CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {inventoryList.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '30px', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            No items found. Click '+ Add New Item to Master' above to create one.
          </div>
        ) : (
          inventoryList.map((item, idx) => {
            const stock = Number(item.current_stock || item.stock || 0);
            const rate = Number(item.unit_purchase_price || item.rate || 0);
            const val = stock * rate;
            return (
              <div key={item.id || idx} style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#0f172a', marginBottom: '2px' }}>{item.item_name || item.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Stock: <strong style={{ color: '#059669' }}>{stock.toFixed(2)} {item.unit || 'Pcs'}</strong> | Rate: ₹{rate.toFixed(2)}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>₹{val.toFixed(2)}</div>
                  <button 
                    onClick={() => handleDeleteItem(item.id, item.item_name || item.name)}
                    style={{ padding: '4px 10px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD ITEM POPUP MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>📦 Create New Item</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Item Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Diesel, Coal, Pakki Eent" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  required 
                  autoFocus 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Measurement Unit *</label>
                <select 
                  value={unit} 
                  onChange={e => setUnit(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff' }}
                >
                  <option value="Pcs">Pcs (पीस)</option>
                  <option value="Liters">Liters (लीटर)</option>
                  <option value="Tonnes">Tonnes (टन)</option>
                  <option value="Kg">Kg (किलो)</option>
                  <option value="Truck">Truck (ट्रक)</option>
                  <option value="Trolley">Trolley (ट्रॉली)</option>
                  <option value="Thousands">Thousands (हजार)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>Opening Stock</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={openingStock} 
                    onChange={e => setOpeningStock(e.target.value)} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>Purchase Rate (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={purchaseRate} 
                    onChange={e => setPurchaseRate(e.target.value)} 
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  + Save Item
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

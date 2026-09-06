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
      window.dispatchEvent(new Event('app_storage_updated'));

      alert('✓ Item Created Successfully in Master!');
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
      
      {/* Top Premium Header & Summary Card */}
      <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', marginBottom: '16px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>Perpetual Valuation</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📦 Live Stock & Inventory</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>

        {/* Action Button */}
        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => setIsModalOpen(true)} 
            style={{ width: '100%', padding: '14px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)', transition: 'all 0.2s' }}
          >
            + Add New Item to Master
          </button>
        </div>

        {/* Total Valuation Display Box */}
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Total Portfolio Value</div>
            <div style={{ fontSize: '10px', color: '#15803d', marginTop: '1px' }}>Real-time stock valuation</div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#15803d' }}>
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* REFINED MOBILE-FRIENDLY CARD LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {inventoryList.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '40px 20px', borderRadius: '16px', color: '#94a3b8', fontSize: '13px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            No items found. Click '+ Add New Item to Master' above to create one.
          </div>
        ) : (
          inventoryList.map((item, idx) => {
            const stock = Number(item.current_stock || item.stock || 0);
            const rate = Number(item.unit_purchase_price || item.rate || 0);
            const val = stock * rate;
            return (
              <div key={item.id || idx} style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
                
                {/* Top Row: Item Name & Delete Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>{item.item_name || item.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>Stock: <strong style={{ color: '#059669' }}>{stock.toFixed(2)} {item.unit || 'Pcs'}</strong></span>
                      <span>•</span>
                      <span>Rate: ₹{rate.toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteItem(item.id, item.item_name || item.name)}
                    style={{ padding: '6px 12px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                  >
                    Delete
                  </button>
                </div>

                {/* Bottom Row: Total Valuation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Valuation</span>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>₹{val.toFixed(2)}</span>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ADD ITEM POPUP MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📦 Create New Item</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Item Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Diesel, Coal, Pakki Eent" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }}
                  required 
                  autoFocus 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Measurement Unit *</label>
                <select 
                  value={unit} 
                  onChange={e => setUnit(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '13px', outline: 'none' }}
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
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Opening Stock</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={openingStock} 
                    onChange={e => setOpeningStock(e.target.value)} 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Purchase Rate (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={purchaseRate} 
                    onChange={e => setPurchaseRate(e.target.value)} 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.2)' }}>
                  + Save Item
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '14px 16px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
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

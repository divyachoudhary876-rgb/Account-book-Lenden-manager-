import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function InventoryValuationView({ firm, onAddItem, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [inventoryList, setInventoryList] = useState([]);

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

  const handleDeleteItem = (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}" from master?`)) return;
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
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Perpetual Valuation</div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#0f172a' }}>📦 Live Stock & Inventory</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          {onAddItem && (
            <button onClick={onAddItem} style={{ padding: '10px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', width: '100%' }}>
              + Add New Item
            </button>
          )}
        </div>

        <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#065f46' }}>Total Valuation:</span>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#047857' }}>
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* MOBILE-RESPONSIVE CARD LIST INSTEAD OF OVERFLOWING TABLE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {inventoryList.length === 0 ? (
          <div style={{ backgroundColor: '#fff', textAlign: 'center', padding: '30px', borderRadius: '12px', color: '#94a3b8', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            No items found. Click '+ Add New Item' to create one.
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
    </div>
  );
}

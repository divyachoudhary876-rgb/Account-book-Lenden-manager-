import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';

export default function InventoryStockView({ firm, onClose }) {
  const [itemsList, setItemsList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // New Item Form State
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('GOODS'); // 'GOODS' or 'SERVICE'
  const [unit, setUnit] = useState('');
  const [openingStock, setOpeningStock] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [salesRate, setSalesRate] = useState('');

  // Load Inventory Data
  const loadInventory = () => {
    const storedItems = StorageService.getInventoryItems() || [];
    setItemsList(storedItems);
  };

  useEffect(() => {
    loadInventory();
    window.addEventListener('app_storage_updated', loadInventory);
    window.addEventListener('storage', loadInventory);
    return () => {
      window.removeEventListener('app_storage_updated', loadInventory);
      window.removeEventListener('storage', loadInventory);
    };
  }, []);

  // 1. BUSINESS LOGIC: Fixed Total Valuation Calculation
  const totalValuation = itemsList.reduce((sum, item) => {
    if (item.item_type === 'SERVICE') return sum; // Services do not have inventory valuation
    const stock = Number(item.current_stock) || 0;
    const rate = Number(item.unit_purchase_price) || 0;
    return sum + (stock * rate);
  }, 0);

  // Handle Save New Item
  const handleSaveItem = (e) => {
    e.preventDefault();
    setFeedback(null);

    const cleanName = itemName.trim();
    if (!cleanName) return setFeedback({ type: 'error', message: 'Item name is required.' });

    // Edge Case: Prevent Duplicate Names
    const existing = itemsList.find(i => String(i.item_name).toLowerCase() === cleanName.toLowerCase());
    if (existing) return setFeedback({ type: 'error', message: 'यह आइटम पहले से मौजूद है!' });

    try {
      const newItem = {
        id: `ITEM-${Date.now()}`,
        firm_id: firm?.id || 'firm_default',
        item_name: cleanName,
        item_type: itemType, // 'GOODS' or 'SERVICE'
        unit: itemType === 'SERVICE' ? 'Service' : unit,
        current_stock: itemType === 'SERVICE' ? 0 : Number(openingStock || 0),
        unit_purchase_price: Number(purchaseRate || 0),
        selling_price: Number(salesRate || 0),
        created_at: new Date().toISOString()
      };

      const updatedInventory = [newItem, ...itemsList];
      StorageService.setItem('inventory_items', updatedInventory); // Automatically triggers cross-app sync

      setFeedback({ type: 'success', message: '✓ Item Added Successfully!' });
      
      // Reset Form & Close Modal
      setItemName(''); setItemType('GOODS'); setUnit(''); setOpeningStock(''); setPurchaseRate(''); setSalesRate('');
      setTimeout(() => {
        setIsModalOpen(false);
        setFeedback(null);
      }, 1500);

    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('क्या आप वाकई इस आइटम को हटाना चाहते हैं?')) return;
    const updatedInventory = itemsList.filter(item => item.id !== id);
    StorageService.setItem('inventory_items', updatedInventory);
    setFeedback({ type: 'success', message: '✓ Item Deleted.' });
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Header & Dashboard Summary */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>Perpetual Valuation</div>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#0f172a' }}>📦 Live Stock & Inventory</h2>
          </div>
          {onClose && <button onClick={onClose} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Dashboard</button>}
        </div>

        <button 
          onClick={() => setIsModalOpen(true)} 
          style={{ padding: '12px 20px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '16px' }}
        >
          + Add New Item
        </button>

        <div style={{ padding: '16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#065f46' }}>Total Valuation:</span>
          <span style={{ fontSize: '20px', fontWeight: '900', color: '#047857' }}>₹{totalValuation.toFixed(2)}</span>
        </div>
      </div>

      {feedback && !isModalOpen && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5', color: feedback.type === 'error' ? '#991b1b' : '#065f46', fontWeight: 'bold' }}>
          {feedback.message}
        </div>
      )}

      {/* Inventory Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: '#0f172a', color: '#fff' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontSize: '12px' }}>Item / Material</th>
                <th style={{ padding: '12px 16px', fontSize: '12px' }}>Unit</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', textAlign: 'right' }}>Stock</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', textAlign: 'right' }}>Avg. Rate</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', textAlign: 'right' }}>Total Value</th>
                <th style={{ padding: '12px 16px', fontSize: '12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {itemsList.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No items found. Click '+ Add New Item' to create one.</td></tr>
              ) : (
                itemsList.map(item => {
                  const stock = Number(item.current_stock) || 0;
                  const rate = Number(item.unit_purchase_price) || 0;
                  const val = item.item_type === 'SERVICE' ? 0 : (stock * rate);
                  
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#1e293b' }}>
                        {item.item_name}
                        {item.item_type === 'SERVICE' && <span style={{ marginLeft: '8px', fontSize: '10px', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>Service</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>{item.unit}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: item.item_type === 'SERVICE' ? '#94a3b8' : '#059669' }}>
                        {item.item_type === 'SERVICE' ? '-' : stock.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px' }}>₹{rate.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold' }}>
                        {item.item_type === 'SERVICE' ? '-' : `₹${val.toFixed(2)}`}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button onClick={() => handleDelete(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Del</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>📦 Create New Item</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✖</button>
            </div>

            {feedback && <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5', color: feedback.type === 'error' ? '#991b1b' : '#065f46' }}>{feedback.message}</div>}

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Item Type *</label>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="GOODS">Physical Goods / Material (भौतिक माल)</option>
                  <option value="SERVICE">Service / Transport / Labor (सेवा / भाड़ा)</option>
                </select>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Services do not track stock quantity.</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Item Name *</label>
                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Pakki Eent (1st Class) / Biomass / Tractor Freight" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
              </div>

              {itemType === 'GOODS' && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Measurement Unit *</label>
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required>
                      <option value="">-- Select Unit --</option>
                      <optgroup label="Brick Kiln Units (ईंट भट्ठा)">
                        <option value="Thousands">Thousands (हज़ार ईंटें)</option>
                        <option value="Pcs">Pcs (Pieces / नग)</option>
                        <option value="Sq.Ft">Sq.Ft (स्क्वायर फीट)</option>
                      </optgroup>
                      <optgroup label="Biomass & Material (कच्चा माल / कोयला)">
                        <option value="MT">MT (Metric Ton)</option>
                        <option value="Quintal">Quintal (क्विंटल)</option>
                        <option value="Kg">Kg (किलोग्राम)</option>
                        <option value="Tonne">Tonne (टन)</option>
                      </optgroup>
                      <optgroup label="Transport & Fuel (भाड़ा / ईंधन)">
                        <option value="Trolley">Trolley (ट्रॉली)</option>
                        <option value="Truck">Truck (ट्रक)</option>
                        <option value="Trip">Trip (फेरा)</option>
                        <option value="Liters">Liters (लीटर)</option>
                      </optgroup>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Opening Stock</label>
                    <input type="number" step="0.01" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Default Purchase Rate (₹)</label>
                  <input type="number" step="0.01" value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Default Sales Rate (₹)</label>
                  <input type="number" step="0.01" value={salesRate} onChange={(e) => setSalesRate(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                + Save Item to Master
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

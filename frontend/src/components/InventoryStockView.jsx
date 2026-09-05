// frontend/src/components/InventoryStockView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../utils/storageSync';

export default function InventoryStockView({ firm, onClose }) {
  const [inventoryList, setInventoryList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [currentStock, setCurrentStock] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [feedback, setFeedback] = useState(null);

  // Sync state with storage
  useEffect(() => {
    const loadInventory = () => {
      const items = StorageService.getInventoryItems();
      setInventoryList(items);
    };

    loadInventory();
    window.addEventListener('app_storage_updated', loadInventory);
    window.addEventListener('storage', loadInventory);
    return () => {
      window.removeEventListener('app_storage_updated', loadInventory);
      window.removeEventListener('storage', loadInventory);
    };
  }, []);

  // Calculate total perpetual valuation safely
  const totalValuation = useMemo(() => {
    return inventoryList.reduce((acc, item) => {
      const stock = Number(item.current_stock || item.stock || 0);
      const rate = Number(item.purchase_rate || item.rate || 0);
      return acc + (stock * rate);
    }, 0);
  }, [inventoryList]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setItemName('');
    setUnit('Pcs');
    setCurrentStock('');
    setPurchaseRate('');
    setSellingPrice('');
    setIsModalOpen(true);
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setItemName(item.item_name || item.name || '');
    setUnit(item.unit || 'Pcs');
    setCurrentStock(String(item.current_stock || item.stock || ''));
    setPurchaseRate(String(item.purchase_rate || item.rate || ''));
    setSellingPrice(String(item.selling_price || item.price || ''));
    setIsModalOpen(true);
  };

  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setFeedback({ type: 'error', message: 'कृपया आइटम का नाम दर्ज करें।' });
      return;
    }

    const newItem = {
      id: editingId || `INV-${Date.now()}`,
      firm_id: firm?.id || 'firm_default',
      item_name: itemName.trim(),
      unit: unit,
      current_stock: Number(currentStock || 0),
      purchase_rate: Number(purchaseRate || 0),
      selling_price: Number(sellingPrice || 0),
      updated_at: new Date().toISOString()
    };

    let updatedList = [];
    if (editingId) {
      updatedList = inventoryList.map(i => i.id === editingId ? newItem : i);
    } else {
      updatedList = [newItem, ...inventoryList];
    }

    StorageService.saveInventoryItems(updatedList);
    setInventoryList(updatedList);
    setIsModalOpen(false);
    setFeedback({ type: 'success', message: '✓ स्टॉक आइटम सफलतापूर्वक सहेजा गया।' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDeleteItem = (id) => {
    if (!window.confirm('क्या आप वाकई इस आइटम को हटाना चाहते हैं?')) return;
    const filtered = inventoryList.filter(i => i.id !== id);
    StorageService.saveInventoryItems(filtered);
    setInventoryList(filtered);
    setFeedback({ type: 'success', message: 'आइटम हटा दिया गया।' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', width: '100%', maxWidth: '100vw', overflowX: 'hidden', color: '#0f172a' }}>
      
      {/* Top Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '14px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          {onClose && (
            <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
              ← Dashboard
            </button>
          )}
          <div style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            Perpetual Valuation
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📦</span>
              <span>Live Stock & Inventory</span>
            </h1>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
              Weighted Average Valuation Method
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            style={{ backgroundColor: '#0284c7', color: '#ffffff', padding: '8px 14px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(2,132,199,0.2)' }}
          >
            + Add New Item
          </button>
        </div>

        {/* Total Valuation Badge */}
        <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#065f46' }}>Total Valuation:</span>
          <span style={{ fontSize: '14px', fontWeight: 900, color: '#047857' }}>
            ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {feedback && (
        <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', backgroundColor: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2', color: feedback.type === 'success' ? '#065f46' : '#991b1b', border: feedback.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
          {feedback.message}
        </div>
      )}

      {/* Inventory Table Card with Horizontal Scroll Fix */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '420px', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                <th style={{ padding: '9px 6px', textAlign: 'left', width: '30%' }}>Item / Material</th>
                <th style={{ padding: '9px 6px', textAlign: 'center', width: '15%' }}>Unit</th>
                <th style={{ padding: '9px 6px', textAlign: 'right', width: '18%' }}>Stock</th>
                <th style={{ padding: '9px 6px', textAlign: 'right', width: '22%' }}>Total Value (₹)</th>
                <th style={{ padding: '9px 6px', textAlign: 'center', width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventoryList.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                    कोई इन्वेंट्री आइटम उपलब्ध नहीं है। ऊपर दिए गए बटन से नया आइटम जोड़ें।
                  </td>
                </tr>
              ) : (
                inventoryList.map((item, idx) => {
                  const stock = Number(item.current_stock || item.stock || 0);
                  const rate = Number(item.purchase_rate || item.rate || 0);
                  const val = stock * rate;
                  return (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '9px 6px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                        {item.item_name || item.name}
                      </td>
                      <td style={{ padding: '9px 6px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                        {item.unit || 'Pcs'}
                      </td>
                      <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                        {stock.toFixed(2)}
                      </td>
                      <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '9px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleStartEdit(item)}
                          style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer', marginRight: '4px' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          style={{ backgroundColor: '#ffe4e6', color: '#9f1239', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' }}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Popup */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            <h2 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
              {editingId ? 'Edit Stock Item' : 'Add New Stock Item'}
            </h2>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '3px' }}>Item / Material Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pakki Eent / Diesel"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  style={{ width: '100%', padding: '9px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '3px' }}>Measurement Unit *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{ width: '100%', padding: '9px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                >
                  <option value="Pcs">Pcs (Pieces / नग)</option>
                  <option value="Liters">Liters (लीटर)</option>
                  <option value="MT">MT (Metric Ton)</option>
                  <option value="Kg">Kg (किलोग्राम)</option>
                  <option value="Trip">Trip (फेरा)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '3px' }}>Current Stock Quantity *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value)}
                  style={{ width: '100%', padding: '9px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '3px' }}>Purchase Cost Rate (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(e.target.value)}
                  style={{ width: '100%', padding: '9px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Save Item
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 14px', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
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

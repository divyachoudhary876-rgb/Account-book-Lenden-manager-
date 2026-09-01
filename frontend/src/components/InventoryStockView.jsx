// frontend/src/components/InventoryStockView.jsx

import React, { useState, useEffect } from 'react';
import { 
  getStockItemsByFirm, 
  saveStockItemMaster, 
  deleteStockItemMaster, 
  STANDARD_MEASUREMENT_UNITS 
} from '../utils/stockInventoryEngine.js';

export default function InventoryStockView({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [stockList, setStockList] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('Pcs');
  const [currentStock, setCurrentStock] = useState('0');
  const [purchaseRate, setPurchaseRate] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');

  const loadStockData = () => {
    const items = getStockItemsByFirm(activeFirmId);
    setStockList(items);
  };

  useEffect(() => {
    loadStockData();
    window.addEventListener('app_state_updated', loadStockData);
    window.addEventListener('stock_updated', loadStockData);
    return () => {
      window.removeEventListener('app_state_updated', loadStockData);
      window.removeEventListener('stock_updated', loadStockData);
    };
  }, [firm, activeFirmId]);

  const openAddModal = () => {
    setEditingId(null);
    setItemName('');
    setUnit('Pcs');
    setCurrentStock('0');
    setPurchaseRate('0');
    setSellingPrice('0');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setItemName(item.item_name);
    setUnit(item.unit || 'Pcs');
    setCurrentStock(item.current_stock.toString());
    setPurchaseRate(item.unit_purchase_price.toString());
    setSellingPrice((item.selling_price || item.unit_purchase_price).toString());
    setShowModal(true);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
      deleteStockItemMaster(activeFirmId, item.id);
      loadStockData();
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert("Item Name is required.");
      return;
    }

    try {
      saveStockItemMaster(activeFirmId, {
        id: editingId,
        item_name: itemName.trim(),
        unit: unit,
        current_stock: currentStock,
        unit_purchase_price: purchaseRate,
        selling_price: sellingPrice
      });

      setShowModal(false);
      loadStockData();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalValuation = stockList.reduce((acc, curr) => {
    return acc + (parseFloat(curr.current_stock || 0) * parseFloat(curr.unit_purchase_price || 0));
  }, 0);

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📦</span> Live Stock & Inventory
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Perpetual Inventory Valuation (Weighted Average)</span>
        </div>
        <button 
          onClick={openAddModal} 
          style={{ backgroundColor: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ➕ Add New Item
        </button>
      </div>

      {/* Valuation Badge */}
      <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'inline-block' }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#059669' }}>
          Total Valuation: ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '650px' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left' }}>Item / Material</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Unit</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Current Stock</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg Cost Rate (₹)</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Value (₹)</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stockList.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                  No inventory items found. Click <strong>"+ Add New Item"</strong> to create items.
                </td>
              </tr>
            ) : (
              stockList.map(item => {
                const stock = parseFloat(item.current_stock || 0);
                const rate = parseFloat(item.unit_purchase_price || 0);
                const value = stock * rate;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: '#1e293b' }}>
                      {item.item_name}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        {item.unit || 'Units'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: stock > 0 ? '#059669' : '#dc2626' }}>
                      {stock.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                      ₹{rate.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: '#1e40af' }}>
                      ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button 
                        onClick={() => openEditModal(item)} 
                        title="Edit Item" 
                        style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', marginRight: '6px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(item)} 
                        title="Delete Item" 
                        style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Item Modal */}
      {showModal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>
                {editingId ? '✏️ Edit Stock Item' : '➕ Add New Stock Item'}
              </h4>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Item / Material Name *</label>
                <input 
                  type="text" 
                  placeholder="e.g. Raw Material A / Finished Item / Fuel" 
                  value={itemName} 
                  onChange={e => setItemName(e.target.value)} 
                  style={inputStyle} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Measurement Unit (मात्रक) *</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }}>
                    <optgroup label="Quantity & Count (संख्या / गिनती)">
                      <option value="Pcs">Pcs (Pieces / नग)</option>
                      <option value="Thousand">Thousand (हजार / K)</option>
                      <option value="Dozens">Dozens (दर्जन)</option>
                      <option value="Units">Units (इकाई)</option>
                    </optgroup>
                    <optgroup label="Weight & Mass (भार / वजन)">
                      <option value="MT">MT (Metric Ton / मीट्रिक टन)</option>
                      <option value="Quintal">Quintal (क्विंटल)</option>
                      <option value="Kg">Kg (Kilogram / किलोग्राम)</option>
                      <option value="Grams">Grams (ग्राम)</option>
                    </optgroup>
                    <optgroup label="Volume & Liquid (आयतन / तरल)">
                      <option value="Liters">Liters (लीटर)</option>
                      <option value="KL">KL (Kiloliter / किलोलीटर)</option>
                      <option value="ML">ML (Milliliter / मिलीलीटर)</option>
                    </optgroup>
                    <optgroup label="Logistics & Volume (ढुलाई / घन आयतन)">
                      <option value="Trips">Trips (ट्रिप / चक्कर)</option>
                      <option value="Trolley">Trolley (ट्रॉली)</option>
                      <option value="Dumper">Dumper (डंपर)</option>
                      <option value="Gadi">Gadi (गाड़ी / ट्रक लोड)</option>
                      <option value="Brass">Brass (ब्रास)</option>
                      <option value="CFT">CFT (Cubic Feet / घन फीट)</option>
                      <option value="CBM">CBM (Cubic Meter / घन मीटर)</option>
                    </optgroup>
                    <optgroup label="Packaging (पैकिंग)">
                      <option value="Bags">Bags (थैली / कट्टा / बोरी)</option>
                      <option value="Boxes">Boxes (पेटी / कार्टन)</option>
                      <option value="Bundles">Bundles (बंडल / गट्ठा)</option>
                      <option value="Rolls">Rolls (रोल)</option>
                    </optgroup>
                    <optgroup label="Length & Area (लम्बाई / क्षेत्रफल)">
                      <option value="Meters">Meters (मीटर)</option>
                      <option value="Feet">Feet (फीट)</option>
                      <option value="SqFt">Sq. Ft. (वर्ग फीट)</option>
                      <option value="SqYards">Sq. Yards (वर्ग गज)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Current Stock</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    value={currentStock} 
                    onChange={e => setCurrentStock(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Purchase Cost Rate (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={purchaseRate} 
                    onChange={e => setPurchaseRate(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
                <div>
                  <label style={labelStyle}>Selling Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={sellingPrice} 
                    onChange={e => setSellingPrice(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ flex: 2, backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  💾 Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' };
const modalBoxStyle = { backgroundColor: '#ffffff', borderRadius: '12px', padding: '18px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };

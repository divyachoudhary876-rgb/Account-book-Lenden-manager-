// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getSupplierAccounts } from '../utils/accountMasterEngine.js';
import { getStockItemsByFirm, updateStockMovement } from '../utils/stockInventoryEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [billNo, setBillNo] = useState(`SUP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [qty, setQty] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    const suppList = getSupplierAccounts(activeFirmId);
    setSuppliers(suppList);
    if (suppList.length > 0) setSelectedSupplier(suppList[0].id);

    const itemsList = getStockItemsByFirm(activeFirmId);
    setStockItems(itemsList);
    if (itemsList.length > 0) setSelectedItem(itemsList[0].id);
  }, [activeFirmId]);

  const totalAmount = (parseFloat(qty || 0) * parseFloat(unitRate || 0)).toFixed(2);

  const handleSavePurchase = (e) => {
    e.preventDefault();
    if (!qty || parseFloat(qty) <= 0) return alert("❌ Please enter valid Inward Quantity.");
    if (!unitRate || parseFloat(unitRate) <= 0) return alert("❌ Please enter valid Unit Purchase Rate.");

    try {
      updateStockMovement(activeFirmId, selectedItem, qty, 'PURCHASE_IN', billNo, unitRate);
      alert(`✓ Purchase Inward & Stock (+IN) updated successfully! Total Bill: ₹${totalAmount}`);
      setQty('');
      setUnitRate('');
      setNarration('');
    } catch (err) {
      alert(`❌ Stock Update Failed: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>🛍️ Purchase Inward & Stock Entry</h3>

      <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Supplier Account Dropdown */}
        <div>
          <label style={labelStyle}>Supplier / Creditor Account *</label>
          <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={inputStyle}>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>🏬 {s.name} ({s.group_type})</option>
            ))}
          </select>
        </div>

        {/* Stock Item Dropdown */}
        <div>
          <label style={labelStyle}>Select Stock Item to Inward (+IN) *</label>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle}>
            {stockItems.map(item => (
              <option key={item.id} value={item.id}>📦 {item.item_name} (Current Stock: {item.current_stock} {item.unit})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Inward Quantity *</label>
            <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Unit Purchase Rate (₹) *</label>
            <input type="number" placeholder="Rate" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Total Bill Amount (₹)</label>
            <input type="text" value={totalAmount} readOnly style={{ ...inputStyle, backgroundColor: '#f1f5f9', fontWeight: 'bold' }} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Supplier Bill / Ref No *</label>
          <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} style={inputStyle} required />
        </div>

        <div>
          <label style={labelStyle}>Stock Inward Particulars</label>
          <input type="text" placeholder="Raw material purchase details..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
          💾 Save Purchase Bill & Update Stock (+IN)
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

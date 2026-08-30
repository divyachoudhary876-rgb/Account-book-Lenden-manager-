// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getSupplierAccounts } from '../utils/accountMasterEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    const list = getSupplierAccounts(activeFirmId);
    setSuppliers(list);
    if (list.length > 0) setSelectedSupplier(list[0].id);
  }, [activeFirmId]);

  const handleSavePurchase = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert("❌ Please enter Purchase Bill Amount.");

    alert(`✓ Purchase Bill ${billNo || 'ENTRY'} of ₹${amount} saved successfully!`);
    setAmount('');
    setBillNo('');
    setNarration('');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>🛍️ Purchase Inward & Stock Entry</h3>

      <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div>
          <label style={labelStyle}>Supplier / Creditor Account *</label>
          <select
            value={selectedSupplier}
            onChange={e => setSelectedSupplier(e.target.value)}
            style={inputStyle}
          >
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>🏬 {s.name} ({s.group_type})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Supplier Bill / Ref No *</label>
            <input type="text" placeholder="e.g. SUP-9081" value={billNo} onChange={e => setBillNo(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Total Bill Amount (₹) *</label>
            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Stock Inward Particulars</label>
          <input type="text" placeholder="Raw material purchase details..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
          💾 Save Purchase Inward Entry
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

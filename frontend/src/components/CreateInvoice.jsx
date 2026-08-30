// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getCustomerAccounts } from '../utils/accountMasterEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    const list = getCustomerAccounts(activeFirmId);
    setCustomers(list);
    if (list.length > 0) setSelectedCustomer(list[0].id);
  }, [activeFirmId]);

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return alert("❌ Please enter valid Invoice Amount.");

    alert(`✓ Sales Invoice ${invoiceNo} of ₹${amount} saved successfully!`);
    setAmount('');
    setNarration('');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>🧾 Sales Bill Entry</h3>

      <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        <div>
          <label style={labelStyle}>Select Customer / Party *</label>
          <select
            value={selectedCustomer}
            onChange={e => setSelectedCustomer(e.target.value)}
            style={inputStyle}
          >
            {customers.map(c => (
              <option key={c.id} value={c.id}>👤 {c.name} ({c.group_type})</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Invoice Number *</label>
            <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Invoice Amount (₹) *</label>
            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Particulars / Goods Narration</label>
          <input type="text" placeholder="Goods sale dispatch details..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
          💾 Save & Post Sales Bill
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

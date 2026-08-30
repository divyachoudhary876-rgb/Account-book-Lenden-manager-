// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { recordPurchaseInvoice } from '../utils/purchasePostingEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const [accounts, setAccounts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [formData, setFormData] = useState({
    supplierAccId: '',
    supplierInvoiceNo: '',
    invoiceDate: '2026-08-30',
    itemId: '',
    qty: '',
    rate: '',
    gstRate: '18'
  });

  useEffect(() => {
    const accList = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    const invList = JSON.parse(localStorage.getItem('app_inventory') || '[]');
    setAccounts(accList);
    setInventory(invList);
    if (accList.length > 0) setFormData(prev => ({ ...prev, supplierAccId: accList[0].name }));
    if (invList.length > 0) setFormData(prev => ({ ...prev, itemId: invList[0].id }));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const res = recordPurchaseInvoice(formData);
      alert(`✓ Purchase Inward Bill #${formData.supplierInvoiceNo} saved! Total Amount: ₹${res.totalAmount}`);
      setFormData({ ...formData, supplierInvoiceNo: '', qty: '', rate: '' });
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🛍️ Purchase Inward & Raw Material Entry</h3>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Supplier / Creditor Account *</label>
            <select value={formData.supplierAccId} onChange={e => setFormData({...formData, supplierAccId: e.target.value})} style={inputStyle}>
              {accounts.map((a, idx) => (
                <option key={a.id || idx} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Supplier Invoice / Bill No. *</label>
            <input type="text" placeholder="e.g. INV-9081" value={formData.supplierInvoiceNo} onChange={e => setFormData({...formData, supplierInvoiceNo: e.target.value})} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Select Stock Item *</label>
            <select value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} style={inputStyle}>
              {inventory.map((item, idx) => (
                <option key={item.id || idx} value={item.id}>{item.item_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Inward Quantity *</label>
            <input type="number" placeholder="Qty" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Unit Purchase Rate (₹) *</label>
            <input type="number" placeholder="Rate" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} style={inputStyle} required />
          </div>
        </div>

        <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '10px' }}>
          💾 Save Purchase Bill & Update Stock (+IN)
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getCustomerAccounts } from '../utils/accountMasterEngine.js';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { processSalesInvoiceSubmission } from '../utils/salesInvoicingEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id;

  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [gstPercent, setGstPercent] = useState('18');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    loadDropdowns();
    const handleStorageChange = () => loadDropdowns();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [firm]);

  const loadDropdowns = () => {
    const custs = getCustomerAccounts(activeFirmId);
    setCustomers(custs);
    if (custs.length > 0 && !selectedCustomer) setSelectedCustomer(custs[0].id);

    const items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].id);
  };

  // Live Auto Calculations
  const quantityNum = parseFloat(qty || 0);
  const rateNum = parseFloat(rate || 0);
  const taxableVal = quantityNum * rateNum;
  const gstRateNum = parseFloat(gstPercent || 0);
  const totalTax = (taxableVal * gstRateNum) / 100;
  const cgst = totalTax / 2;
  const sgst = totalTax / 2;
  const grandTotal = taxableVal + totalTax;

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    if (quantityNum <= 0) return alert("❌ Please enter valid Sales Quantity.");
    if (rateNum <= 0) return alert("❌ Please enter valid Unit Selling Rate.");

    try {
      processSalesInvoiceSubmission(activeFirmId, {
        customer_account_id: selectedCustomer,
        stock_item_id: selectedItem,
        invoice_no: invoiceNo,
        quantity: quantityNum,
        unit_rate: rateNum,
        taxable_amount: taxableVal.toFixed(2),
        cgst_amount: cgst.toFixed(2),
        sgst_amount: sgst.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        narration: narration
      });

      alert(`✓ GST Sales Invoice ${invoiceNo} saved & Stock (-OUT) deducted successfully! Total: ₹${grandTotal.toFixed(2)}`);
      setQty('');
      setRate('');
      setNarration('');
      setInvoiceNo(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err) {
      alert(`❌ Invoicing Failed: ${err.message}`);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>🧾 Enterprise GST Sales Bill Entry</h3>

      <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Customer Selection */}
        <div>
          <label style={labelStyle}>Select Customer / Party Account *</label>
          <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={inputStyle}>
            {customers.map(c => (
              <option key={c.id} value={c.id}>👤 {c.name} ({c.group_type})</option>
            ))}
          </select>
        </div>

        {/* Stock Item Selection */}
        <div>
          <label style={labelStyle}>Select Stock Item to Dispatch (-OUT) *</label>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle}>
            {stockItems.map(item => (
              <option key={item.id} value={item.id}>📦 {item.item_name} (Avail Stock: {item.current_stock} {item.unit})</option>
            ))}
          </select>
        </div>

        {/* Line Items Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" placeholder="Qty" value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Selling Unit Rate (₹) *</label>
            <input type="number" placeholder="Rate" value={rate} onChange={e => setRate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>GST Tax Rate</label>
            <select value={gstPercent} onChange={e => setGstPercent(e.target.value)} style={inputStyle}>
              <option value="0">0% (Exempted)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        {/* Live Tax Breakdown Summary Card */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px', color: '#1e40af' }}>
          <div><strong>Taxable Amount:</strong> ₹{taxableVal.toFixed(2)}</div>
          <div><strong>CGST + SGST:</strong> ₹{cgst.toFixed(2)} + ₹{sgst.toFixed(2)}</div>
          <div><strong style={{ fontSize: '13px', color: '#1e3a8a' }}>Grand Total: ₹{grandTotal.toFixed(2)}</strong></div>
        </div>

        <div>
          <label style={labelStyle}>Invoice Number *</label>
          <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={inputStyle} required />
        </div>

        <div>
          <label style={labelStyle}>Particulars / Dispatch Notes</label>
          <input type="text" placeholder="Truck No, e-Way Ref..." value={narration} onChange={e => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
          💾 Save & Post Sales Bill (Deduct Stock -OUT)
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

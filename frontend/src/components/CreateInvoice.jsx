// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processSalesInvoiceSubmission } from '../utils/salesInvoicingEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(100000 + Math.random() * 900000)}`);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('accounts_master_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('accounts_master_updated', loadData);
    };
  }, [firm]);

  const loadData = () => {
    const accs = getAccountHeads(activeFirmId);
    setCustomers(accs);
    if (accs.length > 0 && !selectedCustomer) setSelectedCustomer(accs[0].account_name);

    let items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].item_name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const res = processSalesInvoiceSubmission(activeFirmId, {
        customer_account: selectedCustomer,
        item_name: selectedItem,
        quantity,
        unit_rate: unitRate,
        voucher_date: invoiceDate,
        invoice_number: invoiceNumber
      });

      alert(`✓ Sales Invoice Generated!\n• Voucher: ${res.voucherId}\n• Debited Customer: ${res.party} (₹${res.totalAmount})\n• Stock Deducted (-OUT): ${res.updatedStock} Units remaining`);

      setQuantity('');
      setUnitRate('');
      setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>🧾 Create Sales Invoice</h3>
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Invoice Date *</label>
            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Invoice No *</label>
            <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Customer Account (Debtor) *</label>
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={inputStyle} required>
              {customers.map(c => <option key={c.id} value={c.account_name}>{c.account_name} ({c.account_group || 'GENERAL'})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock Item (-OUT) *</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
              {stockItems.map(i => <option key={i.id} value={i.item_name}>{i.item_name} (Avail: {i.current_stock} {i.unit || 'Units'})</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" step="0.01" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Selling Rate (₹) *</label>
            <input type="number" step="0.01" placeholder="Rate (₹)" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', width: '100%', marginTop: '6px', cursor: 'pointer', fontSize: '13px' }}>
          🧾 Post Sale & Sync Everything
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };

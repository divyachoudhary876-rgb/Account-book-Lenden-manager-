// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processSalesInvoiceSubmission, quickCreateCustomerAccount } from '../utils/salesInvoicingEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'NEELKANTH ENTERPRISES';

  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(100000 + Math.random() * 900000)}`);

  const [showModal, setShowModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [printableInvoice, setPrintableInvoice] = useState(null);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [firm]);

  const loadData = () => {
    const accs = getAccountHeads(activeFirmId);
    setCustomerAccounts(accs);
    if (accs.length > 0 && !selectedCustomer) setSelectedCustomer(accs[0].account_name);

    const items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].id);

    setSalesHistory(JSON.parse(localStorage.getItem(`app_sales_invoices_${activeFirmId}`) || '[]'));
  };

  const currentItemObj = stockItems.find(i => i.id === selectedItem || i.item_name === selectedItem);

  const qtyNum = parseFloat(quantity || 0);
  const rateNum = parseFloat(unitRate || 0);
  const gstNum = parseFloat(gstRate || 0);
  const taxableAmount = (qtyNum * rateNum).toFixed(2);
  const taxAmount = (parseFloat(taxableAmount) * (gstNum / 100)).toFixed(2);
  const grandTotal = (parseFloat(taxableAmount) + parseFloat(taxAmount)).toFixed(2);

  const handleCreateAcc = (e) => {
    e.preventDefault();
    try {
      const created = quickCreateCustomerAccount(activeFirmId, { account_name: newAccName });
      setShowModal(false);
      setNewAccName('');
      loadData();
      setSelectedCustomer(created.account_name);
    } catch (err) { alert(err.message); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const invoiceData = processSalesInvoiceSubmission(activeFirmId, {
        customer_account: selectedCustomer,
        item_id: currentItemObj?.id,
        item_name: currentItemObj?.item_name,
        quantity, unit_rate: unitRate, gst_rate: gstRate,
        taxable_amount: taxableAmount, tax_amount: taxAmount, grand_total: grandTotal,
        invoice_number: invoiceNumber
      });
      alert(`✓ Sales Invoice #${invoiceData.id} posted!`);
      setPrintableInvoice(invoiceData);
      setQuantity(''); setUnitRate('');
      setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
      loadData();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🧾 Enterprise GST Sales Bill Entry</h3>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateAcc} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '360px', width: '100%' }}>
            <h4>➕ Quick Add Customer Account</h4>
            <input type="text" placeholder="Customer Name *" value={newAccName} onChange={e => setNewAccName(e.target.value)} style={inputStyle} required />
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={btnStyle('#2563eb')}>Save</button>
              <button type="button" onClick={() => setShowModal(false)} style={btnStyle('#64748b')}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {printableInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '480px', width: '100%' }}>
            <h2>{firmName}</h2>
            <p><strong>Invoice No:</strong> {printableInvoice.id} | <strong>Billed To:</strong> {printableInvoice.customer_account}</p>
            <p><strong>Item:</strong> {printableInvoice.item_name} (Qty: {printableInvoice.quantity})</p>
            <h3>Grand Total: ₹{printableInvoice.grand_total}</h3>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => window.print()} style={btnStyle('#2563eb')}>🖨️ Download PDF</button>
              <button onClick={() => setPrintableInvoice(null)} style={btnStyle('#64748b')}>Close</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={labelStyle}>Customer Account *</label>
          <button type="button" onClick={() => setShowModal(true)} style={{ color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>+ New Customer</button>
        </div>
        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={inputStyle} required>
          {customerAccounts.map(a => <option key={a.id} value={a.account_name}>{a.account_name}</option>)}
        </select>

        <label style={labelStyle}>Stock Item (-OUT) *</label>
        <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
          {stockItems.map(i => <option key={i.id} value={i.id}>{i.item_name} (Avail: {i.current_stock} {i.unit})</option>)}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          <input type="number" placeholder="Rate" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          
          {/* Complete GST Slabs List Including 0% */}
          <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={inputStyle}>
            <option value="0">0% GST (Exempt)</option>
            <option value="5">5% GST</option>
            <option value="12">12% GST</option>
            <option value="18">18% GST</option>
            <option value="28">28% GST</option>
          </select>
        </div>

        <button type="submit" style={{ ...btnStyle('#2563eb'), width: '100%', padding: '10px', marginTop: '10px' }}>💾 Save & Post Sales Invoice</button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead><tr style={{ backgroundColor: '#0f172a', color: '#fff' }}><th style={{ padding: '8px' }}>Inv #</th><th style={{ padding: '8px' }}>Customer</th><th style={{ padding: '8px' }}>Total</th><th style={{ padding: '8px' }}>Action</th></tr></thead>
          <tbody>
            {salesHistory.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>{s.id}</td>
                <td style={{ padding: '8px' }}>{s.customer_account}</td>
                <td style={{ padding: '8px' }}>₹{s.grand_total}</td>
                <td style={{ padding: '8px' }}><button onClick={() => setPrintableInvoice(s)} style={btnStyle('#2563eb')}>📄 PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' };
const btnStyle = (bg) => ({ backgroundColor: bg, color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' });

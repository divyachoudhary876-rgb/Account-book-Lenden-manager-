// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { 
  processSalesInvoiceSubmission, 
  getSalesInvoicesByFirm, 
  deleteSalesInvoice 
} from '../utils/salesInvoicingEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'Aa (TRADING)';

  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);

  // Form States
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Selected Invoice for Download/View Modal
  const [viewInvoice, setViewInvoice] = useState(null);

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
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].item_name);

    setInvoicesList(getSalesInvoicesByFirm(activeFirmId));
  };

  // Live Amount Calculations
  const qtyNum = parseFloat(quantity || 0);
  const rateNum = parseFloat(unitRate || 0);
  const gstNum = parseFloat(gstRate || 0);

  const taxableAmount = (qtyNum * rateNum).toFixed(2);
  const taxAmount = (parseFloat(taxableAmount) * (gstNum / 100)).toFixed(2);
  const grandTotal = (parseFloat(taxableAmount) + parseFloat(taxAmount)).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const selectedItemObj = stockItems.find(i => i.item_name === selectedItem);
      const payload = {
        customer_account: selectedCustomer,
        item_id: selectedItemObj?.id || selectedItem,
        item_name: selectedItem,
        quantity,
        unit_rate: unitRate,
        gst_rate: gstRate,
        taxable_amount: taxableAmount,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        invoice_number: invoiceNumber,
        dispatch_notes: dispatchNotes
      };

      const created = processSalesInvoiceSubmission(activeFirmId, payload);
      alert(`✓ Sales Invoice #${created.id} Posted Successfully!\n• Stock Deducted (-OUT)\n• Journal & Account Milan Updated`);
      
      // Reset Form
      setQuantity('');
      setUnitRate('');
      setDispatchNotes('');
      setInvoiceNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(`⚠️ Delete Invoice #${id}? Stock and Journal Entries will be reversed.`)) {
      deleteSalesInvoice(activeFirmId, id);
      loadData();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🧾 Enterprise GST Sales Bill Entry</h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Firm: {firmName}</span>
      </div>

      {/* Printable Invoice Modal */}
      {viewInvoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '100%', border: '1px solid #cbd5e1' }}>
            <div id="printable-invoice">
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#1e3a8a' }}>{firmName}</h3>
                <div style={{ fontSize: '11px', color: '#475569' }}>TAX INVOICE / BILL OF SUPPLY</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '12px' }}>
                <div><strong>Invoice No:</strong> {viewInvoice.id}<br/><strong>Date:</strong> {viewInvoice.date}</div>
                <div><strong>Customer:</strong> {viewInvoice.customer_account}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #cbd5e1' }}>Item</th>
                    <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Qty</th>
                    <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Rate</th>
                    <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px', border: '1px solid #cbd5e1' }}>{viewInvoice.item_name}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{viewInvoice.quantity}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>₹{viewInvoice.unit_rate}</td>
                    <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #cbd5e1' }}>₹{viewInvoice.taxable_amount}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: '12px', textAlign: 'right', lineHeight: '1.6' }}>
                <div>Taxable Amount: ₹{viewInvoice.taxable_amount}</div>
                <div>GST ({viewInvoice.gst_rate}%): ₹{viewInvoice.tax_amount}</div>
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e3a8a' }}>Grand Total: ₹{viewInvoice.grand_total}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setViewInvoice(null)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Close</button>
              <button onClick={handlePrint} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>🖨️ Download / Print PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Entry Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '24px' }}>
        
        <div>
          <label style={labelStyle}>Select Customer / Party Account *</label>
          <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={inputStyle} required>
            {customerAccounts.map(acc => <option key={acc.id} value={acc.account_name}>{acc.account_name}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Select Stock Item to Dispatch (-OUT) *</label>
          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
            {stockItems.map(item => <option key={item.id} value={item.item_name}>{item.item_name} (Avail Stock: {item.current_stock} {item.unit})</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" step="0.01" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Selling Unit Rate (₹) *</label>
            <input type="number" step="0.01" placeholder="Rate" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>GST Tax Rate</label>
            <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={inputStyle}>
              <option value="0">0% GST</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST</option>
              <option value="28">28% GST</option>
            </select>
          </div>
        </div>

        {/* Realtime Summary Card */}
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '10px', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px', color: '#1e40af' }}>
          <div><strong>Taxable:</strong> ₹{taxableAmount}</div>
          <div><strong>CGST + SGST:</strong> ₹{taxAmount}</div>
          <div><strong>Grand Total:</strong> <span style={{ fontSize: '13px', fontWeight: 'bold' }}>₹{grandTotal}</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Invoice Number *</label>
            <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Particulars / Dispatch Notes</label>
            <input type="text" placeholder="Truck No, e-Way Ref..." value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
          💾 Save & Post Sales Bill (Deduct Stock - OUT)
        </button>
      </form>

      {/* Generated Invoices List & Download Actions */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
          📋 Generated Sales Invoices History
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Invoice #</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Grand Total</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoicesList.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>No sales invoices generated yet.</td></tr>
              ) : (
                invoicesList.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#2563eb' }}>{inv.id}</td>
                    <td style={{ padding: '8px' }}>{inv.customer_account}</td>
                    <td style={{ padding: '8px' }}>{inv.item_name}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{inv.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>₹{inv.grand_total}</td>
                    <td style={{ padding: '8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setViewInvoice(inv)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', marginRight: '4px' }}>📄 View / Print</button>
                      <button onClick={() => handleDelete(inv.id)} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };

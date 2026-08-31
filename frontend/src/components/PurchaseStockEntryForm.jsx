// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processPurchaseInvoiceSubmission, getPurchaseInvoicesByFirm } from '../utils/salesInvoicingEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const firmName = firm?.legal_name || 'NEELKANTH ENTERPRISES';

  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);

  const [viewPurchasePdf, setViewPurchasePdf] = useState(null);

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [firm]);

  const loadData = () => {
    const accs = getAccountHeads(activeFirmId);
    setSuppliers(accs);
    if (accs.length > 0 && !selectedSupplier) setSelectedSupplier(accs[0].account_name);

    const items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].item_name);

    setPurchaseList(getPurchaseInvoicesByFirm(activeFirmId));
  };

  const qtyNum = parseFloat(quantity || 0);
  const rateNum = parseFloat(unitRate || 0);
  const taxableAmount = (qtyNum * rateNum).toFixed(2);
  const grandTotal = (parseFloat(taxableAmount) * 1.18).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const payload = {
        supplier_account: selectedSupplier,
        item_name: selectedItem,
        quantity,
        unit_rate: unitRate,
        grand_total: grandTotal,
        invoice_number: invoiceNumber
      };

      const entry = processPurchaseInvoiceSubmission(activeFirmId, payload);
      alert(`✓ Purchase Inward Bill #${entry.id} saved! Stock increased (+IN).`);
      setQuantity('');
      setUnitRate('');
      setInvoiceNumber(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);
      loadData();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🛍️ Purchase Inward Entry & Stock Addition</h3>

      {viewPurchasePdf && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '480px', width: '100%' }}>
            <h4>PURCHASE INWARD VOUCHER: {viewPurchasePdf.id}</h4>
            <p><strong>Supplier:</strong> {viewPurchasePdf.supplier_account}</p>
            <p><strong>Item Received:</strong> {viewPurchasePdf.item_name} (Qty: {viewPurchasePdf.quantity})</p>
            <p><strong>Grand Total:</strong> ₹{viewPurchasePdf.grand_total}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button onClick={() => setViewPurchasePdf(null)} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>Close</button>
              <button onClick={() => window.print()} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>🖨️ Print PDF</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Supplier Account</label>
            <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={inputStyle}>
              {suppliers.map(s => <option key={s.id} value={s.account_name}>{s.account_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock Item to Receive (+IN)</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle}>
              {stockItems.map(i => <option key={i.id} value={i.item_name}>{i.item_name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          <input type="number" placeholder="Purchase Rate (₹)" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          <input type="text" placeholder="Bill No" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} required />
        </div>

        <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', width: '100%', marginTop: '10px', cursor: 'pointer' }}>
          🛍️ Post Purchase & Add Stock (+IN)
        </button>
      </form>

      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', backgroundColor: '#0f172a', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
          📋 Purchase Inward History Records
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '8px', textAlign: 'left' }}>Bill #</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>Supplier</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {purchaseList.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '12px', color: '#94a3b8' }}>No purchase records found.</td></tr>
            ) : (
              purchaseList.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.id}</td>
                  <td style={{ padding: '8px' }}>{p.supplier_account}</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>₹{p.grand_total}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button onClick={() => setViewPurchasePdf(p)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>📄 Download PDF</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

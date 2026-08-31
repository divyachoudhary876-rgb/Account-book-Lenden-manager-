// frontend/src/components/CreateInvoice.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processSalesInvoiceSubmission } from '../utils/salesInvoicingEngine.js';

export default function CreateInvoice({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(100000 + Math.random() * 900000)}`);

  useEffect(() => {
    loadAccountsAndStock();
    window.addEventListener('storage', loadAccountsAndStock);
    window.addEventListener('accounts_master_updated', loadAccountsAndStock);
    return () => {
      window.removeEventListener('storage', loadAccountsAndStock);
      window.removeEventListener('accounts_master_updated', loadAccountsAndStock);
    };
  }, [firm]);

  const loadAccountsAndStock = () => {
    const accs = getAccountHeads(activeFirmId);
    setCustomerAccounts(accs);
    if (accs.length > 0 && !selectedCustomer) setSelectedCustomer(accs[0].account_name);

    const items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert("⚠️ Select an Account!");
      return;
    }
    try {
      const selectedItemObj = stockItems.find(i => i.id === selectedItem || i.item_name === selectedItem);
      const qtyNum = parseFloat(quantity || 0);
      const rateNum = parseFloat(unitRate || 0);
      const gstNum = parseFloat(gstRate || 0);
      const taxable = (qtyNum * rateNum).toFixed(2);
      const tax = (parseFloat(taxable) * (gstNum / 100)).toFixed(2);
      const total = (parseFloat(taxable) + parseFloat(tax)).toFixed(2);

      const invoiceData = processSalesInvoiceSubmission(activeFirmId, {
        customer_account: selectedCustomer,
        item_id: selectedItemObj?.id,
        item_name: selectedItemObj?.item_name,
        quantity, unit_rate: unitRate, gst_rate: gstRate,
        taxable_amount: taxable, tax_amount: tax, grand_total: total,
        invoice_number: invoiceNumber
      });
      alert(`✓ Sales Invoice #${invoiceData.id} posted!`);
      setQuantity(''); setUnitRate('');
      setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
      loadAccountsAndStock();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🧾 Enterprise GST Sales Bill Entry</h3>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <label style={labelStyle}>Select Party / Customer Account (From Master List) *</label>
        <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={inputStyle} required>
          {customerAccounts.length === 0 ? (
            <option value="">No Accounts Found!</option>
          ) : (
            customerAccounts.map(a => (
              <option key={a.id} value={a.account_name}>{a.account_name} ({a.account_group || 'GENERAL'})</option>
            ))
          )}
        </select>

        <label style={labelStyle}>Select Stock Item (-OUT) *</label>
        <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
          {stockItems.map(i => <option key={i.id} value={i.id}>{i.item_name} (Avail: {i.current_stock} {i.unit})</option>)}
        </select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          <input type="number" placeholder="Rate" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={inputStyle}>
            <option value="0">0% GST</option>
            <option value="5">5% GST</option>
            <option value="12">12% GST</option>
            <option value="18">18% GST</option>
            <option value="28">28% GST</option>
          </select>
        </div>

        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', width: '100%', marginTop: '10px', cursor: 'pointer' }}>
          💾 Save & Post Sales Invoice
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' };

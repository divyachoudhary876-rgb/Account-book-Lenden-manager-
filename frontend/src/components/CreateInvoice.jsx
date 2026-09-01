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

    const items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].item_name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const grandTotal = (parseFloat(quantity || 0) * parseFloat(unitRate || 0)).toFixed(2);
      const payload = {
        customer_account: selectedCustomer,
        item_name: selectedItem,
        quantity,
        unit_rate: unitRate,
        grand_total: grandTotal,
        invoice_number: invoiceNumber
      };

      const inv = processSalesInvoiceSubmission(activeFirmId, payload);
      alert(`✓ Sales Invoice ${inv.id} Generated Successfully!`);
      setQuantity('');
      setUnitRate('');
      setInvoiceNumber(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
      loadData();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🧾 Create Sales Invoice</h3>
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Customer Account *</label>
            <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ width: '100%', padding: '8px' }}>
              {customers.map(c => <option key={c.id} value={c.account_name}>{c.account_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>Stock Item *</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={{ width: '100%', padding: '8px' }}>
              {stockItems.map(i => <option key={i.id} value={i.item_name}>{i.item_name} (Avail: {i.current_stock})</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <input type="number" placeholder="Qty" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ padding: '8px' }} required />
          <input type="number" placeholder="Rate (₹)" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={{ padding: '8px' }} required />
          <input type="text" placeholder="Invoice No" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={{ padding: '8px' }} required />
        </div>
        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', width: '100%', marginTop: '10px' }}>
          💾 Save Sales Invoice
        </button>
      </form>
    </div>
  );
}

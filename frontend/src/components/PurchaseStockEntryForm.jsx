// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { processPurchaseInvoiceSubmission } from '../utils/salesInvoicingEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);

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
    // Strictly fetch accounts from Create Account Head List
    const accs = getAccountHeads(activeFirmId);
    setSuppliers(accs);
    if (accs.length > 0 && !selectedSupplier) setSelectedSupplier(accs[0].account_name);

    const items = getStockItemsByFirm(activeFirmId);
    setStockItems(items);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].item_name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const qtyNum = parseFloat(quantity || 0);
      const rateNum = parseFloat(unitRate || 0);
      const grandTotal = (qtyNum * rateNum * 1.18).toFixed(2);

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
      setQuantity(''); setUnitRate('');
      setInvoiceNumber(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);
      loadAccountsAndStock();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>🛍️ Purchase Inward Entry & Stock Addition</h3>

      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Supplier Account (From Master Accounts List) *</label>
            <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={inputStyle} required>
              {suppliers.map(s => (
                <option key={s.id} value={s.account_name}>{s.account_name} ({s.account_group || 'GENERAL'})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock Item (+IN) *</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
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
          🛍️ Post Purchase & Add Stock
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

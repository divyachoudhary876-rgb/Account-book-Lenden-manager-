// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { getAccountHeads } from '../utils/statementEngine.js';
import { recordUnifiedPurchase } from '../utils/purchasePostingEngine.js';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);

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
    setSuppliers(accs);
    if (accs.length > 0 && !selectedSupplier) setSelectedSupplier(accs[0].account_name);

    let items = getStockItemsByFirm(activeFirmId);
    if (items.length === 0) {
      items = [{ id: 'ITEM-DIESEL', item_name: 'Diesel', unit: 'Liters', current_stock: 0 }];
    }
    setStockItems(items);
    if (!selectedItem) setSelectedItem(items[0].item_name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const res = recordUnifiedPurchase(activeFirmId, {
        supplier_account: selectedSupplier,
        item_name: selectedItem,
        quantity,
        unit_rate: unitRate,
        voucher_date: voucherDate,
        invoice_number: invoiceNumber
      });

      alert(`✓ Purchase Inward Entry Successful!\n• Stock Quantity (+IN): ${res.updatedStock} Units\n• Credited Supplier: ${res.supplier} (₹${res.totalAmount})\n• Synced with Milan, Journal & Reports!`);

      setQuantity('');
      setUnitRate('');
      setInvoiceNumber(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>🛍️ Purchase Inward Entry & Stock Addition</h3>
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Purchase Date *</label>
            <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Bill / Ref No *</label>
            <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Supplier / Vendor *</label>
            <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={inputStyle} required>
              {suppliers.map(s => <option key={s.id} value={s.account_name}>{s.account_name} ({s.account_group || 'GENERAL'})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock Item (+IN) *</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
              {stockItems.map(i => <option key={i.id} value={i.item_name}>{i.item_name} (Avail: {i.current_stock} {i.unit || 'Ltr'})</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" step="0.01" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Purchase Rate (₹) *</label>
            <input type="number" step="0.01" placeholder="Rate (₹)" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', width: '100%', marginTop: '6px', cursor: 'pointer', fontSize: '13px' }}>
          🛍️ Post Purchase & Sync Everything
        </button>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };

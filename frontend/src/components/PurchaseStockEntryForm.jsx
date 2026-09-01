// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
import { recordUnifiedPurchase } from '../utils/purchasePostingEngine.js';
import CreateAccountHeadModal from './CreateAccountHeadModal.jsx';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);

  const refreshData = () => {
    const accs = getFirmMasterAccounts(activeFirmId);
    const items = getStockItemsByFirm(activeFirmId);
    setSuppliers(accs);
    setStockItems(items);
    if (accs.length > 0 && !selectedSupplier) setSelectedSupplier(accs[0].account_name);
    if (items.length > 0 && !selectedItem) setSelectedItem(items[0].item_name);
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('app_state_updated', refreshData);
    return () => window.removeEventListener('app_state_updated', refreshData);
  }, [firm, activeFirmId]);

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

      alert(`✓ Purchase Inward Recorded Successfully!\n• Voucher: ${res.voucherId}\n• Supplier: ${res.party} (₹${res.totalAmount})\n• Stock Updated: ${res.updatedStock} Units`);
      setQuantity('');
      setUnitRate('');
      setInvoiceNumber(`PUR-${Math.floor(100000 + Math.random() * 900000)}`);
      refreshData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🛍️ Purchase Inward & Stock Entry</h3>
        <button type="button" onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          ➕ Add Party
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Purchase Date *</label>
            <input type="date" value={voucherDate} onChange={e => setVoucherDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Bill / Ref No *</label>
            <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Supplier / Vendor Party *</label>
            <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }} required>
              {suppliers.map(s => <option key={s.id} value={s.account_name}>{s.account_name} ({s.sub_group || s.primary_type})</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock Item (+IN) *</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
              {stockItems.map(i => <option key={i.id} value={i.item_name}>{i.item_name} (Stock: {i.current_stock} {i.unit})</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" step="0.01" placeholder="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Purchase Rate (₹) *</label>
            <input type="number" step="0.01" placeholder="Rate (₹)" value={unitRate} onChange={e => setUnitRate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <button type="submit" style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', width: '100%', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>
          💾 Post Purchase & Update All Modules
        </button>
      </form>

      <CreateAccountHeadModal firm={firm} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAccountCreated={refreshData} />
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff' };

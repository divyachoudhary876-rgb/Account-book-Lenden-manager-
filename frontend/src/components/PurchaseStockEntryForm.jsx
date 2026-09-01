// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getFirmMasterAccounts, saveMasterAccount } from '../utils/accountMasterEngine.js';
import { getStockItemsByFirm } from '../utils/stockInventoryEngine.js';
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

  // Quick Add Party Modal state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyGroup, setNewPartyGroup] = useState('SUNDRY_CREDITORS');

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('accounts_master_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('accounts_master_updated', loadData);
    };
  }, [firm, activeFirmId]);

  const loadData = () => {
    const accs = getFirmMasterAccounts(activeFirmId);
    setSuppliers(accs);
    if (accs.length > 0 && !selectedSupplier) {
      setSelectedSupplier(accs[0].account_name);
    }

    let items = getStockItemsByFirm(activeFirmId);
    if (items.length === 0) {
      items = [{ id: 'ITEM-DIESEL', item_name: 'Diesel', unit: 'Liters', current_stock: 0 }];
    }
    setStockItems(items);
    if (!selectedItem && items.length > 0) {
      setSelectedItem(items[0].item_name);
    }
  };

  const handleQuickAddParty = (e) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;
    try {
      const created = saveMasterAccount(activeFirmId, {
        account_name: newPartyName.trim(),
        account_group: newPartyGroup,
        opening_balance: 0,
        balance_type: 'Cr'
      });
      setSelectedSupplier(created.account_name);
      setNewPartyName('');
      setShowQuickAdd(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      alert("⚠️ Please select or create a Supplier Account first!");
      return;
    }
    try {
      const res = recordUnifiedPurchase(activeFirmId, {
        supplier_account: selectedSupplier,
        item_name: selectedItem || 'Diesel',
        quantity,
        unit_rate: unitRate,
        voucher_date: voucherDate,
        invoice_number: invoiceNumber
      });

      alert(`✓ Purchase Inward Successful!\n• Party Credited: ${res.party} (₹${res.totalAmount})\n• Stock Updated: ${res.updatedStock} Units\n• Synced with Milan, Daybook & Reports!`);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px' }}>🛍️ Purchase Inward Entry & Stock Addition</h3>
        <button 
          type="button" 
          onClick={() => setShowQuickAdd(true)} 
          style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ➕ Quick Add Party
        </button>
      </div>

      {showQuickAdd && (
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af' }}>Create New Party / Account Head</span>
            <button type="button" onClick={() => setShowQuickAdd(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px' }}>
            <input 
              type="text" 
              placeholder="e.g. Kisan Fuel Station / Ramesh Ji" 
              value={newPartyName} 
              onChange={e => setNewPartyName(e.target.value)} 
              style={inputStyle} 
            />
            <select value={newPartyGroup} onChange={e => setNewPartyGroup(e.target.value)} style={inputStyle}>
              <option value="SUNDRY_CREDITORS">Supplier / Creditor (लेनदार)</option>
              <option value="SUNDRY_DEBTORS">Customer / Debtor (देनदार)</option>
            </select>
            <button type="button" onClick={handleQuickAddParty} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '0 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Save
            </button>
          </div>
        </div>
      )}

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
            <label style={labelStyle}>Supplier / Vendor Account *</label>
            <select 
              value={selectedSupplier} 
              onChange={e => setSelectedSupplier(e.target.value)} 
              style={{ ...inputStyle, fontWeight: 'bold' }} 
              required
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.account_name}>
                  {s.account_name} ({s.account_group || 'GENERAL'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stock Item (+IN) *</label>
            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} style={inputStyle} required>
              {stockItems.map(i => (
                <option key={i.id} value={i.item_name}>
                  {i.item_name} (Avail: {i.current_stock} {i.unit || 'Ltr'})
                </option>
              ))}
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

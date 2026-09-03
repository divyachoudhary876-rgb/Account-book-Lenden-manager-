// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { getStockItemsByFirm, recordStockPurchase } from '../utils/stockInventoryEngine.js';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { generateProfessionalInvoicePDF } from '../utils/pdfDownloadEngine.js';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';

export default function PurchaseStockEntryForm({ firm }) {
  const activeFirmId = firm?.id || 'FIRM-001';

  const [stockList, setStockList] = useState([]);
  const [supplierAccounts, setSupplierAccounts] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);

  // Form Fields
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [billRef, setBillRef] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [status, setStatus] = useState(null);

  const loadData = () => {
    // 1. Stock items
    const items = getStockItemsByFirm(activeFirmId);
    setStockList(items);
    if (items.length > 0 && !selectedItem) {
      setSelectedItem(items[0].item_name);
      setPurchaseRate((items[0].unit_purchase_price || 0).toString());
    }

    // 2. Suppliers
    const accs = getFirmMasterAccounts(activeFirmId);
    setSupplierAccounts(accs);
    if (accs.length > 0 && !selectedSupplier) {
      const cashAcc = accs.find(a => a.account_name.toLowerCase().includes('cash')) || accs[0];
      setSelectedSupplier(cashAcc.account_name);
    }

    // 3. Saved Purchase Bills History
    const historyKey = `app_purchase_bills_${activeFirmId}`;
    const raw = localStorage.getItem(historyKey);
    if (raw) {
      setPurchaseHistory(JSON.parse(raw).reverse());
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('stock_updated', loadData);
    window.addEventListener('app_state_updated', loadData);
    return () => {
      window.removeEventListener('stock_updated', loadData);
      window.removeEventListener('app_state_updated', loadData);
    };
  }, [activeFirmId]);

  const handleItemChange = (itemName) => {
    setSelectedItem(itemName);
    const item = stockList.find(i => i.item_name === itemName);
    if (item && item.unit_purchase_price) {
      setPurchaseRate(item.unit_purchase_price.toString());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus(null);

    const cleanQty = parseFloat(quantity);
    const cleanRate = parseFloat(purchaseRate);

    if (cleanQty <= 0 || cleanRate <= 0) {
      setStatus({ type: 'error', text: 'Quantity aur Rate zero se adhik hone chahiye.' });
      return;
    }

    try {
      // 1. Post to Inventory & Ledger
      recordStockPurchase(activeFirmId, {
        item_name: selectedItem,
        quantity: cleanQty,
        purchase_rate: cleanRate,
        supplier_name: selectedSupplier,
        purchase_date: purchaseDate,
        bill_ref: billRef
      });

      // 2. Save into Purchase History
      const historyKey = `app_purchase_bills_${activeFirmId}`;
      const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      const newPurchaseRecord = {
        id: `PUR-${Date.now()}`,
        bill_ref: billRef,
        date: purchaseDate,
        party: selectedSupplier,
        item_name: selectedItem,
        quantity: cleanQty,
        rate: cleanRate,
        total: cleanQty * cleanRate,
        type: 'PURCHASE'
      };

      existing.push(newPurchaseRecord);
      localStorage.setItem(historyKey, JSON.stringify(existing));

      setStatus({
        type: 'success',
        text: `✓ Purchase Inward Recorded! Total: ₹${(cleanQty * cleanRate).toLocaleString('en-IN')}`
      });

      // 3. Open Professional PDF
      generateProfessionalInvoicePDF(newPurchaseRecord, firm);

      // Reset
      setQuantity('');
      setBillRef(`PUR-${Date.now().toString().slice(-6)}`);
      loadData();
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const selectedStockObj = stockList.find(i => i.item_name === selectedItem);

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid #cbd5e1', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📦</span> Purchase Inward & Stock Entry (खरीद बिल)
        </h3>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Inward Raw Materials, Vendor Ledgers & Goods Receipt Slips</span>
      </div>

      {status && (
        <div style={{
          backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: status.type === 'success' ? '#065f46' : '#b91c1c',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {status.text}
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #cbd5e1', display: 'grid', gap: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Purchase Date *</label>
            <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Bill / Ref No *</label>
            <input type="text" value={billRef} onChange={e => setBillRef(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        {/* Searchable Supplier Dropdown (A-Z Sorted + Search Bar) */}
        <SearchableAccountDropdown
          label="Supplier / Vendor Party *"
          accounts={supplierAccounts}
          value={selectedSupplier}
          onChange={val => setSelectedSupplier(val)}
          placeholder="Search supplier name..."
          colorAccent="#059669"
          required
        />

        {/* Stock Item */}
        <div>
          <label style={labelStyle}>Stock Item (+IN) *</label>
          <select value={selectedItem} onChange={e => handleItemChange(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }} required>
            {stockList.map(item => (
              <option key={item.id} value={item.item_name}>
                {item.item_name} (Current Stock: {item.current_stock} {item.unit})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Quantity ({selectedStockObj?.unit || 'Units'}) *</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 1000"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              style={{ ...inputStyle, fontSize: '15px', fontWeight: 'bold' }}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Purchase Rate (₹) *</label>
            <input
              type="number"
              step="0.01"
              placeholder="Rate per unit"
              value={purchaseRate}
              onChange={e => setPurchaseRate(e.target.value)}
              style={{ ...inputStyle, fontSize: '15px', fontWeight: 'bold' }}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 6px rgba(5,150,105,0.3)' }}
        >
          📥 Post Purchase & Generate Inward Slip
        </button>

      </form>

      {/* Created Purchase Bills List with Download PDF Button */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginBottom: '12px' }}>
          📋 Created Purchase Bills List ({purchaseHistory.length})
        </strong>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {purchaseHistory.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              No purchase bills recorded yet.
            </div>
          ) : (
            purchaseHistory.map((bill) => (
              <div
                key={bill.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>{bill.bill_ref}</strong>
                    <span style={{ fontSize: '10px', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{bill.date}</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#059669' }}>{bill.party}</div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>
                    {bill.item_name} — <strong>{bill.quantity}</strong> @ ₹{bill.rate}
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <strong style={{ fontSize: '15px', color: '#dc2626' }}>
                    ₹{bill.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>

                  <button
                    type="button"
                    onClick={() => generateProfessionalInvoicePDF(bill, firm)}
                    style={{
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>🖨️</span> Download PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' };

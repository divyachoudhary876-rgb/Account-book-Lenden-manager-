// frontend/src/components/PurchaseStockEntryForm.jsx

import React, { useState, useEffect } from 'react';
import { processPurchaseStockPosting } from '../utils/inventoryPostingEngine';

export default function PurchaseStockEntryForm() {
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [narration, setNarration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = () => {
    const savedInventory = JSON.parse(localStorage.getItem('app_inventory') || '[]');
    const savedAccounts = JSON.parse(localStorage.getItem('app_account_heads') || '[]');
    
    setInventory(savedInventory);
    const suppList = savedAccounts.filter(a => a.sub_group === 'SUNDRY_CREDITORS' || a.primary_type === 'LIABILITY');
    setSuppliers(suppList);

    if (savedInventory.length > 0 && !selectedItemId) setSelectedItemId(savedInventory[0].id);
    if (suppList.length > 0 && !selectedSupplier) setSelectedSupplier(suppList[0].id);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePurchase = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = processPurchaseStockPosting({
        supplierId: selectedSupplier,
        invoiceNumber,
        entryDate,
        itemId: selectedItemId,
        quantity,
        purchaseRate,
        narration
      });

      alert(`✓ Purchase Entry Posted! Stock Inventory me ${quantity} units AUTOMATIC INCREASE ho chuki hain.\n\nNew Item Stock: ${result.stockItem.current_qty} ${result.stockItem.unit}`);
      setQuantity('');
      setPurchaseRate('');
      setInvoiceNumber('');
      setNarration('');
      loadData();
    } catch (err) {
      alert(`❌ Stock Posting Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxWidth: '650px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>📥 Purchase Bill / Inward Stock Entry</h3>

      <form onSubmit={handleSavePurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Select Supplier / Creditor *</label>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)} style={inputStyle} required>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Supplier Bill No *</label>
            <input type="text" placeholder="BILL-102" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Select Stock Item *</label>
            <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} style={inputStyle} required>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (Current Stock: {item.current_qty} {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Quantity *</label>
            <input type="number" step="0.01" placeholder="10.00" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Purchase Rate (₹) *</label>
            <input type="number" step="0.01" placeholder="4500.00" value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Entry Narration / Particulars</label>
          <input type="text" placeholder="Purchase of raw material via Truck No. RJ31-GA-1234..." value={narration} onChange={(e) => setNarration(e.target.value)} style={inputStyle} />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{ padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginTop: '8px' }}
        >
          {isSubmitting ? '⏳ Stock Inward Ho Raha Hai...' : '💾 Save & Add Stock to Inventory'}
        </button>

      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' };
const inputStyle = { width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' };

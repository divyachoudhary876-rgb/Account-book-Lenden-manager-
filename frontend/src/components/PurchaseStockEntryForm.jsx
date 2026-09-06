import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function PurchaseStockEntryForm({ firm, onSave, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const allItems = useItemMaster(); 
  const [accountsList, setAccountsList] = useState([]);

  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState(`PUR-${Math.floor(Date.now() / 1000)}`);
  const [supplierParty, setSupplierParty] = useState(''); 
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const loadAccs = () => {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);
    };
    loadAccs();
    window.addEventListener('app_state_updated', loadAccs);
    return () => window.removeEventListener('app_state_updated', loadAccs);
  }, [activeFirmId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!supplierParty) return setFeedback({ type: 'error', message: 'कृपया Supplier / Vendor Party चुनें।' });
    if (!selectedItemId) return setFeedback({ type: 'error', message: 'कृपया Stock Item चुनें।' });

    setIsSubmitting(true);
    try {
      const currentInventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const parsedQty = Number(quantity);
      const parsedRate = Number(purchaseRate);
      const totalAmount = parsedQty * parsedRate;
      const selectedItemObj = allItems.find(i => String(i.id) === String(selectedItemId));

      // 1. Update Inventory Stock & Weighted Average Price
      const updatedInventory = currentInventory.map(item => {
        if (String(item.id) === String(selectedItemId)) {
          const oldStock = Number(item.current_stock || item.stock || 0);
          const oldTotalValue = oldStock * Number(item.unit_purchase_price || 0);
          const newTotalValue = oldTotalValue + totalAmount;
          const newStock = oldStock + parsedQty;
          const newAvgRate = newStock > 0 ? (newTotalValue / newStock).toFixed(2) : parsedRate;
          
          return { ...item, current_stock: newStock, unit_purchase_price: newAvgRate };
        }
        return item;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      // 2. Safe Voucher Storage Fetch & Save
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const newVoucher = {
        id: `PUR-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: purchaseDate,
        voucher_type: 'PURCHASE',
        dr_account: 'Purchase A/c',
        cr_account: supplierParty,
        amount: totalAmount,
        reference_no: billNo,
        narration: `Purchased ${parsedQty} ${selectedItemObj?.unit || 'Units'} of ${selectedItemObj?.item_name || 'Item'} @ ₹${parsedRate}`,
        created_at: new Date().toISOString()
      };
      StorageService.setItem('account_book_vouchers', [newVoucher, ...vouchers]);

      // Trigger global sync event
      window.dispatchEvent(new Event('app_storage_updated'));

      setFeedback({ type: 'success', message: '✓ Purchase Bill Saved & Stock Updated!' });
      setQuantity(''); setPurchaseRate(''); setSelectedItemId(''); setSupplierParty('');
      setBillNo(`PUR-${Math.floor(Date.now() / 1000)}`);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>📦 Purchase Inward & Stock Entry</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>
        
        {feedback && <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '10px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4', color: feedback.type === 'error' ? '#991b1b' : '#166534', fontWeight: '700', fontSize: '13px', border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Purchase Date *</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Bill / Ref No *</label>
              <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <SearchableAccountDropdown
              label="Supplier / Vendor Party **"
              accounts={accountsList}
              value={supplierParty}
              onChange={val => setSupplierParty(val)}
              placeholder="Search vendor account..."
              colorAccent="#dc2626"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Stock Item (+IN) *</label>
            <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '13px', outline: 'none' }} required>
              <option value="">-- Choose Stock Item --</option>
              {allItems
                .filter(item => item.item_type !== 'SERVICE' && !String(item.item_name).toLowerCase().includes('freight'))
                .map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_name} (Current Stock: {item.current_stock || 0} {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Quantity *</label>
              <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 1000" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Purchase Rate (₹) *</label>
              <input type="number" step="0.01" value={purchaseRate} onChange={e => setPurchaseRate(e.target.value)} placeholder="e.g. 4.5" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} required />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)' }}>
            📥 Post Purchase & Generate Inward Slip
          </button>
        </form>
      </div>
    </div>
  );
}

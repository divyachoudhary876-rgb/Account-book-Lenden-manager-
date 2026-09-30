// frontend/src/components/PurchaseStockEntryForm.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function PurchaseStockEntryForm({ firm, onSave, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const allItems = useItemMaster(); 
  const [accountsList, setAccountsList] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);

  const [purchaseDate, setPurchaseDate] = useState(todayMaxDate);
  const [billNo, setBillNo] = useState(`PUR-${Math.floor(Date.now() / 1000)}`);
  const [supplierParty, setSupplierParty] = useState(''); 
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = () => {
    try {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);

      const allVouchers = StorageService.getItem('account_book_vouchers') || [];
      const purchases = allVouchers.filter(v => v && (v.firm_id === activeFirmId || v.firm_id === 'FIRM-001') && (v.voucher_type === 'PURCHASE' || v.type === 'PURCHASE'));
      setPurchaseList(purchases);
    } catch (e) {
      console.error("Error loading purchase data:", e);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('app_state_updated', loadData);
    window.addEventListener('app_storage_updated', loadData);
    return () => {
      window.removeEventListener('app_state_updated', loadData);
      window.removeEventListener('app_storage_updated', loadData);
    };
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
      const itemName = selectedItemObj?.item_name || selectedItemObj?.name || 'Item';

      // 1. Update Inventory Stock & Weighted Average Price (with dual keys)
      const updatedInventory = currentInventory.map(item => {
        if (String(item.id) === String(selectedItemId)) {
          const oldStock = Number(item.current_stock || item.stock || item.stockQty || item.qty || 0);
          const oldRate = Number(item.unit_purchase_price || item.purchasePrice || item.rate || 0);
          const oldTotalValue = oldStock * oldRate;
          const newTotalValue = oldTotalValue + totalAmount;
          const newStock = oldStock + parsedQty;
          const newAvgRate = newStock > 0 ? Number((newTotalValue / newStock).toFixed(2)) : parsedRate;
          
          return { 
            ...item, 
            current_stock: newStock, 
            stock: newStock, 
            stockQty: newStock, 
            qty: newStock,
            unit_purchase_price: newAvgRate,
            purchasePrice: newAvgRate,
            rate: newAvgRate
          };
        }
        return item;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      // 2. Save Purchase Voucher with structured entries
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const newVoucher = {
        id: `PUR-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: purchaseDate,
        voucher_type: 'PURCHASE',
        dr_account: 'Purchase A/c',
        cr_account: supplierParty,
        amount: totalAmount,
        total_amount: totalAmount,
        reference_no: billNo,
        itemId: selectedItemId,
        qty: parsedQty,
        rate: parsedRate,
        narration: `Purchased ${parsedQty} ${selectedItemObj?.unit || 'Units'} of ${itemName} @ ₹${parsedRate}`,
        entries: [
          { account_name: 'Purchase A/c', type: 'DR', amount: totalAmount },
          { account_name: supplierParty, type: 'CR', amount: totalAmount }
        ],
        created_at: new Date().toISOString()
      };
      StorageService.setItem('account_book_vouchers', [newVoucher, ...vouchers]);

      window.dispatchEvent(new Event('app_storage_updated'));
      loadData();

      setFeedback({ type: 'success', message: '✓ Purchase Bill Saved & Stock Updated!' });
      setQuantity(''); setPurchaseRate(''); setSelectedItemId(''); setSupplierParty('');
      setBillNo(`PUR-${Math.floor(Date.now() / 1000)}`);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePurchase = (voucherId, refNo) => {
    if (!window.confirm(`Bill #${refNo} को हटाने से इसका स्टॉक वापस माइनस हो जाएगा। जारी रखें?`)) return;

    try {
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const targetVoucher = vouchers.find(v => v && v.id === voucherId);

      if (targetVoucher && targetVoucher.itemId && targetVoucher.qty) {
        const currentInventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
        const restoredInventory = currentInventory.map(item => {
          if (String(item.id) === String(targetVoucher.itemId)) {
            const curStock = Number(item.current_stock || item.stock || item.stockQty || item.qty || 0);
            const newStock = Math.max(0, curStock - Number(targetVoucher.qty));
            return { 
              ...item, 
              current_stock: newStock,
              stock: newStock,
              stockQty: newStock,
              qty: newStock
            };
          }
          return item;
        });
        StorageService.setItem('inventory_items', restoredInventory);
      }

      const filtered = vouchers.filter(v => v && v.id !== voucherId);
      StorageService.setItem('account_book_vouchers', filtered);
      window.dispatchEvent(new Event('app_storage_updated'));
      loadData();
      alert('✓ Purchase entry deleted & stock adjusted.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const filteredPurchases = purchaseList.filter(v => {
    if (!v) return false;
    const q = (searchFilter || '').toLowerCase();
    return (
      (v.reference_no && v.reference_no.toLowerCase().includes(q)) ||
      (v.cr_account && v.cr_account.toLowerCase().includes(q)) ||
      (v.narration && v.narration.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box', color: '#0f172a' }}>
      
      {/* Form Card */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', boxSizing: 'border-box', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>📦 Purchase Inward & Stock Entry</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>
        
        {feedback && <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#f0fdf4', color: feedback.type === 'error' ? '#991b1b' : '#166534', fontWeight: '700', fontSize: '12px', border: `1px solid ${feedback.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Purchase Date *</label>
              <input 
                type="date" 
                max={todayMaxDate}
                value={purchaseDate} 
                onChange={e => setPurchaseDate(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Bill / Ref No *</label>
              <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} style={inputStyle} required />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <SearchableAccountDropdown
              label="Supplier / Vendor Party *"
              accounts={accountsList}
              value={supplierParty}
              onChange={val => setSupplierParty(val)}
              placeholder="Search vendor account..."
              colorAccent="#dc2626"
              required
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Stock Item (+IN) *</label>
            <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ ...inputStyle, border: '2px solid #eab308' }} required>
              <option value="">-- Choose Stock Item --</option>
              {allItems
                .filter(item => item.item_type !== 'SERVICE' && !String(item.item_name || item.name || '').toLowerCase().includes('freight'))
                .map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_name || item.name} (Current Stock: {item.current_stock || item.stock || item.stockQty || item.qty || 0} {item.unit})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Quantity *</label>
              <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 1000" style={inputStyle} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '4px', textTransform: 'uppercase', display: 'block' }}>Purchase Rate (₹) *</label>
              <input type="number" step="0.01" value={purchaseRate} onChange={e => setPurchaseRate(e.target.value)} placeholder="e.g. 4.5" style={inputStyle} required />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '11px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
            📥 Post Purchase & Generate Inward Slip
          </button>
        </form>
      </div>

      {/* PURCHASE REGISTER LIST */}
      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: '800' }}>
            📋 Purchase Bills Register ({filteredPurchases.length})
          </strong>
        </div>

        <input
          type="text"
          placeholder="🔍 Search bills by reference no, vendor..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', boxSizing: 'border-box', marginBottom: '10px', outline: 'none', backgroundColor: '#fff', color: '#0f172a' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPurchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '11px' }}>
              No purchase bills recorded yet.
            </div>
          ) : (
            filteredPurchases.map(inv => {
              const amt = Number(inv.amount || inv.total_amount || 0);
              return (
                <div key={inv.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{inv.voucher_date || ''}</span>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>{inv.reference_no || ''}</strong>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>{inv.cr_account || ''}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{inv.narration || ''}</div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#059669', marginBottom: '6px' }}>₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <button 
                      onClick={() => handleDeletePurchase(inv.id, inv.reference_no)}
                      style={{ padding: '5px 10px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '11px',
  boxSizing: 'border-box',
  backgroundColor: '#ffffff',
  color: '#0f172a'
};

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';

const CustomAccountDropdown = ({ label, value, onChange, accounts, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const getName = (a) => a.account_name || a.name || a.displayName || '';
  const getGroup = (a) => a.sub_group || a.category || a.primary_type || 'Ledger Account';
  const getBal = (a) => Number(a.opening_balance || 0);
  const getBalType = (a) => a.balance_type || 'Cr';

  const filtered = accounts.filter(a => getName(a).toLowerCase().includes(search.toLowerCase()));
  const selectedAcc = accounts.find(a => getName(a) === value);

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: isOpen ? '2px solid #059669' : '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}
      >
        {selectedAcc ? (
          <div>
            <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{getName(selectedAcc)}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{getGroup(selectedAcc)}</div>
          </div>
        ) : (
          <span style={{ color: '#64748b' }}>{placeholder || '-- Select Account --'}</span>
        )}
        <span style={{ fontSize: '10px', color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 100, marginTop: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', maxHeight: '350px' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>🔍</span>
            <input
              type="text"
              placeholder="Type name to search (A to Z sorted)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', boxSizing: 'border-box', fontSize: '13px' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>No accounts found.</div>
            ) : (
              filtered.map(acc => {
                const accName = getName(acc);
                return (
                  <div
                    key={acc.id || Math.random()}
                    onClick={() => { onChange(accName); setIsOpen(false); setSearch(''); }}
                    style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: value === accName ? '#f0fdf4' : '#fff' }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: value === accName ? '#059669' : '#0f172a' }}>{accName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{getGroup(acc)}</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: getBalType(acc) === 'Cr' ? '#dc2626' : '#059669' }}>
                      ₹{Math.abs(getBal(acc))} {getBalType(acc)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function PurchaseStockEntryForm({ firm, onSave, onClose }) {
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
      let stored = StorageService.getLedgerAccounts() || [];
      stored.sort((a, b) => String(a.account_name || a.name || '').localeCompare(String(b.account_name || b.name || '')));
      setAccountsList(stored);
    };
    loadAccs();
    window.addEventListener('app_storage_updated', loadAccs);
    return () => window.removeEventListener('app_storage_updated', loadAccs);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!supplierParty) return setFeedback({ type: 'error', message: 'कृपया Supplier / Vendor Party चुनें।' });
    if (!selectedItemId) return setFeedback({ type: 'error', message: 'कृपया Stock Item चुनें।' });

    setIsSubmitting(true);
    try {
      const currentInventory = StorageService.getInventoryItems() || [];
      const parsedQty = Number(quantity);
      const parsedRate = Number(purchaseRate);
      const totalAmount = parsedQty * parsedRate;
      const selectedItemObj = allItems.find(i => String(i.id) === String(selectedItemId));

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

      const vouchers = StorageService.getVouchers() || [];
      const newVoucher = {
        id: `PUR-${Date.now()}`,
        firm_id: firm?.id || 'firm_default',
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
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📦 Purchase Inward & Stock Entry</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>
        
        {feedback && <div style={{ padding: '10px', marginBottom: '16px', borderRadius: '8px', backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5', color: feedback.type === 'error' ? '#991b1b' : '#065f46' }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Purchase Date *</label>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Bill / Ref No *</label>
              <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          <CustomAccountDropdown
            label="Supplier / Vendor Party **"
            value={supplierParty}
            onChange={setSupplierParty}
            accounts={accountsList}
            placeholder="-- Select Vendor / Party --"
          />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Stock Item (+IN) *</label>
            <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', borderColor: '#eab308', borderWidth: '2px', boxSizing: 'border-box' }} required>
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

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Quantity *</label>
              <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g. 1000" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Purchase Rate (₹) *</label>
              <input type="number" step="0.01" value={purchaseRate} onChange={e => setPurchaseRate(e.target.value)} placeholder="e.g. 4.5" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} style={{ padding: '14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            📥 Post Purchase & Generate Inward Slip
          </button>
        </form>
      </div>
    </div>
  );
}

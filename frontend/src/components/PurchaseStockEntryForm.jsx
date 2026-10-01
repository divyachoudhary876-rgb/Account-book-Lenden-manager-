// frontend/src/components/PurchaseStockEntryForm.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { loadFirmData } from '../utils/firmIsolationEngine';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import SearchableStockDropdown from './SearchableStockDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';
import { processPurchaseStockPosting, revertPurchaseStockOnDeletion } from '../utils/inventoryPostingEngine.js';

export default function PurchaseStockEntryForm({ firm, onSave, onClose }) {
  const activeFirmId = firm?.id || firm?.firm_id || 'FIRM-001';
  const todayMaxDate = new Date().toISOString().split('T')[0];

  const [allItems, setAllItems] = useState([]);
  const [accountsList, setAccountsList] = useState([]);
  const [purchaseList, setPurchaseList] = useState([]);

  const [editingId, setEditingId] = useState(null);
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
      const rawInventory = loadFirmData('inventory_items', firm, []);
      const validInventory = rawInventory.filter(i => i && (i.name || i.item_name) && i.item_type !== 'SERVICE' && !String(i.item_name || i.name || '').toLowerCase().includes('freight'));
      setAllItems(validInventory);

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
  }, [firm, activeFirmId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!supplierParty) return setFeedback({ type: 'error', message: 'कृपया Supplier / Vendor Party चुनें।' });
    if (!selectedItemId) return setFeedback({ type: 'error', message: 'कृपया Stock Item चुनें।' });

    setIsSubmitting(true);
    try {
      // 1. Agar edit kar rahe hain, toh purana stock revert karein
      if (editingId) {
        revertPurchaseStockOnDeletion(editingId, activeFirmId);
      }

      const purchasePayload = {
        id: editingId || `PURCH-${Date.now()}`,
        firmId: activeFirmId,
        supplierId: supplierParty,
        invoiceNumber: billNo,
        entryDate: purchaseDate,
        itemId: selectedItemId,
        quantity: quantity,
        purchaseRate: purchaseRate,
        narration: `Purchase Bill #${billNo} from ${supplierParty}`
      };

      // 2. Naya purchase post karein
      processPurchaseStockPosting(purchasePayload, activeFirmId);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      loadData();

      setFeedback({ type: 'success', message: editingId ? '✓ Purchase Bill Updated & Stock Adjusted!' : '✓ Purchase Bill Saved & Stock Updated!' });
      setEditingId(null);
      setQuantity(''); setPurchaseRate(''); setSelectedItemId(''); setSupplierParty('');
      setBillNo(`PUR-${Math.floor(Date.now() / 1000)}`);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (inv) => {
    if (!inv) return;
    setEditingId(inv.id);
    setPurchaseDate(inv.voucher_date || inv.date || todayMaxDate);
    setBillNo(inv.reference_no || '');
    setSupplierParty(inv.cr_account || '');
    setSelectedItemId(inv.itemId || inv.item_id || '');
    setQuantity(inv.qty || inv.quantity ? String(inv.qty || inv.quantity) : '');
    setPurchaseRate(inv.rate || inv.unit_rate ? String(inv.rate || inv.unit_rate) : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePurchase = (voucherId, refNo) => {
    if (!window.confirm(`Bill #${refNo} को हटाने से इसका स्टॉक वापस माइनस हो जाएगा। जारी रखें?`)) return;

    try {
      revertPurchaseStockOnDeletion(voucherId, activeFirmId);

      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const filtered = vouchers.filter(v => v && v.id !== voucherId && v.reference_no !== voucherId);
      StorageService.setItem('account_book_vouchers', filtered);
      StorageService.setItem(`account_book_vouchers_${activeFirmId}`, filtered);

      window.dispatchEvent(new Event('app_storage_updated'));
      window.dispatchEvent(new Event('app_state_updated'));
      loadData();

      if (editingId === voucherId) {
        setEditingId(null);
        setQuantity(''); setPurchaseRate(''); setSelectedItemId(''); setSupplierParty('');
      }
      alert('✓ Purchase entry deleted & stock adjusted.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = (inv) => {
    if (!inv) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Popup blocked! Please allow popups.');

    const firmName = firm?.name || firm?.legal_name || 'Neelkanth Groups';
    const refNo = inv.reference_no || '';
    const vDate = inv.voucher_date || '';
    const supplier = inv.cr_account || '';
    const qty = inv.qty || inv.quantity || 0;
    const rate = Number(inv.rate || inv.unit_rate || 0).toFixed(2);
    const amount = Number(inv.amount || inv.total_amount || 0).toFixed(2);

    printWindow.document.write(`
      <html>
        <head>
          <title>Inward Slip #${refNo}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #0f172a; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 20px; font-weight: 800; }
            .header p { margin: 4px 0 0 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #f1f5f9; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
            td { padding: 10px; border: 1px solid #cbd5e1; }
            .text-right { text-align: right; }
            .total { margin-top: 20px; text-align: right; font-size: 15px; font-weight: 900; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${firmName}</h2>
            <p>PURCHASE INWARD SLIP</p>
          </div>
          <div class="meta">
            <div>
              <strong>Bill / Ref No:</strong> ${refNo}<br/>
              <strong>Date:</strong> ${vDate}
            </div>
            <div style="text-align: right;">
              <strong>Supplier / Vendor:</strong><br/>
              <span style="font-size: 14px; font-weight: bold;">${supplier}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Rate (₹)</th>
                <th class="text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Purchase Inward Item</td>
                <td class="text-right">${qty}</td>
                <td class="text-right">${rate}</td>
                <td class="text-right"><strong>${amount}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="total">Grand Total: ₹${amount}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
            {editingId ? '✏️ Edit Purchase Bill' : '📦 Purchase Inward & Stock Entry'}
          </h2>
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
            <SearchableStockDropdown 
              firm={firm}
              label="Stock Item (+IN) *"
              value={selectedItemId}
              onChange={val => setSelectedItemId(val)}
              placeholder="-- Choose Stock Item --"
            />
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '11px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
              {editingId ? '✓ Update Purchase & Adjust Stock' : '📥 Post Purchase & Generate Inward Slip'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setQuantity(''); setPurchaseRate(''); setSelectedItemId(''); setSupplierParty(''); }} style={{ padding: '11px 14px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}>
                Cancel
              </button>
            )}
          </div>
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
              const qVal = inv.qty || inv.quantity || 0;
              const rVal = Number(inv.rate || inv.unit_rate || 0).toFixed(2);
              return (
                <div key={inv.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{inv.voucher_date || ''}</span>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>{inv.reference_no || ''}</strong>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626' }}>{inv.cr_account || ''}</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: '600' }}>
                      Qty: <strong>{qVal}</strong> | Rate: <strong>₹{rVal}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>{inv.narration || ''}</div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: '#059669', marginBottom: '6px' }}>₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button onClick={() => handlePrint(inv)} style={{ padding: '5px 8px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}>Print</button>
                      <button onClick={() => handleEdit(inv)} style={{ padding: '5px 8px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}>Edit</button>
                      <button onClick={() => handleDeletePurchase(inv.id, inv.reference_no)} style={{ padding: '5px 8px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontWeight: '700' }}>Delete</button>
                    </div>
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

import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
// 🔥 FIX: Importing the correct Account Engine
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function CreateInvoice({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  const allItems = useItemMaster(); 
  const [accountsList, setAccountsList] = useState([]);

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(Date.now() / 1000)}`);
  const [customerParty, setCustomerParty] = useState(''); 
  const [vehicleNo, setVehicleNo] = useState('');
  
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');

  // 🔥 FIX: Using getFirmMasterAccounts just like VoucherEntryForm
  useEffect(() => {
    const loadAccs = () => {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);
    };
    loadAccs();
    window.addEventListener('app_state_updated', loadAccs);
    return () => window.removeEventListener('app_state_updated', loadAccs);
  }, [activeFirmId]);

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity || !rate) return;
    const itemObj = allItems.find(i => String(i.id) === String(selectedItemId));
    if (!itemObj) return;

    setCart([...cart, {
      id: Date.now(),
      itemId: selectedItemId,
      itemName: itemObj.item_name,
      qty: Number(quantity),
      rate: Number(rate),
      total: Number(quantity) * Number(rate),
      isService: itemObj.item_type === 'SERVICE' || String(itemObj.item_name).toLowerCase().includes('freight')
    }]);
    setSelectedItemId(''); setQuantity(''); setRate('');
  };

  const removeCartItem = (id) => setCart(cart.filter(c => c.id !== id));

  const taxableAmount = cart.reduce((sum, i) => sum + i.total, 0);
  const cgst = taxableAmount * 0.025; 
  const sgst = taxableAmount * 0.025; 
  const grandTotal = taxableAmount + cgst + sgst;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerParty) return alert('Customer Party is required!');
    if (cart.length === 0) return alert('Add at least one item to dispatch.');

    try {
      const currentInventory = StorageService.getInventoryItems() || [];
      const updatedInventory = currentInventory.map(invItem => {
        const cartItem = cart.find(c => String(c.itemId) === String(invItem.id));
        if (cartItem && !cartItem.isService) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) - cartItem.qty };
        }
        return invItem;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      const vouchers = StorageService.getVouchers() || [];
      const newVoucher = {
        id: `INV-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: invoiceDate,
        voucher_type: 'SALES',
        dr_account: customerParty,
        cr_account: 'Sales & Revenue',
        amount: grandTotal,
        reference_no: invoiceNo,
        narration: `Sales Invoice ${invoiceNo} to ${customerParty} - Vehicle: ${vehicleNo}`,
        created_at: new Date().toISOString()
      };
      StorageService.setItem('account_book_vouchers', [newVoucher, ...vouchers]);

      alert('✓ Invoice Generated Successfully!');
      setCart([]); setCustomerParty(''); setVehicleNo('');
      setInvoiceNo(`INV-${Math.floor(Date.now() / 1000)}`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📄 Multi-Item Sales Invoicing</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Invoice Date *</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Invoice No *</label>
              <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <SearchableAccountDropdown
              label="Customer / Debtor Party **"
              accounts={accountsList}
              value={customerParty}
              onChange={val => setCustomerParty(val)}
              placeholder="Search customer account..."
              colorAccent="#0284c7"
              required
            />
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Select Stock Item</label>
                <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff', outline: 'none' }}>
                  <option value="">-- Choose Stock Item --</option>
                  {allItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0} {item.unit}]</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Qty</label>
                  <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Rate</label>
                  <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} placeholder="0.00" />
                </div>
                <button type="button" onClick={handleAddToCart} style={{ padding: '0 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', height: '42px', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
            </div>

            {cart.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {cart.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{c.itemName}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Qty: {c.qty} @ ₹{c.rate}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                      ₹{c.total.toFixed(2)} 
                      <button type="button" onClick={() => removeCartItem(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', marginLeft: '12px', cursor: 'pointer', fontWeight: 'bold', padding: '4px' }}>X</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '13px', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '6px' }}>
                  <div>
                    <div>Taxable: ₹{taxableAmount.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>CGST: ₹{cgst.toFixed(2)} | SGST: ₹{sgst.toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '16px', color: '#047857' }}>₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(29, 78, 216, 0.2)' }}>
            📄 Post Multi-Item Sale
          </button>
        </form>
      </div>
    </div>
  );
}

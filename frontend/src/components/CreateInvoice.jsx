import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';

export default function CreateInvoice({ firm, onClose }) {
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

  useEffect(() => {
    const storedAccounts = StorageService.getLedgerAccounts() || [];
    setAccountsList(storedAccounts);
  }, []);

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
        firm_id: firm?.id || 'firm_default',
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
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>📄 Multi-Item Sales Invoicing</h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Invoice Date *</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Invoice No *</label>
              <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Customer / Debtor Party **</label>
            <select value={customerParty} onChange={e => setCustomerParty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required>
              <option value="">-- Select Customer / Party --</option>
              {accountsList.map(acc => <option key={acc.id} value={acc.account_name}>{acc.account_name}</option>)}
            </select>
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Item</label>
                <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eab308' }}>
                  <option value="">-- Choose --</option>
                  {allItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} [Stock: {item.current_stock || 0}]</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Qty</label>
                <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Rate</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </div>
              <button type="button" onClick={handleAddToCart} style={{ padding: '10px 16px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>+ Add</button>
            </div>

            {cart.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {cart.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '13px' }}>{c.itemName} x {c.qty} @ ₹{c.rate}</span>
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>₹{c.total} <button type="button" onClick={() => removeCartItem(c.id)} style={{ color: 'red', border: 'none', background: 'none', marginLeft: '10px', cursor: 'pointer' }}>X</button></span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px' }}>
                  <span>Taxable: ₹{taxableAmount} | CGST: ₹{cgst} | SGST: ₹{sgst}</span>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Total: ₹{grandTotal}</span>
                </div>
              </div>
            )}
          </div>

          <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            📄 Post Multi-Item Sale & Print PDF
          </button>
        </form>
      </div>
    </div>
  );
}

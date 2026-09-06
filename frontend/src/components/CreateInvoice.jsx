import React, { useState, useEffect } from 'react';
import { StorageService } from '../utils/storageSync';
import { useItemMaster } from '../hooks/useItemMaster';
import SearchableAccountDropdown from './SearchableAccountDropdown.jsx';
import { getFirmMasterAccounts } from '../utils/accountMasterEngine.js';

export default function CreateInvoice({ firm, onClose }) {
  const activeFirmId = firm?.id || 'FIRM-001';
  
  let allItems = [];
  try {
    allItems = useItemMaster() || [];
  } catch (e) {
    allItems = [];
  }

  const [accountsList, setAccountsList] = useState([]);
  const [invoiceList, setInvoiceList] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Math.floor(Date.now() / 1000)}`);
  const [customerParty, setCustomerParty] = useState(''); 
  const [vehicleNo, setVehicleNo] = useState('');
  
  const [cart, setCart] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [gstRate, setGstRate] = useState('5'); // Default 5% GST Slab for Bricks/Goods

  const [searchFilter, setSearchFilter] = useState('');
  const [feedback, setFeedback] = useState(null);

  const loadData = () => {
    try {
      const accList = getFirmMasterAccounts(activeFirmId) || [];
      setAccountsList(accList);

      const allVouchers = StorageService.getItem('account_book_vouchers') || [];
      const salesInvoices = allVouchers.filter(v => v && v.firm_id === activeFirmId && (v.voucher_type === 'SALES' || v.type === 'SALES'));
      setInvoiceList(salesInvoices);
    } catch (err) {
      console.error("Error loading invoice data:", err);
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

  const handleAddToCart = () => {
    if (!selectedItemId || !quantity || !rate) return alert('कृपया आइटम, मात्रा और रेट दर्ज करें।');
    const itemObj = allItems.find(i => String(i.id) === String(selectedItemId));
    if (!itemObj) return alert('चयनित आइटम नहीं मिला।');

    const qty = Number(quantity);
    const rt = Number(rate);
    const baseAmount = qty * rt;
    const gRate = Number(gstRate);
    
    const taxAmount = baseAmount * (gRate / 100);
    const totalWithTax = baseAmount + taxAmount;

    setCart([...cart, {
      id: Date.now(),
      itemId: selectedItemId,
      itemName: itemObj.item_name || itemObj.name || 'Item',
      unit: itemObj.unit || 'Pcs',
      qty,
      rate: rt,
      gstRate: gRate,
      taxableAmount: baseAmount,
      cgst: taxAmount / 2,
      sgst: taxAmount / 2,
      total: totalWithTax,
      isService: itemObj.item_type === 'SERVICE' || String(itemObj.item_name || '').toLowerCase().includes('freight')
    }]);

    setSelectedItemId(''); setQuantity(''); setRate('');
  };

  const removeCartItem = (id) => setCart(cart.filter(c => c.id !== id));

  // Totals Calculation across cart items
  const totalTaxable = cart.reduce((sum, i) => sum + (i.taxableAmount || 0), 0);
  const totalCgst = cart.reduce((sum, i) => sum + (i.cgst || 0), 0);
  const totalSgst = cart.reduce((sum, i) => sum + (i.sgst || 0), 0);
  const grandTotal = totalTaxable + totalCgst + totalSgst;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFeedback(null);
    if (!customerParty) return alert('कृपया कस्टमर पार्टी चुनें!');
    if (cart.length === 0) return alert('कम से कम एक आइटम बिल में जोड़ें।');

    try {
      const currentInventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
      const vouchers = StorageService.getItem('account_book_vouchers') || [];

      let workingInventory = [...currentInventory];
      if (editingId) {
        const oldInv = vouchers.find(v => v && v.id === editingId);
        if (oldInv && oldInv.items) {
          workingInventory = workingInventory.map(invItem => {
            const matched = oldInv.items.find(c => c && String(c.itemId) === String(invItem.id));
            if (matched && !matched.isService) {
              return { ...invItem, current_stock: Number(invItem.current_stock || 0) + Number(matched.qty || 0) };
            }
            return invItem;
          });
        }
      }

      const updatedInventory = workingInventory.map(invItem => {
        const cartItem = cart.find(c => c && String(c.itemId) === String(invItem.id));
        if (cartItem && !cartItem.isService) {
          return { ...invItem, current_stock: Number(invItem.current_stock || 0) - Number(cartItem.qty || 0) };
        }
        return invItem;
      });
      StorageService.setItem('inventory_items', updatedInventory);

      const newVoucher = {
        id: editingId || `INV-${Date.now()}`,
        firm_id: activeFirmId,
        voucher_date: invoiceDate,
        voucher_type: 'SALES',
        dr_account: customerParty,
        cr_account: 'Sales & Revenue',
        amount: grandTotal,
        reference_no: invoiceNo,
        narration: `Sales Invoice ${invoiceNo} to ${customerParty} - Vehicle: ${vehicleNo}`,
        vehicle_no: vehicleNo,
        items: cart,
        total_taxable: totalTaxable,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        created_at: new Date().toISOString()
      };

      let updatedVouchers;
      if (editingId) {
        updatedVouchers = vouchers.map(v => v && v.id === editingId ? newVoucher : v);
        setFeedback({ type: 'success', message: '✓ Invoice Updated Successfully!' });
      } else {
        updatedVouchers = [newVoucher, ...vouchers];
        setFeedback({ type: 'success', message: '✓ Invoice Generated & Saved to Register!' });
      }

      StorageService.setItem('account_book_vouchers', updatedVouchers);
      window.dispatchEvent(new Event('app_storage_updated'));
      loadData();

      setEditingId(null);
      setCart([]);
      setCustomerParty('');
      setVehicleNo('');
      setInvoiceNo(`INV-${Math.floor(Date.now() / 1000)}`);

    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (inv) => {
    if (!inv) return;
    setEditingId(inv.id);
    setInvoiceDate(inv.voucher_date || new Date().toISOString().split('T')[0]);
    setInvoiceNo(inv.reference_no || '');
    setCustomerParty(inv.dr_account || '');
    setVehicleNo(inv.vehicle_no || '');
    setCart(inv.items || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (invId, invNo) => {
    if (!window.confirm(`Invoice #${invNo} को डिलीट करने से इसका स्टॉक वापस जुड़ जाएगा। जारी रखें?`)) return;

    try {
      const vouchers = StorageService.getItem('account_book_vouchers') || [];
      const targetInv = vouchers.find(v => v && v.id === invId);

      if (targetInv && targetInv.items) {
        const currentInventory = StorageService.getItem('inventory_items') || StorageService.getInventoryItems() || [];
        const restoredInventory = currentInventory.map(invItem => {
          const matchedCartItem = targetInv.items.find(c => c && String(c.itemId) === String(invItem.id));
          if (matchedCartItem && !matchedCartItem.isService) {
            return { ...invItem, current_stock: Number(invItem.current_stock || 0) + Number(matchedCartItem.qty || 0) };
          }
          return invItem;
        });
        StorageService.setItem('inventory_items', restoredInventory);
      }

      const filteredVouchers = vouchers.filter(v => v && v.id !== invId);
      StorageService.setItem('account_book_vouchers', filteredVouchers);
      window.dispatchEvent(new Event('app_storage_updated'));
      loadData();
      if (editingId === invId) {
        setEditingId(null); setCart([]); setCustomerParty(''); setVehicleNo('');
      }
      alert('✓ Invoice deleted & stock restored.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = (inv) => {
    if (!inv) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Popup blocked! Please allow popups for printing.');

    printWindow.document.write(`
      <html>
        <head><title>Invoice #${inv.reference_no || ''}</title></head>
        <body style="font-family:sans-serif; padding:20px;">
          <h2 style="text-align:center;">${firm?.name || 'Neelkanth Udyog'}</h2>
          <p style="text-align:center; font-size:12px; color:#666;">TAX INVOICE (GST Compliant)</p>
          <hr/>
          <p><strong>Invoice No:</strong> ${inv.reference_no || ''} | <strong>Date:</strong> ${inv.voucher_date || ''}</p>
          <p><strong>Customer:</strong> ${inv.dr_account || ''}</p>
          <table border="1" cellspacing="0" cellpadding="8" style="width:100%; margin-top:15px; border-collapse:collapse;">
            <tr style="background:#f1f5f9;"><th>Item</th><th>Qty</th><th>Rate</th><th>GST Slab</th><th>Total</th></tr>
            ${(inv.items || []).map(i => `<tr><td>${i.itemName || ''}</td><td>${i.qty || 0} ${i.unit || ''}</td><td>${i.rate || 0}</td><td>${i.gstRate || 0}%</td><td>${(i.total || 0).toFixed(2)}</td></tr>`).join('')}
          </table>
          <p style="text-align:right; margin-top:15px;">
            Taxable: ₹${Number(inv.total_taxable || 0).toFixed(2)}<br/>
            CGST: ₹${Number(inv.total_cgst || 0).toFixed(2)} | SGST: ₹${Number(inv.total_sgst || 0).toFixed(2)}<br/>
            <strong>Grand Total: ₹${Number(inv.amount || 0).toFixed(2)}</strong>
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredInvoices = invoiceList.filter(v => {
    if (!v) return false;
    const q = (searchFilter || '').toLowerCase();
    return (
      (v.reference_no && v.reference_no.toLowerCase().includes(q)) ||
      (v.dr_account && v.dr_account.toLowerCase().includes(q)) ||
      (v.narration && v.narration.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '16px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
            {editingId ? '✏️ Edit GST Sales Invoice' : '📄 Multi-Item GST Invoicing'}
          </h2>
          {onClose && <button onClick={onClose} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Close</button>}
        </div>
        
        {feedback && <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '10px', backgroundColor: '#f0fdf4', color: '#166534', fontWeight: '700', fontSize: '13px', border: '1px solid #bbf7d0' }}>{feedback.message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Invoice Date *</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Invoice No *</label>
              <input type="text" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} required />
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

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Vehicle / Tractor No (Optional)</label>
            <input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="e.g. RJ-31-GA-1234" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} />
          </div>

          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Select Stock Item</label>
                <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #eab308', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '13px', outline: 'none' }}>
                  <option value="">-- Choose Stock Item --</option>
                  {allItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_name || item.name} [Stock: {item.current_stock || item.stock || 0} {item.unit}]</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Qty</label>
                  <input type="number" step="0.01" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} placeholder="0" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>Rate (₹)</label>
                  <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '13px', outline: 'none' }} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', display: 'block' }}>GST Slab</label>
                  <select value={gstRate} onChange={e => setGstRate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', backgroundColor: '#fff', fontSize: '13px', outline: 'none' }}>
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (Bricks/Coal)</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <button type="button" onClick={handleAddToCart} style={{ padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>
                + Add Item to Cart
              </button>
            </div>

            {cart.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                {cart.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #cbd5e1' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{c.itemName} ({c.gstRate}% GST)</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Qty: {c.qty} {c.unit} @ ₹{c.rate}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
                      ₹{(c.total || 0).toFixed(2)} 
                      <button type="button" onClick={() => removeCartItem(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', marginLeft: '12px', cursor: 'pointer', fontWeight: 'bold', padding: '4px' }}>X</button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '13px', backgroundColor: '#e2e8f0', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <div>Taxable: ₹{totalTaxable.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>CGST: ₹{totalCgst.toFixed(2)} | SGST: ₹{totalSgst.toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: '900', fontSize: '16px', color: '#047857' }}>₹{grandTotal.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: editingId ? '#0284c7' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)' }}>
              {editingId ? '✓ Update GST Invoice' : '📄 Post Multi-Item GST Sale'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setCart([]); setCustomerParty(''); setVehicleNo(''); }} style={{ padding: '14px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <strong style={{ fontSize: '14px', color: '#0f172a', fontWeight: '800' }}>
            📋 Sales Invoices Register ({filteredInvoices.length})
          </strong>
        </div>

        <input
          type="text"
          placeholder="🔍 Search invoices by invoice no, customer..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', marginBottom: '12px', outline: 'none' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
              No sales invoices recorded yet.
            </div>
          ) : (
            filteredInvoices.map(inv => {
              const amt = Number(inv.amount || 0);
              const isSelected = editingId === inv.id;
              return (
                <div key={inv.id} style={{ backgroundColor: isSelected ? '#f0f9ff' : '#f8fafc', border: `1px solid ${isSelected ? '#0284c7' : '#e2e8f0'}`, borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>{inv.voucher_date || ''}</span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{inv.reference_no || ''}</strong>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0284c7' }}>{inv.dr_account || ''}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Items: {(inv.items || []).length} lines</div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669', marginBottom: '8px' }}>₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button onClick={() => handlePrint(inv)} style={{ padding: '6px 10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>🖨️ Print</button>
                      <button onClick={() => handleEdit(inv)} style={{ padding: '6px 10px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>✏️ Edit</button>
                      <button onClick={() => handleDelete(inv.id, inv.reference_no)} style={{ padding: '6px 10px', backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>🗑️ Del</button>
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
